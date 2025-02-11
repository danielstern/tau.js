import delay from "delay";
import {
    Subject
} from "rxjs";
import {
    accumulate_usage,
    compute_usage
} from "../compute-usage/index.js";
import {
    create_openai_realtime_ws
} from "../create-ws/index.js";
import {
    convert_response_to_fn,
    init_debug,
    log_message_handler_factory,
    message_handler,
    message_promise,
    parse_message,
    send_ws
} from "./etc.js";

let session_count = 0

/**
 * Creates a rad session, dude.
 * @param {*} param0 
 * @param {*} param1 
 * @returns 
 */
export async function create_session({
    modalities = ["text"],
    instructions = undefined,
    temperature = undefined, 
    max_response_output_tokens = undefined,
    tools = undefined,
    tool_choice = "none",
    voice = "sage",
} = {}, {
    api_key = null,
    // mini = false,
    model = "4o",
    name = `tau-session-${++session_count}-${Date.now()}`,
    debug = process.env.TAU_DEBUG_MODE ?? false
} = {}) {

    let ws = null
    let event$ = new Subject()
    let _session = null
    let _accumulated_usage = null
    let message_count = 0
    let _closed = false
    let debug_ws = null

    async function init() {
        ws = create_openai_realtime_ws({
            api_key,
            model,
            // mini,
            name
        })

        await message_promise(ws, data => data.type === "session.created")

        ws.on("message", log_message_handler_factory(name))
        ws.on("message", (message) => {
            let data = parse_message(message)
            event$.next(data)
        })

        await update_session({
            instructions,
            modalities,
            max_response_output_tokens,
            tools,
            temperature,
            tool_choice,
            voice,
        })

        if (debug) debug_ws = await init_debug(event$, name, _session)

        return ws
    }

    function close() {
        if (debug_ws) {
            debug_ws.removeAllListeners()
            debug_ws.close()
        }
        ws.removeAllListeners()
        ws.close()
    }

    async function update_session(updates) {
        send_ws(ws, { type: "session.update", session: updates });
        let { session } = await message_promise(ws, data => data.type === "session.updated")
        _session = session
        if (process.env.TAU_LOGGING > 0) console.info("Updated session", _session)
    }

    async function create({ message, role }) {
        if (_closed) throw new Error("Closed.")
        let type = role === "user" || role === "system" ? "input_text" : "text"
        let id = `tau-message-${++message_count}-${Date.now()}` // necessary to await completion
        send_ws(ws, {
            type: "conversation.item.create",
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

        let data = await message_promise(
            ws,
            data => data.type === "conversation.item.created" && data.item.id === id
        )
        return data.item
    }

    async function user(message) {
        return await create({ message, role: "user" })
    }
    async function system(message) {
        return await create({ message, role: "system" })
    }
    async function assistant(message) {
        return await create({ message, role: "assistant" })
    }

    async function cancel_response() {
        send_ws(ws, { type: "response.cancel" })
        return await message_promise(ws, data => data.type === "response.done")
    }

    async function delete_conversation_item(item_id) {
        send_ws(ws, { type: "conversation.item.delete", item_id })
        await message_promise(ws, data => data.type === "conversation.item.deleted")
    }

    async function response(response_arguments = {}, {
        prev_compute_time = 0,
        tries = 1,
        max_time_to_respond = 60000,
        max_tries = 3
    } = {}) {
    // async function response(args = {}, meta = {}) {
        if (_closed) throw new Error("Closed.")
        // let {
        //     conversation = undefined,
        //     input = undefined,
        //     instructions = undefined,
        //     tools = undefined,
        //     tool_choice = undefined,
        //     modalities = undefined,
        //     output_audio_format = undefined
        // } = args
        // let {
          
        // } = meta

        if (tries > max_tries) {
            console.warn(`Failed to get a response after ${tries} tries. Auto-cancelling response.`)
            return null
        }
        
        let deltas = []
        let total_duration = 0
        let start_time = Date.now()
        let response_has_completed = false
        // let response_arguments = {
        //     conversation,
        //     modalities,
        //     output_audio_format,
        //     instructions,
        //     input,
        //     tools,
        //     tool_choice
        // }
        if (process.env.TAU_LOGGING > 0) console.info("Response arguments", response_arguments)
        send_ws(ws, {
            type: "response.create",
            response: response_arguments
        })

        let timeout_promise = async function () {
            let time_remaining = max_time_to_respond
            while (time_remaining > 0) {
                await delay(100)
                time_remaining -= 100
                if (response_has_completed) {
                    return { error: false }
                }
            }
            return { error: true }
        }

        let first_audio_delta_compute_time = null
        let first_text_delta_compute_time = null

        async function co_first_delta_process() {
            let data = await message_promise(ws, data => data.type === "response.audio.delta" || data.type === "response.done" || data.type === "response.text.delta")
            if (data.type === "response.audio.delta") {
                first_audio_delta_compute_time = Date.now() - start_time + prev_compute_time
            }
            if (data.type === "response.text.delta") {
                first_text_delta_compute_time = Date.now() - start_time + prev_compute_time
            }
        }


        async function delta_collector_process() {
            let off = message_handler(ws, data => data.type === "response.audio.delta", (data) => {
                deltas.push(data.delta)
                let l = data.delta.length
                total_duration += l / 64000

            })
            await message_promise(ws, data => data.type === "response.done")
            off()

        }
        co_first_delta_process()
        delta_collector_process()
        let data_promise = message_promise(ws, data => {
            if (data.type === "response.done") return true
            if (data.type === "response.cancelled") return true
        })
        let data = await Promise.race([timeout_promise(), data_promise])
        response_has_completed = true

        if (data.error) {
            throw new Error("Request timed out")
        }

        if (data.type === "response.cancelled") {
            return null
        }

        let compute_time = Date.now() - start_time
        let total_compute_time = compute_time + prev_compute_time

        if (data.response.status === "failed") {
            console.warn(
                "response.create request failed after", compute_time, "ms", "Attempting to retry..."
            )
            return await response(args, {
                tries: tries + 1,
                prev_compute_time: total_compute_time
            })
        }

        let usage = compute_usage({ data, model })
        let fn_data = convert_response_to_fn(data.response)
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)

        return {
            ...fn_data,
            compute_time: total_compute_time,
            first_text_delta_compute_time,
            first_audio_delta_compute_time,
            attempts: tries,
            total_audio_duration: total_duration
        }
    }

    await init()

    return {
        user,
        system,
        assistant,
        response,
        close,
        cancel_response,
        delete_conversation_item,
        event$,
        get name() { return name },
        get session() { return _session },
        // get conversations() { return _conversations },
        get usage() { return _accumulated_usage },
    }
}