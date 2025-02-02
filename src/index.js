import {
    log_message_handler,
    message_promise,
    parse_message
} from "./etc.js";
import { Subject } from "rxjs"

import { create_openai_realtime_ws } from "./create-ws/index.js";
import { 
    accumulate_usage,
    compute_usage
 } from "./compute-usage/index.js";

export async function Tau({
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
        let user_message_event = {
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
        };

        send_ws(user_message_event)
        let { item } = await message_promise(ws, data => data.type === "conversation.item.created")
        console.info(JSON.stringify(item, null, 2))
        _conversation.push({
            id: item.id,
            role: item.role,
            type: "text",
            message: item.content[0].text,
        })
    }

    async function user(message) { await create({ message, role: "user" }) }
    async function system(message) { await create({ message, role: "system" }) }
    async function assistant(message) { await create({ message, role: "assistant" }) }

    async function response({
        conversation = "auto",
        input = undefined
    } = {}) {
        send_ws({
            type: "response.create",
            response: {
                conversation,
                output_audio_format,
                input
            }
        })
        const data = await message_promise(ws, data => data.type === "response.done")
        console.info(JSON.stringify(data.response, null, 2))
        let usage = compute_usage({ data, realtime, mini })
        console.info(usage)
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
      
        let output = data.response.output[0]
        let content = output.content[0]
        if (output.type === "message") {
            let message = content.text || content.transcript
            _conversation.push({
                id: output.id,
                role: "assistant",
                type: content.type,
                message
            })
            return {
                name: "text",
                arguments: {
                    text: message
                }
            }
        }
    }

    return {
        user,
        system,
        assistant,
        response,
        close,
        get session() { return _session },
        get conversation() { return _conversation },
        get usage() { return _accumulated_usage }
    }

}

export { load_md, load_yml } from "./etc.js"