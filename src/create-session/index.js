import { Subject } from "rxjs"
import {
    log_message_handler,
    message_promise,
    parse_message
} from "../etc.js";
import { create_openai_realtime_ws } from "../create-ws/index.js";
import { 
    accumulate_usage,
    compute_usage
 } from "../compute-usage/index.js";

export async function create_session({
    api_key = null,
    audio = false,
    instructions = undefined,
    mini = true,
    temperature = 0.89,
    tools = [],
    tool_choice = "none",
    realtime = true,
    tutorial = [],
    output_audio_format = "pcm16",
    voice = "sage",
}) {

    let ws = create_openai_realtime_ws({
        api_key,
        mini
    })
    let event$ = new Subject()
    let _session = null
    let _conversation = []
    let _accumulated_usage = {
        computed: {
            total_usage_cost: 0
        },
        tokens: {}
    }
    let _compute_time = {
        total_responses : 0,
        total_response_time : 0,
        average_response_time : 0
    }

    async function init() {

        await message_promise(ws, data => data.type === "session.created")
        await update_session({
            instructions,
            modalities: audio ? ["text", "audio"] : ["text"],
            tools,
            temperature,
            tool_choice,
            voice,
        })

        for (let { role, message } of tutorial) {
            await create({ role, message })
        }

        ws.on("message", log_message_handler)
        ws.on("message", event_message_handler)

        return ws
    }

    await init()

    function event_message_handler(message) {
        const data = parse_message(message)
        event$.next(data)
    }

    function close() {
        ws.off('message', log_message_handler)
        ws.off('message', event_message_handler)
        ws.close()
    }

    function send_ws(data) {
        ws.send(JSON.stringify(data))
    }

    async function update_session(updates) {
        send_ws({ type: "session.update", session: updates });
        let { session } = await message_promise(ws, data => data.type === "session.updated")
        _session = session
    }

    async function create({
        message,
        role = "user"
    }) {
        let start_time = Date.now()
        send_ws({
            type: "conversation.item.create",
            item: {
                type: "message",
                role,
                content: [
                    {
                        type: role === "user" || role === "system" ? "input_text" : "text",
                        text: message,
                    },
                ]
            }
        })
        let { item } = await message_promise(ws, data => data.type === "conversation.item.created")
        let compute_time = Date.now() - start_time
        // console.info(JSON.stringify(item, null, 2))
        _conversation.push({
            id: item.id,
            role: item.role,
            compute_time,
            type: "text",
            message: item.content[0].text,
        })
    }

    async function user(message) { await create({ message, role: "user" }) }
    async function system(message) { await create({ message, role: "system" }) }
    async function assistant(message) { await create({ message, role: "assistant" }) }

    async function response({
        conversation = "auto",
        input = undefined,
        instructions = undefined,
        tools = undefined,
        tool_choice = undefined
    } = {}) {
        let start_time = Date.now()
        send_ws({
            type: "response.create",
            response: {
                conversation,
                output_audio_format,
                instructions,
                input,
                tools,
                tool_choice
            }
        })
        let data = await message_promise(ws, data => data.type === "response.done")
        // console.info(JSON.stringify(data.response, null, 2))
        let usage = compute_usage({ data, realtime, mini })
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
        let compute_time = Date.now() - start_time

        _compute_time.total_responses += 1
        _compute_time.total_response_time += compute_time
        _compute_time.average_response_time = (
            _compute_time.total_response_time / 
            _compute_time.total_responses
        )
      
        let output = data.response.output[0]
        if (output.type === "message") {
            let content = output.content[0]
            let message = content.text || content.transcript
            _conversation.push({
                id: output.id,
                role: "assistant",
                type : "message",
                compute_time,
                data : {
                    message
                }
            })
            return {
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
                console.error("Encountered an error parsing function arguments for function", name )
            }
            _conversation.push({
                id: output.id,
                role: "assistant",
                compute_time,
                type : name,
                data : function_arguments
            })
            return {
                name,
                arguments: function_arguments
            }
        }
    }

    return {
        user,
        system,
        assistant,
        response,
        close,
        event$,
        get session() { return _session },
        get conversation() { return _conversation },
        get usage() { return _accumulated_usage },
        get compute_time() { return _compute_time },
    }

}