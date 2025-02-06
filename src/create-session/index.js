import {
    Subject
} from "rxjs";
import {
    accumulate_usage,
    compute_usage
} from "../compute-usage/index.js";
import {
    create_openai_realtime_ws
} from "../create-ws/index.js";
import {
    convert_response_to_fn,
    message_handler,
    message_promise,
    parse_message
} from "./etc.js";
import delay from "delay"

let session_count = 0

export async function create_session({
    name = `tau-session-${++session_count}-${Date.now()}`,
    api_key = null,
    audio = false,
    instructions = undefined,
    mini = false,
    temperature = 0.78, // should this be undefined by default?
    tools = [],
    tool_choice = "none",
    voice = "sage",
} = {}) {

    let ws = null
    let event$ = new Subject()
    let _session = null
    let _conversations = {
        "auto": []
    }
    let _accumulated_usage = {
        computed: {
            total_usage_cost: 0
        },
        tokens: {}
    }

    let message_count = 0
    let _closed = false
    let job_count = 0
    let jobs = {}

    function error_handler(error) {
        console.error("error...!!!", error)
        throw new Error(`τ ${name} encountered an error.`)
    }

    function close_handler() {
        throw new Error(`τ ${name} closed unexpectedly.`)
    }

    function event_message_handler(message) {
        // dunno, there's a good idea here
        const data = parse_message(message)
        event$.next(data)
    }


    function log_message_handler(message) {
        const data = parse_message(message)
        if (data.error) {
            if (process.env.TAU_LOGGING) return console.error(`τ`, name, `error log`, data.error)
            return console.error(`τ`, name, `error log:`, data.error.message)
        }

        
        if (process.env.TAU_LOGGING > 1) {
            let clone = {...data}
            if (clone.delta) clone.delta = clone.delta.slice(0,8) + "..."
            return console.info(`τ`, name, clone)
        }
        if (process.env.TAU_LOGGING > 0) return console.info(`τ`, name, data.type)
    }

    async function init() {
        ws = create_openai_realtime_ws({
            api_key,
            mini
        })

        await message_promise(ws, data => data.type === "session.created")
        ws.on("message", log_message_handler)
        ws.on("message", event_message_handler)
        ws.on("close", close_handler)
        ws.on("error", error_handler)

        await update_session({
            instructions,
            modalities: audio ? ["text", "audio"] : ["text"],
            tools,
            temperature,
            tool_choice,
            voice,
        })

        message_handler(ws, data => data.type === "conversation.item.created", data => {
            if (data.item.content && data.item.status === "completed") {
                _conversations["auto"].push(data.item)
            }
        })

        message_handler(ws, data => data.type === "response.done", data => {
            let { output, conversation_id } = data.response
            if (conversation_id === null) return
            let item = output[0]
            _conversations["auto"].push(item)
        })

        return ws
    }

    function close() {
        ws.off('message', log_message_handler)
        ws.off('message', event_message_handler)
        ws.off('close', close_handler)
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

    async function create({ message, role }) {
        if (_closed) throw new Error("Closed.")
        let type = role === "user" || role === "system" ? "input_text" : "text"
        let id = `tau-message-${++message_count}-${Date.now()}` // necessary
        send_ws({
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

        let data = await message_promise(ws, data => data.type === "conversation.item.created" && data.item.id === id)
        return data.item
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

    async function cancel_response() {
        send_ws({ type: "response.cancel" })
        return await message_promise(ws, data => data.type === "response.done")
    }

    async function delete_conversation_item(item_id) {
        send_ws({ type: "conversation.item.delete", item_id })
        await message_promise(ws, data => data.type === "conversation.item.deleted")
        _conversations["auto"] = _conversations["auto"].map(a => {
            if (a.id !== item_id) return a
            return { ...a, deleted: true }
        })
    }


    async function response(args = {}, meta = {}) {
        if (_closed) throw new Error("Closed.")
        let {
            conversation = "auto",
            input = undefined,
            instructions = undefined,
            tools = undefined,
            tool_choice = undefined,
            audio = true,
            output_audio_format = "pcm16"
        } = args
        let {
            prev_compute_time = 0,
            tries = 1
        } = meta
        let modalities = audio ? ["text", "audio"] : ["text"]
        let job_id = `job-${++job_count}`
        jobs[job_id] = true
        let start_time = Date.now()
        let max_tries = 5
        let max_total_time = audio ? 120000 : 25000
        if (tries > max_tries) {
            throw new Error("Failed to get response after max tries")
        }
        send_ws({
            type: "response.create",
            response: {
                conversation,
                modalities,
                output_audio_format,
                instructions,
                input,
                tools,
                tool_choice
            }
        })

        let _done = false
        let timeout_promise = async function(){
            let time_remaining = max_total_time
            while (time_remaining > 0) {
                await delay(100)
                time_remaining -= 100
                if (_done) {
                    return { error : false }
                }
            }
            // await delay(max_time)
            return { error : true }
        }

        let first_audio_delta_compute_time = null
        let first_text_delta_compute_time = null
        async function co_first_delta_process() {
            let data = await message_promise(ws, data => data.type === "response.audio.delta" || data.type === "response.done" || data.type === "response.text.delta")
            if (data.type === "response.audio.delta") {
                first_audio_delta_compute_time = Date.now() - start_time + prev_compute_time
            }
            if (data.type === "response.text.delta") {
                first_text_delta_compute_time = Date.now() - start_time + prev_compute_time
            }
        }
        co_first_delta_process()
        let data_promise = message_promise(ws, data => {
            if (data.type === "response.done") return true
            if (data.type === "response.cancelled") return true
        })
        let data = await Promise.race([timeout_promise(), data_promise])
        _done = true
        if (data.error) {
            throw new Error("Request timed out")
        }
        delete jobs[job_id]
        if (data.type === "response.cancelled") {
            return null
        }
        let compute_time = Date.now() - start_time
        let total_compute_time = compute_time + prev_compute_time

        if (data.response.status === "failed") {
            console.warn("response.create request failed after", compute_time, "ms", "Attempting to retry...")
            return await response(args, {
                tries: tries + 1,
                prev_compute_time: total_compute_time
            })
        }

        let usage = compute_usage({ data, realtime: true, mini })
        let fn_data = convert_response_to_fn(data.response)
        _accumulated_usage = accumulate_usage(usage, _accumulated_usage)
        return {
            ...fn_data,
            compute_time: total_compute_time,
            first_text_delta_compute_time,
            first_audio_delta_compute_time,
            attempts: tries
        }
    }

    await init()

    return {
        user,
        system,
        assistant,
        response,
        close,
        cancel_response,
        delete_conversation_item,
        event$,
        get name() { return name },
        get session() { return _session },
        get conversations() { return _conversations },
        get usage() { return _accumulated_usage },
        get is_working() { return Object.keys(jobs).length > 0 }
    }
}