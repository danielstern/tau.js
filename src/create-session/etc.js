export async function message_handler(ws, condition, callback) {
    let listener = (message) => {
        let data = parse_message(message)
        if (condition(data)) {
            callback(data)
        }
    }
    ws.on("message", listener)
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


export function convert_response_to_fn(response) {

    let all_output = response.output
    if (!all_output) {
        throw new Error("A response was returned with no output value.")
    }
    if (all_output.length > 1) {
        console.warn(JSON.stringify(all_output, null, 2))
        console.warn("Received unexpected second output from function response. Behavior when more than one output is returned is technically undefined. Reducing output array to include only function call.")
        all_output = all_output.filter(o => o.type === "function_call")
    }
    let output = all_output[0]
    if (!output) {
        console.warn("A response was returned with no output", response)
        throw new Error("A response was returned with no output value.")
    }
    let id = output.id
    if (output.type === "message") {
        let content = output.content[0]
        if (!content) {
            console.error(JSON.stringify(response, null, 2))
            throw new Error("No content was returned")
        }
        let message = content.text || content.transcript
        return {
            id,
            name: "message",
            arguments: {
                text: message
            }
        }
    }
    if (output.type === "function_call") {
        let name = output.name
        let function_arguments = null
        try {
            function_arguments = JSON.parse(output.arguments)
        } catch (e) {
            console.error("Encountered an error parsing function arguments for function", name, output.arguments)
        }
        return {
            id,
            name,
            arguments: function_arguments
        }
    }
}

export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}

import WebSocket from "ws";
import * as docs from "../../docs/spec.js";

export function init_debug(event$, name, session) {
    let debug = true    
    let debug_server_url = process.env.TAU_DEBUG_SERVER_URL ?? `ws://localhost:30020`
    let debug_ws = new WebSocket(`${debug_server_url}/provider`)
    debug_ws.on("error", () => {
        console.error(docs.no_debug_server)
        debug = false
        return
    })
    event$.subscribe(data => {
        if (!debug) return
        send_ws(debug_ws, {session_id : name, ...data, session} )
    })

    return debug_ws
}

export function send_ws(ws, data) {
    ws.send(JSON.stringify(data))
}
