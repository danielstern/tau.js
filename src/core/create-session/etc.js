
import WebSocket from "ws";
import { compute_usage } from "../compute-usage/index.js";

export function message_handler(ws, condition, callback) {
    let listener = (message) => {
        let data = parse_message(message)
        if (condition(data)) {
            callback(data)
        }
    }
    ws.on("message", listener)
    return () => ws.off("message", listener)
}

export function message_promise(ws, condition = () => true) {
    let promise_handler = (resolve, _reject) => {
        let listener = (message) => {
            let data = parse_message(message)
            if (condition(data)) {
                ws.off("message", listener)
                resolve(data)
            }
        }
        ws.on("message", listener)
    }
    return new Promise(promise_handler)
}

function extract_response_data(response) {

    let all_output = response.output
    let function_call = null
    let transcript = null
    if (!all_output) {
        console.warn("τ A response was returned with no output value.")
    } else {

        for (let output of all_output) {

            if (output.type === "message") {
                let content = output.content[0]
                if (!content) {
                    if (process.env.TAU_LOGGING > 0) console.warn("τ A response was returned with no content.")
                    console.warn(JSON.stringify(response, null, 2))
                } else {
                    let message = content.text || content.transcript
                    transcript = message
                }
            }
            if (output.type === "function_call") {
                let name = output.name
                let parameters = null
                try {
                    parameters = JSON.parse(output.arguments)
                } catch (e) {
                    console.error("τ Encountered an error parsing function arguments for function", name, output.arguments)
                }
                function_call = { name, parameters }
            }
        }

    }

    return {
        function_call,
        transcript
    }
}

export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}

export async function init_debug({
    event$,
    name,
    session,
    create_audio,
    create_audio_stream,
    debug_voice_in
}) {
    let debug_server_url = process.env.TAU_DEBUG_SERVER_URL ?? `ws://localhost:30020`
    let debug_ws = new WebSocket(`${debug_server_url}/provider`)
    debug_ws.on("error", () => {
        console.warn(
            `Tried to connect to the debug server, but none was found at the specified URL.
- If you don't want to run the debug server, make sure that \`debug\` is false when creating a new session
- If you do want to connect to the debug server, make sure it is running. To run the debug server
use \`tau debug start\`:
npm install -g tau
tau debug start`
        )
    })
    debug_ws.on("message", async (message) => {
        
        let data = parse_message(message)
        if (data.type === "connection.complete") {
            console.info("τ Connected to Debug Server.")
        }
        if (!debug_voice_in) return
        if (data.type === "user.audio.input") {
            await create_audio(data.bytes)
        }
        if (data.type === "user.audio.stream") {
            await create_audio_stream(data.bytes)
        }
    })

    event$.subscribe(data => {
        send_ws(debug_ws, { session_id: name, ...data, session })
    })

    return debug_ws
}

export function send_ws(ws, data) {
    ws.send(JSON.stringify(data))
}

export function log_message_handler_factory(name) {
    return function log_message_handler(message) {
        const data = parse_message(message)
        if (data.error) {
            let msg = `τ ${name} error: ${data.error.message}`
            throw new Error(msg)
            // return console.error()
        }

        if (process.env.TAU_LOGGING > 1) {
            let clone = { ...data }
            if (clone.delta) clone.delta = clone.delta.slice(0, 8) + "..."
            return console.info(`τ`, name, clone)
        }
        if (process.env.TAU_LOGGING > 0) return console.info(`τ`, name, data.type)
    }
}

export async function handle_response_creation({
    ws,
    model
}) {

    let audio_deltas = []
    let total_duration = 0
    let start_time = Date.now()
    let first_audio_delta_compute_time = null
    let first_text_delta_compute_time = null
    let first_audio_delta_timestamp = null

    async function delta_listener_process() {
        let off_audio_handler = message_handler(
            ws,
            data => data.type === "response.audio.delta",
            data => {
                if (audio_deltas.length === 0) {
                    first_audio_delta_timestamp = Date.now()
                    first_audio_delta_compute_time = Date.now() - start_time
                }
                audio_deltas.push(data.delta)
                let duration_ms = data.delta.length / 64
                total_duration += duration_ms
            }
        )

        let off_text_handler = message_handler(
            ws,
            data => (
                data.type === "response.text.delta"
            ),
            _data => {
                if (!first_text_delta_compute_time) {
                    first_text_delta_compute_time = Date.now() - start_time
                }
            }
        )
        await message_promise(ws, data => data.type === "response.done")
        off_audio_handler()
        off_text_handler()

    }

    delta_listener_process()

    let data = await message_promise(ws, data => {
        if (data.type === "response.done") return true
        if (data.type === "response.cancelled") return true
    })
    
    let compute_time = Date.now() - start_time
    if (data.type === "response.cancelled" || data.response?.status == "cancelled") {
        console.warn("τ A response was cancelled")
        return null
        // return {
        //     compute_time,
        //     cancelled : true
        // }
    }

    if (data.response.status === "failed") {
        if (process.env.TAU_LOGGING > 0) console.info(data.response)
        console.warn("τ A response.create request failed after", compute_time, "ms")
        return null
        // return {
        //     compute_time,
        //     failed : true
        // }
    }

    let response_data = extract_response_data(data.response)
    let usage = compute_usage({data, model})
    let payload = {
        compute_time,
        get audio_deltas(){ return audio_deltas },
        usage,
        first_audio_delta_compute_time,
        first_text_delta_compute_time,
        first_audio_delta_timestamp,
        total_audio_duration: total_duration,
        ... response_data
    }

    return payload

}