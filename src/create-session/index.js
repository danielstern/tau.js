import { Subject } from "rxjs";

import {
    accumulate_usage,
    compute_usage
} from "../compute-usage/index.js";
import { create_openai_realtime_ws } from "../create-ws/index.js";
import {
    convert_response_to_fn,
    log_message_handler,
    message_handler,
    message_promise,
    parse_message
} from "./etc.js";

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

    let previous_item_id = "root"
    let message_count = 0
    let job_count = 0
    let jobs = {}
    // let 

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

        message_handler(ws, data => data.type === "conversation.item.created", data => {
            if (data.item.content) {
                _conversation.push(data.item)
            }
        })

        message_handler(ws, data => data.type === "response.done", data => {
            _conversation.push(data.response.output[0])
        })

        return ws
    }

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

    async function create({ message, role }) {
        let type = role === "user" || role === "system" ? "input_text" : "text"
        let id = `tau-message-${++message_count}-${Date.now()}`
        send_ws({
            type: "conversation.item.create",
            previous_item_id,
            item: {
                id,
                type: "message",
                role,
                content: [
                    {
                        type,
                        text: message,
                    },
                ]
            }
        })

        previous_item_id = id
        await message_promise(ws, data => data.type === "conversation.item.created" && data.item.id === id)
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

    async function cancel_response() {
        send_ws({ type: "response.cancel" })
        return await message_promise(ws, data => data.type === "response.done")
    }

    async function response({
        conversation = "auto",
        input = undefined,
        instructions = undefined,
        tools = undefined,
        tool_choice = undefined,
        output_audio_format = "pcm16"
    } = {}) {
        let job_id = `job-${++job_count}`
        jobs[job_id] = true
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
        let data = await message_promise(ws, data => {
            if (data.type === "response.done") return true
            if (data.type === "response.cancelled") return true
        })
        delete jobs[job_id]
        if (data.type === "response.cancelled") {
            // throw new Error("Response cancelled") // ????
        }
      
        let usage = compute_usage({ data, realtime, mini })
        let compute_time = Date.now() - start_time
        let fn_data = convert_response_to_fn(data.response)
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
        return { ... fn_data, compute_time }
    }

    await init()

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
        get is_working() { return Object.keys(jobs).length > 0}
    }

}