import WebSocket from "ws";
import {
    API_KEY,
    REALTIME_API_MINI_URL,
    REALTIME_API_URL
} from "./spec.js";
// import { load_md } from "../etc.js";

export function create_openai_realtime_ws({
    api_key,
    mini
}) {
    if (API_KEY && !api_key) api_key = API_KEY
    if (!api_key) throw new Error(`You must specify an API key to this library. 
Specify the \`api_key\` argument when creating a new session or set the OPENAI_API_KEY environment variable.`)

    let headers = {
        ["Authorization"] : `Bearer ${api_key}`,
        ["OpenAI-Beta"] : `realtime=v1`
    }

    let ws = new WebSocket(mini ? REALTIME_API_MINI_URL : REALTIME_API_URL, { headers })
    return ws
}