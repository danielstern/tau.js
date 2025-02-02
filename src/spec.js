
export const REALTIME_API_URL = process.env.REALTIME_API_URL || "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
export const REALTIME_API_MINI_URL = process.env.REALTIME_API_MINI_URL || "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17"
export const API_KEY = process.env.OPEN_AI_API_KEY;
export const costs = {
    realtime_mini_input_text_tokens: 0.6,
    realtime_mini_input_text_tokens_cached: 0.3,
    realtime_mini_output_text_tokens: 2.4,
    realtime_mini_input_audio_tokens: 10,
    realtime_mini_input_audio_tokens_cached: 0.3,
    realtime_mini_output_audio_tokens: 20,
    realtime_input_text_tokens: 5,
    realtime_input_text_tokens_cached: 2.5,
    realtime_output_text_tokens: 20,
    realtime_input_audio_tokens: 40,
    realtime_input_audio_tokens_cached: 2.5,
    realtime_output_audio_tokens: 80

}