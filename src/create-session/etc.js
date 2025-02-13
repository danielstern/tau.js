
import WebSocket from "ws";
import * as docs from "../../docs/spec.js";

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

// export async function data_type_promise(ws, type) {
//     return await message_promise(ws, data => data.type === type)
// }


export function convert_response_to_fn(response) {

    let all_output = response.output
    if (!all_output) {
        throw new Error("A response was returned with no output value.")
    }
    // if (all_output.length > 1) {
    //     console.warn(JSON.stringify(all_output, null, 2))
    //     console.warn("Received unexpected second output from function response. Behavior when more than one output is returned is technically undefined. Reducing output array to include only function call.")
    //     all_output = all_output.filter(o => o.type === "function_call")
    //     throw new Error("Unhandled")
    // }
    // let output = all_output[0]
    // if (!output) {
    //     console.warn("A response was returned with no output", response)
    //     throw new Error("A response was returned with no output value.")
    // }
    let function_call = null
    let transcript = null
    for (let output of all_output) {

        // let id = output.id

        console.info("Type?", output.type)

        if (output.type === "message") {
            let content = output.content[0]
            if (!content) {
                console.error(JSON.stringify(response, null, 2))
                // throw new Error("No content was returned") // todo ???
            }
            let message = content.text || content.transcript
            transcript = message
            // return {
            //     id,
            //     name: "message",
            //     arguments: {
            //         text: message
            //     }
            // }
        }
        if (output.type === "function_call") {
            let name = output.name
            let parameters = null
            try {
                parameters = JSON.parse(output.arguments)
            } catch (e) {
                console.error("Encountered an error parsing function arguments for function", name, output.arguments)
            }
            function_call = { name, parameters }
            // return {
            //     id,
            //     name,
            //     arguments: function_arguments
            // }
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
    response,
    autoplay_debug
}) {
    // let debug = true    
    let debug_server_url = process.env.TAU_DEBUG_SERVER_URL ?? `ws://localhost:30020`
    let debug_ws = new WebSocket(`${debug_server_url}/provider`)
    debug_ws.on("error", () => {
        throw new Error(docs.no_debug_server)
        // debug = false
        // return
    })
    if (autoplay_debug) {
        debug_ws.on("message", async (message) => {
            let data = parse_message(message)
            if (data.type === "user.audio.input") {
                await create_audio({bytes:data.bytes})
                await response()
            }
        })
    }
    await message_promise(debug_ws, data => data.type === "connection.complete")
    console.info("Connected to debug server")
    event$.subscribe(data => {
        // if (!debug) return
        send_ws(debug_ws, {session_id : name, ...data, session} )
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
            if (process.env.TAU_LOGGING) return console.error(`τ`, name, `error log`, data.error)
            return console.error(`τ`, name, `error log:`, data.error.message)
        }
    
        if (process.env.TAU_LOGGING > 1) {
            let clone = { ...data }
            if (clone.delta) clone.delta = clone.delta.slice(0, 8) + "..."
            return console.info(`τ`, name, clone)
        }
        if (process.env.TAU_LOGGING > 0) return console.info(`τ`, name, data.type)
    }
}