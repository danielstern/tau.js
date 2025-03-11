import { tutorial } from "../etc.js";
import { create_transcriber_repeater } from "./index.js";

process.env.TAU_LOGGING = 1
let transcriber = await create_transcriber_repeater({
    debug : true,
    model : "4o-mini"
})

transcriber.event$.subscribe(e => {
    console.info(e.type)
})


await transcriber.user("The rain in spain falls mostly in the plains.")
await transcriber.response()