import WebSocket from "ws";
import {
    API_KEY,
    MODELS,
    VERSIONS
} from "./config.js";

export function create_openai_realtime_ws({
    api_key,
    model = MODELS["4o"],
    version = VERSIONS["latest"],
    name
}) {
    if (API_KEY && !api_key) api_key = API_KEY
    if (!api_key) throw new Error(`You must specify an API key to this library. 
Specify the \`api_key\` argument when creating a new session or set the OPENAI_API_KEY environment variable.`)

    if (model === MODELS["4o-mini"] && version !== VERSIONS["preview-2024-12-17"]) {
        version = VERSIONS["preview-2024-12-17"]
    }

    let headers = {
        ["Authorization"] : `Bearer ${api_key}`,
        ["OpenAI-Beta"] : `realtime=v1`
    }

    function error_handler(_error) {
        console.error(`τ A Websocket error`, _error)
        throw new Error(`τ ${name} encountered an error.`)
    }

    function close_handler(name) {
        console.error(`τ ${name} closed unexpectedly.`)
    }

    let url = `wss://api.openai.com/v1/realtime?model=${model}-${version}`
    let ws = new WebSocket(url, { headers })

    ws.on("close", close_handler)
    ws.on("error", error_handler)

    return ws
}