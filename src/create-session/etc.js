export async function message_handler(ws, condition, callback) {
    let listener = (message) => {
        let data = parse_message(message)
        if (condition(data)) {
            callback(data)
            // resolver(data)
        }
    }
    ws.on("message", listener)
}


export function message_promise(ws, condition = () => true) {
    let promise_handler = resolve => {
        let listener = (message) => {
            let data = parse_message(message)
            if (condition(data)) {
                resolver(data)
            }
        }
        let resolver = (data) => {
            ws.off("message", listener)
            resolve(data)
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
        console.info(JSON.stringify(all_output, null, 2))
        // console.info(JSON.stringify(response, null, 2))
        // throw new Error("Unexpected extra entries in response")
        console.info("Received unexpected second output from function response. Behavior when more than one output is returned is technically undefined. Reducing output array to include only function call.")
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
            console.error("Encountered an error parsing function arguments for function", name, output.arguments )
        }
        return {
            id,
            name,
            arguments: function_arguments
        }
    }
}

export function log_message_handler(message) {
    const data = parse_message(message)
    if (process.env.TAU_LOGGING) {
        console.info(data.type)
    }
    if (data.error) console.error(data.error)
}
export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}
