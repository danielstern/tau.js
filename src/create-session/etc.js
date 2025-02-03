export function convert_response_to_fn(response) {
    
    let all_output = response.output
    if (!all_output) {
        throw new Error("A response was returned with no output value.")
    }
    let output = all_output[0]
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