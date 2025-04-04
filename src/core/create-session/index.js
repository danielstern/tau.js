import delay from "delay";
import {
    Subject
} from "rxjs";
import { v4 } from "uuid";
import {
    create_openai_realtime_ws
} from "../create-ws/index.js";
import {
    connect_to_tau_ws,
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
    time_to_live = 1000 * 60 * 25
} = {}) {

    let openai_ws = null
    let tau_ws = null
    let event$ = new Subject()
    let error$ = new Subject()
    let openai_session = null
    let created = Date.now()
    let active_task_count = 0
    let status = "initializing"

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
            event$.next(data)
        })

        openai_ws.on("error", async (e) => {
            status = "error"
            error$.next(e)
        })

        openai_ws.on("close", () => {
            console.info("τ Websocket closed unexpectedly.")
            status = "error"
            error$.next({ type: "closed_unexpectedly" })
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
            session: openai_session,
            append_input_audio_buffer,
            response,
            handle_ws_voice_in
        })

        status = "available"
        return openai_ws
    }

    function close() {

        status = "closed"
        if (tau_ws) {
            tau_ws.removeAllListeners()
            tau_ws.close()
            tau_ws = null
        }
        if (openai_ws) {
            openai_ws.removeAllListeners()
            openai_ws.close()
            openai_ws = null
        }

    }


    async function update_session(updates) {
        send_ws(openai_ws, { type: "session.update", session: updates });
        let { session } = await message_promise(openai_ws, data => data.type === "session.updated")
        openai_session = session
    }

    async function create({ message, role }) {
        if (!message) throw new Error("τ Content is required when creating a conversation item.")
        let type = role === "user" || role === "system" ? "input_text" : "text"
        let id = v4().slice(0,32)
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
        let id = v4().slice(0,32)

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


    async function delete_conversation_item(item_id) {
        send_ws(openai_ws, { type: "conversation.item.delete", item_id })
        await message_promise(openai_ws, data => data.type === "conversation.item.deleted")
    }

    function response(response_arguments) {

        let event$ = new Subject()
        let audio_deltas = []
        let text_deltas = []
        let total_audio_duration = 0
        let is_cancelled = false
        let is_done = false
        let tau_event_id = v4().slice(0,32)
        let conversation_item_id = null
        // let tau_event_id = `tau-response-${Date.now()}-${v4()}`

        send_ws(openai_ws, {
            type: "response.create",
            response: {
                ...response_arguments,
                metadata : {
                    tau_event_id

                }
            },
        })

        let response_id = null
        let last_response = null

        async function observe_response(message) {
            let data = parse_message(message)
            // console.info("response_id", response_id)
            // console.info("observe response", data.type, data)

            if (data.type === "response.created" && data.response?.metadata?.tau_event_id === tau_event_id) {
                    response_id = data.response.id
            }

            if (data.type === "response.output_item.done" && data.response_id === response_id) {
                // console.info("CREATED", data)
                conversation_item_id = data.item.id
                console.info({conversation_item_id})
            }

            if (data.type === "response.text.delta" && data.response_id === response_id) {
                event$.next({ type : "response.text.delta", delta : data.delta })
                text_deltas.push(data.delta)
            }

            if (data.type === "response.audio_transcript.delta" && data.response_id === response_id) {
                event$.next({ type : "response.audio_transcript.delta", delta : data.delta })
                text_deltas.push(data.delta)
            }

            if (data.type === "response.audio.delta" && data.response_id === response_id) {
                let duration_ms = data.delta.length / 64
                event$.next({ 
                    type : "response.audio.delta", 
                    duration_ms,
                    get delta() { return data.delta }
                })
                audio_deltas.push(data.delta)
                total_audio_duration += duration_ms
            }

            if (data.type === "response.cancelled" && data.response.id === response_id) {
                is_cancelled = true
                event$.next({ type : "response.cancelled", status : data.response.status  })
                openai_ws.off("message", observe_response)
            }

            if (data.type === "response.done" && data.response.id === response_id) {
                is_done = true
                last_response = data.response
                event$.next({ 
                    type : "response.done", 
                    status : data.response.status, 
                    response : data.response
                })
                openai_ws.off("message", observe_response)
            }
        }

        async function promise() {
            let start_time = Date.now()
            let max_duration = 12000
            while (true) {
                let is_timed_out = Date.now() > start_time + max_duration
                if (is_timed_out) return { status : "timed_out" }
                if (is_cancelled || !openai_ws) return { status : "cancelled" }
                if (is_done) {
                    return {
                        status : "completed",
                        response_id,
                        conversation_item_id,
                        response : last_response,
                        total_audio_duration,
                        transcript : text_deltas.join(""),
                        get audio_deltas() { return audio_deltas },
                        get pcm() { return audio_deltas.join("")}
                    }
                }
                await delay(40)
            }
        }

        async function cancel() {
            send_ws(openai_ws, { type: "response.cancel" , response_id })
        }

        openai_ws.on("message", observe_response)
        return {
            tau_event_id,
            promise,
            cancel,
            event$
        }
    }

    async function status_loop() {
        while (true) {
            if (created + time_to_live < Date.now()) {
                status = "expired"
                close()
            }
            if (status !== "available") {
                return
            }
            await delay(100)
        }
    }

    await init()
    status_loop()

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
        delete_conversation_item,
        error$,
        event$,
        get created() { return created },
        get status() { return status },
        get name() { return name },
        get session() { return openai_session },
        get active_task_count() { return active_task_count },
        get __ws() { return openai_ws },
    }
}