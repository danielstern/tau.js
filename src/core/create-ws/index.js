import WebSocket from "ws";
import {
    API_KEY,
    REALTIME_API_MINI_URL,
    REALTIME_API_URL
} from "./config.js";

export function create_openai_realtime_ws({
    api_key,
    model,
    name
}) {
    if (API_KEY && !api_key) api_key = API_KEY
    if (!api_key) throw new Error(`You must specify an API key to this library. 
Specify the \`api_key\` argument when creating a new session or set the OPENAI_API_KEY environment variable.`)

    let headers = {
        ["Authorization"] : `Bearer ${api_key}`,
        ["OpenAI-Beta"] : `realtime=v1`
    }

    function error_handler(_error) {
        console.error(`τ Webscoket Error`, _error)
        throw new Error(`τ ${name} encountered an error.`)
    }

    function close_handler(name) {
        throw new Error(`τ ${name} closed unexpectedly.`)
    }

    let url = null
    if (model === "4o") url = REALTIME_API_URL
    if (model === "4o-mini") url = REALTIME_API_MINI_URL
    if (url === null) throw new Error(`Invalid model ${model}, options are: 4o, 4o-mini`)

    let ws = new WebSocket(url, { headers })

    ws.on("close", close_handler)
    ws.on("error", error_handler)

    return ws
}