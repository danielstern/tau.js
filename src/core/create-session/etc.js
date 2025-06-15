
import WebSocket from "ws";

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


export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}

export async function connect_to_tau_ws({
    ws_url,
    event$,
    name,
    session,
    append_input_audio_buffer,
    handle_ws_voice_in
}) {
    let tau_ws = new WebSocket(`${ws_url}/model`)
    tau_ws.on("error", () => {
        console.warn( `τ Tried to connect to the server, but none was found at the specified URL.`)
    })
    tau_ws.on("message", async (message) => {
        let data = parse_message(message)
        if (process.env.TAU_LOGGING > 0) console.info(`τ ${name} received message '${data.type}' from a client`)
        if (data.type === "connection.complete") {
            console.info("τ Connected to Tau Server.")
        }
        if (data.type === "user.audio.stream" && handle_ws_voice_in) {
            await append_input_audio_buffer(data.bytes)
        }
    })

    event$.subscribe(data => {
        send_ws(tau_ws, { ...data, session })
    })

    return tau_ws
}

export function send_ws(ws, data) {
    try {
        ws.send(JSON.stringify(data))
    } catch (e) {
        console.info("Encountered an error sending a message via websocket", e)
    }
}


export function log_message_handler_factory(name) {
    return function log_message_handler(message) {
        const data = parse_message(message)
        if (data.error) {
            let msg = `τ ${name} error: ${data.error.message}`
            return console.error(msg)
        }

        if (process.env.TAU_LOGGING > 1) {
            let clone = { ...data }
            if (clone.delta) clone.delta = clone.delta.slice(0, 8) + "..."
            return console.info(`τ`, name, clone)
        }
        if (process.env.TAU_LOGGING > 0) return console.info(`τ`, name, data.type)
    }
}