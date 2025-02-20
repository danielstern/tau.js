import {
    firstValueFrom,
    Subject
} from "rxjs";
import {
    accumulate_usage
} from "../compute-usage/index.js";
import {
    create_openai_realtime_ws
} from "../create-ws/index.js";
import {
    handle_response_creation,
    init_debug,
    log_message_handler_factory,
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
    debug_voice_in = true,
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

        ws.on("message", async (message) => {
            let data = parse_message(message)
            if (data.type === "response.created") {
                let response = await handle_response_creation({ws, model})
                response$.next(response)
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
        if (_closed) throw new Error("τ Closed.")
        if (!message) throw new Error("τ Content is required when creating a conversation item.")
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


        if (process.env.TAU_LOGGING > 1) console.info("τ Response arguments", response_arguments)
        send_ws(ws, {
            type: "response.create",
            response: response_arguments
        })

        let response_data = await firstValueFrom(response$)
        _accumulated_usage = accumulate_usage(response_data.usage, _accumulated_usage)
        return response_data
    }

    await init()

    return {
        user,
        system,
        assistant,
        response,
        close,
        update_session,
        create_audio,
        create,
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