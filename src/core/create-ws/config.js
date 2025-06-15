export const VERSIONS = {
    "preview-2024-12-17" : "preview-2024-12-17",
    "preview-2025-06-03" : "preview-2025-06-03"
}
for (let key in VERSIONS) VERSIONS["latest"] = VERSIONS[key] 

export const MODELS = {
    "4o-mini" : "gpt-4o-mini-realtime",
    "4o" : "gpt-4o-realtime",
}

export const API_KEY = process.env.OPENAI_API_KEY;
