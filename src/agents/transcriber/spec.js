import { create_transcriber } from "./index.js";

let transcriber = await create_transcriber({
    debug : true
})

transcriber.event$.subscribe(e => {
    console.info(e)
})