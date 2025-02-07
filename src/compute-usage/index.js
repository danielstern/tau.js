
const costs = {
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
            text_tokens: input_text_tokens_gross, 
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
        let input_text_tokens = input_text_tokens_gross - input_text_tokens_cached
        let base = {
            input_text_tokens,
            input_text_tokens_cached,
            input_text_tokens_gross,
            input_audio_tokens,
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
                cost = 0
            }
            let usage_cost = tokens * cost / 1000000
            summary[key] = {
                tokens,
                cpm: cost,
                usage_cost
            }
        }

        return summary
    }
}

export function accumulate_usage(usage, accumulated) {
    if (!accumulated) {
        accumulated = {
            computed: {
                total_usage_cost: 0
            },
            tokens: {}
        }
    }
    for (let key in usage) {
        let { tokens, usage_cost, cpm } = usage[key]
        accumulated.computed.total_usage_cost += usage_cost
        if (!accumulated.tokens[key]) accumulated.tokens[key] = {
            tokens: 0,
            cpm,
            usage_cost: 0
        }
        accumulated.tokens[key].tokens += tokens
        accumulated.tokens[key].usage_cost += usage_cost
    }

    return accumulated
}

export function accumulate_compute_time(accumulator, compute_time) {
    
    accumulator.total_responses += 1
    accumulator.total_response_time += compute_time
    accumulator.average_response_time = ~~(
        accumulator.total_response_time / 
        accumulator.total_responses
    )

    return accumulator
}