import {
    firstValueFrom,
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
    handle_response_creation,
    init_debug,
    log_message_handler_factory,
    message_promise,
    parse_message,
    // send_ws
} from "./etc.js";
import delay from "delay"

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
    debug = process.env.TAU_DEBUG ?? false,
    debug_voice_in = true,
    log = [],
    recovery = {
        replay_messages: true,
        max_regenerate_response_count: 32
    }
} = {}) {

    let ws = null
    let event$ = new Subject()
    let response$ = new Subject()
    let _session = null
    let _accumulated_usage = null
    let _closed = false
    let message_count = 0
    let debug_ws = null
    let created = Date.now()
    let ready = false

    function send_ws(ws, data) {
        log.push({ type: "outgoing", data })
        ws.send(JSON.stringify(data))
    }

    async function init({
        recovery_mode = false
    } = {}) {
        ws = create_openai_realtime_ws({
            api_key,
            model,
            name
        })
        await message_promise(ws, data => data.type === "session.created")

        if (recovery_mode) {
            console.info("τ Recovering websocket session [experimental!]")
            let recovery_start = Date.now()
            let outgoing_sent = 0
            let responses_regenerated = 0
            let outgoing_logged = log.filter(a => a.type === "outgoing")
            for (let { data } of outgoing_logged) {
                if (data.type === "session.update") {
                    ws.send(JSON.stringify(data))
                    outgoing_sent++
                    await message_promise(
                        ws,
                        data => data.type === "session.updated"
                    )
                }

                if (recovery?.replay_messages) {
                    if (data.type === "conversation.item.create") {
                        ws.send(JSON.stringify(data))
                        outgoing_sent++
                        await message_promise(
                            ws,
                            data => data.type === "conversation.item.created"
                        )
                    }

                    if (data.type === "response.create") {
                        if (responses_regenerated < recovery?.max_regenerate_response_count) {
                            responses_regenerated++
                            console.info("τ Recreating response...")
                            ws.send(JSON.stringify(data))
                            let response_data = await message_promise(ws, data => {
                                if (data.type === "response.done") return true
                                if (data.type === "response.cancelled") return true
                            })
                            let usage = compute_usage({data : response_data, model})
                            _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
                            console.info("τ Recreated response successfully.")
                        } else {
                            console.info("τ Maximum number of responses (", recovery?.max_regenerate_response_count, ") to regenerate already reached. Skipping response regeneration.")
                        }

                    }
                }
            }
            console.info("τ Recovered websocket", name, "in", Date.now() - recovery_start, "ms. Recreated", outgoing_sent, "outgoing messages and regenerated", responses_regenerated, "responses.")
            
        }


        ws.on("message", log_message_handler_factory(name))
        ws.on("message", (message) => {
            let data = parse_message(message)
            log.push({ type: "incoming", data })
        })
        ws.on("message", (message) => {
            let data = parse_message(message)
            event$.next(data)
        })

        ws.on("message", async (message) => {
            let data = parse_message(message)
            if (data.type === "response.created") {
                let response = await handle_response_creation({ ws, model })
                response$.next(response)
            }
        })

        ws.on("close", () => {
            console.info("τ Websocket closed unexpectedly.")
            ws = null
            ready = false
            if (recovery) {
                console.info("τ Attempting to recover websocket session.")
                init({ recovery_mode: true })
            } else {
                throw new Error("τ Websocket session recovery disabled.")
            }
        })

        if (!recovery_mode) {
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
                create_audio_stream: append_input_audio_buffer,
                response,
                debug_voice_in
            })

        }

        ready = true
        return ws
    }

    function close() {
        if (debug_ws) {
            debug_ws.removeAllListeners()
            debug_ws.close()
        }
        ws.removeAllListeners()
        ws.close()
        ws = null
        ready = false
    }

    const ready_promise = () => {
        let start_time = Date.now()
        let max_duration = 30000
        return new Promise(async (resolve)=>{
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
        conversation = undefined,
        metadata = undefined,
        input = undefined,
    } = {}) {

        await ready_promise()

        let response_arguments = {
            instructions,
            tools,
            tool_choice,
            temperature,
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
        get created() { return created},
        get ready() { return ready },
        get name() { return name },
        get session() { return _session },
        get usage() { return _accumulated_usage },
        get log() { return log },
        get _ws() { return ws },
    }
}