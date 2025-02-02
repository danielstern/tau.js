import { costs } from "./spec.js";
import { readFileSync } from "fs";
import path from "path";
import yaml from "js-yaml";
import readline from "readline";

export function create_ws() {
    let headers = {
        "Authorization": `Bearer ${api_key}`,
    }

    if (realtime) headers["OpenAI-Beta"] = "realtime=v1"

    let ws = new WebSocket(mini ? REALTIME_API_MINI_URL : REALTIME_API_URL, { headers })
    return ws
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

export function loadmd(filename = "", override_dir = null) {
    const dir = override_dir ? `src/${override_dir}` : "docs"
    const ext = "md";

    const filepath = path.join(dir, `${filename}.${ext}`);

    try {
        return readFileSync(filepath, "utf8");
    } catch (error) {
        throw error;
    }
}


export function loadyml(filename = "", override_dir = null) {
    const dir = override_dir ? `src/${override_dir}` : "docs"
    const ext = "yml";

    const filepath = path.join(dir, `${filename}.${ext}`);

    try {
        const fileContents = readFileSync(filepath, "utf8");
        const parsedYml = yaml.load(fileContents);

        return parsedYml;
    } catch (error) {
        console.error(`Failed to load YAML file ${filename}:`, error.message);
        throw error;
    }
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

export function compute_usage({
    realtime,
    mini,
    data
}) {
    if (!realtime) {
        throw new Error("No completions cost computing configured")
    }
    if (realtime) {
        let { usage } = data.response
        let { 
            input_token_details, 
            output_token_details 
        } = usage
        let { 
            text_tokens: input_text_tokens, 
            audio_tokens: input_audio_tokens, cached_tokens_details 
        } = input_token_details
        let { 
            text_tokens: output_text_tokens, 
            audio_tokens: output_audio_tokens 
        } = output_token_details
        let { 
            text_tokens: input_text_tokens_cached, 
            audio_tokens: input_audio_tokens_cached
        } = cached_tokens_details

        let summary = {}
        let prefix = `realtime_${mini ? "mini_" : ""}`
        let base = {
            input_text_tokens,
            input_audio_tokens,
            input_text_tokens_cached,
            input_audio_tokens_cached,
            output_text_tokens,
            output_audio_tokens
        }
        for (let key in base){
            summary[`${prefix}${key}`] = { tokens : base[key] }
        }
        for (let key in summary) {
            let val = summary[key]
            let { tokens } = val
            let cost = costs[key]
            if (!cost) {
                console.warn("No pricing found for", key)
                cost = 0
            }
            let usage_cost = tokens * cost / 1000000
            summary[key] = {
                tokens,
                usage_cost
            }
        }

        console.info(summary)
        return summary
    }

}