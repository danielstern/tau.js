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
            // try {

            let data = parse_message(message)
            if (condition(data)) {
                ws.off("message", listener)
                resolve(data)
            }
            // } catch (e) {
            // console.info("Unexpected error", e)
            // reject(error)
            // }
        }
        // let resolver = (data) => {
        //     console.info(data)
        //     ws.off("message", listener)
        //     resolve(data)
        // }
        // console.info("Add listener")
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

// export function log_message_handler(message, name) {
//     const data = parse_message(message)
//     if (data.error) {
//         if (process.env.TAU_LOGGING)  {
//             console.error(`τ`, name, `error log:`, data.error)
//         } else {
//             console.error(`τ`, name, `error log:`, data.error.message)
//         }
//     } else {
//         if (process.env.TAU_LOGGING > 0) {
//             console.info(`τ`, data.type)
//         }

//     }
// }

export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}
