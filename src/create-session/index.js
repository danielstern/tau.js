import delay from "delay"
import { Subject, firstValueFrom } from "rxjs"
import {
    log_message_handler,
    message_promise,
    parse_message
} from "../etc.js";
import { create_openai_realtime_ws } from "../create-ws/index.js";
import {
    accumulate_compute_time,
    accumulate_usage,
    compute_usage
} from "../compute-usage/index.js";
import { convert_response_to_fn } from "./etc.js";

let realtime = true
export async function create_session({
    api_key = null,
    audio = false,
    instructions = undefined,
    mini = true,
    temperature = 0.89,
    tools = [],
    tool_choice = "none",
    voice = "sage",
}) {

    let ws = create_openai_realtime_ws({
        api_key,
        mini
    })
    let event$ = new Subject()
    let _session = null
    let _conversation = []
    let _accumulated_usage = {
        computed: {
            total_usage_cost: 0
        },
        tokens: {}
    }
    let _compute_time = {
        total_responses: 0,
        total_response_time: 0,
        average_response_time: 0
    }

    let response$ = new Subject()
    let is_generating_response = false

    async function init() {

        await message_promise(ws, data => data.type === "session.created")
        await update_session({
            instructions,
            modalities: audio ? ["text", "audio"] : ["text"],
            tools,
            temperature,
            tool_choice,
            voice,
        })

        ws.on("message", log_message_handler)
        ws.on("message", event_message_handler)

        return ws
    }

    await init()

    function event_message_handler(message) {
        const data = parse_message(message)
        event$.next(data)
    }

    function close() {
        ws.off('message', log_message_handler)
        ws.off('message', event_message_handler)
        ws.close()
    }

    function send_ws(data) {
        ws.send(JSON.stringify(data))
    }

    async function update_session(updates) {
        send_ws({ type: "session.update", session: updates });
        let { session } = await message_promise(ws, data => data.type === "session.updated")
        _session = session
    }

    let create_queue = []
    let processing_create_queue = false

    async function create(data) {
        create_queue.push(data)
        if (!processing_create_queue) {
            processing_create_queue = true
            process_create_queue()
        }
        while (true) {
            if (!processing_create_queue) break
            await delay(10)
        }
        return true
        // while (processing_create_queue) {}
    }

    async function process_create_queue() {
        processing_create_queue = true
        let { message, role } = create_queue.pop()
        let start_time = Date.now()
        send_ws({
            type: "conversation.item.create",
            item: {
                type: "message",
                role,
                content: [
                    {
                        type: role === "user" || role === "system" ? "input_text" : "text",
                        text: message,
                    },
                ]
            }
        })
        let { item } = await message_promise(ws, data => data.type === "conversation.item.created")
        let compute_time = Date.now() - start_time
        _conversation.push({
            id: item.id,
            role: item.role,
            compute_time,
            type: "text",
            message: item.content[0].text,
        })

        if (is_generating_response) {
            console.info("Updated while generating response. Potential error")
        }
        if (create_queue.length > 0) {
            await process_create_queue()
        } else {
            processing_create_queue = false
        }
    }

    async function user(message) {
        await create({ message, role: "user" })
    }
    async function system(message) {
        await create({ message, role: "system" })
    }
    async function assistant(message) {
        await create({ message, role: "assistant" })
    }

    async function response(args) {
        if (!is_generating_response) generate_response(args)
        let data = await firstValueFrom(response$)
        return data
    }

    async function cancel_response() {
        if (!is_generating_response) return true
        send_ws({ type: "response.cancel" })
        await message_promise(ws, data => data.type === "response.cancelled")
        is_generating_response = false
        return true

    }

    async function generate_response(args = {}) {
        let {
            conversation = "auto",
            input = undefined,
            instructions = undefined,
            tools = undefined,
            tool_choice = undefined,
            output_audio_format = "pcm16"
        } = args
        if (is_generating_response) throw new Error("Already generating response")

        is_generating_response = true
        let start_time = Date.now()
        send_ws({
            type: "response.create",
            response: {
                conversation,
                output_audio_format,
                instructions,
                input,
                tools,
                tool_choice
            }
        })
        // let data = await message_promise(ws, data => data.type === "response.done" || data.type === "response.cancelled")
        let data = await message_promise(ws, data => {
            if (data.type === "response.done") return true
            if (data.type === "response.cancelled") return true
            // if (data.type === "conversation.item.created") {
            //     // console.info(JSON.stringify(data, null, 2))
            //     if (data.item.role === "system" || data.item.role === "user") {
            //         // console.info("System or user message adedd during response. regenerating")
            //         // await cancel_response()
            //         return true
            //     }
            // }
            // if (data.type === "conversation.item.created") return true
        })
        is_generating_response = false
        if (data.type === "response.cancelled") {
            console.info("Response cancelled")
            return
            // return null
        }
        if (data.type === "conversation.item.created") {
            console.info("System or user message added during response. regenerating")
            await cancel_response()
            console.info("Response cancelled")
            await response(args)

            // return null
        }
        let usage = compute_usage({ data, realtime, mini })
        let compute_time = Date.now() - start_time
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
        _compute_time = accumulate_compute_time(_compute_time, compute_time)
        let fn_data = convert_response_to_fn(data.response)
        _conversation.push({
            id: fn_data.id,
            role: "assistant",
            type: "message",
            compute_time,
            data: {
                fn_data
            }
        })
        response$.next({...fn_data, compute_time})
        // return fn_data
    }

    return {
        user,
        system,
        assistant,
        response,
        close,
        cancel_response,
        event$,
        get session() { return _session },
        get conversation() { return _conversation },
        get usage() { return _accumulated_usage },
        get compute_time() { return _compute_time },
    }

}