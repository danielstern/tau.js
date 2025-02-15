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

export async function create_session({
    modalities = ["text", "audio"],
    instructions = undefined,
    temperature = undefined,
    max_response_output_tokens = undefined,
    tools = undefined,
    turn_detection = undefined,
    tool_choice = "none",
    voice = "sage",
} = {}, {
    api_key = null,
    model = "4o",
    name = `tau-session-${++session_count}-${Date.now()}`,
    debug = process.env.TAU_DEBUG ?? false,
    debug_voice_in = true
} = {}) {

    let ws = null
    let event$ = new Subject()
    let response$ = new Subject()
    let _session = null
    let _accumulated_usage = null
    let _closed = false
    let message_count = 0
    let debug_ws = null

    async function init() {
        ws = create_openai_realtime_ws({
            api_key,
            model,
            name
        })

        await message_promise(ws, data => data.type === "session.created")

        ws.on("message", log_message_handler_factory(name))
        ws.on("message", (message) => {
            let data = parse_message(message)
            event$.next(data)
        })

        ws.on("message", (message) => {
            let data = parse_message(message)
            if (data.type === "response.done") {
                let usage = compute_usage({ data, model })
                let fn_data = convert_response_to_fn(data.response)
                _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
                response$.next({
                    ... fn_data, 
                    usage
                })

            }

        })

        await update_session({
            instructions,
            modalities,
            max_response_output_tokens,
            turn_detection,
            tools,
            temperature,
            tool_choice,
            voice,
        })

        if (debug) debug_ws = await init_debug({
            event$,
            name,
            session: _session,
            create_audio,
            create_audio_stream : append_input_audio_buffer,
            response,
            debug_voice_in
        })

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
        if (process.env.TAU_LOGGING > 0) console.info("τ Updated session", _session)
    }

    async function create({ message, role }) {
        if (_closed) throw new Error("Closed.")
        if (!message) throw new Error("Content is required when creating a conversation item.")
        let type = role === "user" || role === "system" ? "input_text" : "text"
        let id = `tau-message-${++message_count}-${Date.now()}`
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

    async function create_audio(bytes) {
        if (!bytes) return console.warn("τ No audio input detected.")
        let type = "input_audio"
        let id = `tau-audio-${++message_count}-${Date.now()}`

        send_ws(ws, {
            type: "conversation.item.create",
            item: {
                id,
                type: "message",
                role: "user",
                content: [
                    {
                        type,
                        audio: bytes
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

    async function append_input_audio_buffer(bytes) {
        if (!bytes) return console.warn("τ No audio input detected.")
        send_ws(ws, {
            type: "input_audio_buffer.append",
            audio: bytes
        })
    }

    async function commit_input_audio_buffer() {
        send_ws(ws, {
            type: "input_audio_buffer.commit",
        })

        await message_promise(
            ws,
            data => data.type === "input_audio_buffer.committed"
        )
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

    async function response({
        instructions = undefined,
        tools = undefined,
        tool_choice = undefined,
        temperature = undefined,
        max_response_output_tokens = undefined,
        conversation = undefined,
        metadata = undefined,
        input = undefined,
    } = {}, {
        prev_compute_time = 0,
        tries = 1,
        max_time_to_respond = 60000,
        max_tries = 3
    } = {}) {

        let response_arguments = {
            instructions,
            tools,
            tool_choice,
            temperature,
            max_response_output_tokens,
            conversation,
            metadata,
            input

        }
        if (_closed) throw new Error("Closed.")

        if (tries > max_tries) {
            console.warn(`τ Failed to get a response after ${tries} tries.`)
            return null
        }

        let deltas = []
        let total_duration = 0
        let start_time = Date.now()
        let response_has_completed = false

        if (process.env.TAU_LOGGING > 1) console.info("τ Response arguments", response_arguments)
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
            console.error("τ A response request timed out.")
            return null
        }

        if (data.type === "response.cancelled") {
            return null
        }

        let compute_time = Date.now() - start_time
        let total_compute_time = compute_time + prev_compute_time

        if (data.response.status === "failed") {
            if (process.env.TAU_LOGGING > 0) console.info(data.response)
            console.warn("τ response.create request failed after", compute_time, "ms")
            return await response(response_arguments, {
                tries: tries + 1,
                prev_compute_time: total_compute_time,
                max_time_to_respond,
                max_tries
            })
        }

        let usage = compute_usage({ data, model })
        let fn_data = convert_response_to_fn(data.response)
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)

        let out_data = {
            ...fn_data,
            compute_time: total_compute_time,
            first_text_delta_compute_time,
            first_audio_delta_compute_time,
            attempts: tries,
            get audio_deltas() { return deltas },
            total_audio_duration: total_duration
        }
        return out_data
    }

    await init()

    return {
        user,
        system,
        assistant,
        response,
        close,
        create_audio,
        append_input_audio_buffer,
        commit_input_audio_buffer,
        cancel_response,
        delete_conversation_item,
        event$,
        response$,
        get name() { return name },
        get ws() { return ws },
        get session() { return _session },
        get usage() { return _accumulated_usage },
    }
}