import delay from "delay";
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
    connect_to_tau_ws,
    handle_response_creation,
    log_message_handler_factory,
    message_promise,
    parse_message,
} from "./etc.js";

let session_count = 0

export async function create_session({
    modalities = ["text", "audio"],
    instructions = undefined,
    temperature = undefined,
    max_response_output_tokens = process.env.TAU_MAX_RESPONSE_OUTPUT_TOKENS ?? 768,
    tools = undefined,
    turn_detection = undefined,
    tool_choice = "none",
    voice = "sage",
} = {}, {
    api_key = null,
    model = "4o",
    name = `tau-session-${++session_count}-${Date.now()}`,
    ws_url = process.env.TAU_WS_URL ?? `ws://localhost:30033`,
    handle_ws_voice_in = true,
    log = []
} = {}) {

    let openai_ws = null
    let tau_ws = null
    let event$ = new Subject()
    let response$ = new Subject()
    let response_create$ = new Subject()
    let response_cancelled$ = new Subject()
    let error$ = new Subject()
    let _session = null
    let _accumulated_usage = null
    let _closed = false
    let message_count = 0
    let created = Date.now()
    let ready = false
    let active_task_count = 0

    function send_ws(ws, data) {
        try {
            log.push({ type: "outgoing", data })
            ws.send(JSON.stringify(data))
        } catch (e) {
            console.info("Encountered an error sending a message via websocket", e)
        }
    }

    async function init() {

        openai_ws = create_openai_realtime_ws({
            api_key,
            model,
            name
        })
        await message_promise(openai_ws, data => data.type === "session.created")

        openai_ws.on("message", log_message_handler_factory(name))
        openai_ws.on("message", (message) => {
            let data = parse_message(message)
            log.push({ type: "incoming", data })
        })
        openai_ws.on("message", (message) => {
            let data = parse_message(message)
            event$.next(data)
        })

        openai_ws.on("message", async (message) => {
            let data = parse_message(message)
            if (data.type === "response.created") {
                active_task_count++
                
                response_create$.next()
                let response = await handle_response_creation({ ws: openai_ws, model })
                if (response) {
                    response$.next(response)
                }
                else {
                    response_cancelled$.next({})
                } 
                active_task_count--
            }
        })

        openai_ws.on("error", async (e) => {
            error$.next(e)
            websocket_error = e
        })

        openai_ws.on("close", () => {
            console.info("τ Websocket closed unexpectedly.")
            openai_ws = null
            // ready = false
            error$.next({ type: "closed" })
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

        if (ws_url) tau_ws = await connect_to_tau_ws({
            ws_url,
            event$,
            name,
            session: _session,
            append_input_audio_buffer,
            response,
            handle_ws_voice_in
        })


        ready = true
        return openai_ws
    }

    function close() {
        
        if (tau_ws) {
            tau_ws.removeAllListeners()
            tau_ws.close()
        }
        if (openai_ws) {
            openai_ws.removeAllListeners()
            openai_ws.close()
        }
        
        openai_ws = null
        // ready = false
    }

    const ready_promise = () => {
        let start_time = Date.now()
        let max_duration = 30000
        return new Promise(async (resolve) => {
            while (true) {
                if (ready) {
                    resolve()
                    return
                }
                if (Date.now() - start_time > max_duration) {
                    throw new Error("Ready promise failed to resolve after", max_duration, "ms.")
                }
                await delay(10)
            }

        })
    }

    async function update_session(updates) {
        send_ws(openai_ws, { type: "session.update", session: updates });
        let { session } = await message_promise(openai_ws, data => data.type === "session.updated")
        _session = session
        if (process.env.TAU_LOGGING > 0) console.info("τ Updated session", _session)
    }

    async function create({ message, role }) {
        if (_closed) throw new Error("τ Closed.")
        if (!message) throw new Error("τ Content is required when creating a conversation item.")
        let type = role === "user" || role === "system" ? "input_text" : "text"
        let id = `tau-message-${++message_count}-${Date.now()}`
        send_ws(openai_ws, {
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
            openai_ws,
            data => data.type === "conversation.item.created" && data.item.id === id
        )
        return data.item
    }

    async function create_audio(bytes) {
        if (!bytes) return console.warn("τ No audio input detected.")
        let type = "input_audio"
        let id = `tau-audio-${++message_count}-${Date.now()}`

        send_ws(openai_ws, {
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
            openai_ws,
            data => data.type === "conversation.item.created" && data.item.id === id
        )

        return data.item
    }

    async function append_input_audio_buffer(bytes) {
        if (!bytes) return console.warn("τ No audio input detected.")
        send_ws(openai_ws, {
            type: "input_audio_buffer.append",
            audio: bytes
        })
    }

    async function commit_input_audio_buffer() {
        send_ws(openai_ws, {
            type: "input_audio_buffer.commit",
        })

        await message_promise(
            openai_ws,
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
        is_cancelling = true
        send_ws(openai_ws, { type: "response.cancel" })
        let done = await message_promise(openai_ws, data => data.type === "response.done")
        is_cancelling = false
        return done
    }

    async function delete_conversation_item(item_id) {
        send_ws(openai_ws, { type: "conversation.item.delete", item_id })
        await message_promise(openai_ws, data => data.type === "conversation.item.deleted")
    }

    async function response({
        instructions = undefined,
        tools = undefined,
        tool_choice = undefined,
        temperature = undefined,
        conversation = undefined,
        metadata = undefined,
        input = undefined,
        modalities = undefined
    } = {}) {

        await ready_promise()

        let response_arguments = {
            instructions,
            tools,
            tool_choice,
            temperature,
            conversation,
            metadata,
            modalities,
            input
        }
        if (_closed) throw new Error("Closed.")

        if (process.env.TAU_LOGGING > 1) console.info("τ Response arguments", response_arguments)
        send_ws(openai_ws, {
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
        error$,
        event$,
        response$,
        response_create$,
        response_cancelled$,
        get created() { return created },
        get ready() { return ready },
        get name() { return name },
        get session() { return _session },
        get usage() { return _accumulated_usage },
        get log() { return log },
        get _ws() { return openai_ws },
        get active_task_count() { return active_task_count }
    }
}