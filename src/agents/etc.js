import { audio_finished } from "@tau-js/utility"
export async function tutorial(agent, lessons, {
    await_responses = true
} = {}) {
    console.info("Tutorial for", agent.name)
    let items = []
    let start_time = Date.now()
    let lessons_complete = 0
    for (let lesson of lessons) {
        console.info("Executing tutorial", lessons_complete + 1, "/", lessons.length, ":", lesson)
        let conversation_item = await agent.system(lesson)
        items.push(conversation_item)
        let response = await agent.response()
        if (await_responses) await audio_finished(response)
        lessons_complete++
    }

    await Promise.all(items.map(async function(item){
        await agent.delete_conversation_item(item.id)
    }))
    console.info("Deleted", items.length, "conversation items.")

    console.info("Completed", lessons.length, "lessons in", Date.now() - start_time, "ms")


}