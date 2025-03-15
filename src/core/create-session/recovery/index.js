import { compute_usage } from "../../compute-usage/index.js"
import { message_promise } from "../etc.js"

export async function recover_session({
    openai_ws,
    max_regenerate_response_count = 0,
    replay_messages = true,
    handle_usage,
    model,
    name,
    log
}) {
    let recovery_start = Date.now()
    let outgoing_sent = 0
    let responses_regenerated = 0
    let outgoing_logged = log.filter(a => a.type === "outgoing")
    for (let { data } of outgoing_logged) {
        if (data.type === "session.update") {
            openai_ws.send(JSON.stringify(data))
            outgoing_sent++
            await message_promise(
                openai_ws,
                data => data.type === "session.updated"
            )
        }

        if (replay_messages) {
            if (data.type === "conversation.item.create") {
                openai_ws.send(JSON.stringify(data))
                outgoing_sent++
                await message_promise(
                    openai_ws,
                    data => data.type === "conversation.item.created"
                )
            }

            if (data.type === "response.create") {
                if (responses_regenerated < max_regenerate_response_count) {
                    responses_regenerated++
                    console.info("τ Recreating response...")
                    openai_ws.send(JSON.stringify(data))
                    let response_data = await message_promise(openai_ws, data => {
                        if (data.type === "response.done") return true
                        if (data.type === "response.cancelled") return true
                    })
                    let usage = compute_usage({data : response_data, model})
                    handle_usage(usage)
                    console.info("τ Recreated response successfully.")
                } else {
                    console.info("τ Maximum number of responses (", max_regenerate_response_count, ") to regenerate already reached. Skipping response regeneration.")
                }

            }
        }
    }
    console.info("τ Recovered websocket", name, "in", Date.now() - recovery_start, "ms. Recreated", outgoing_sent, "outgoing messages and regenerated", responses_regenerated, "responses.")
}