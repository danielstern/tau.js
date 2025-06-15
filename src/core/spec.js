process.env.TAU_LOGGING = 2

import { create_session } from "./create-session/index.js";
import { MODELS } from "./create-ws/config.js";


let helloer = await create_session({},{
    model : MODELS["4o-mini"]
})
console.info(helloer)
await helloer.system("Simply repeat the following exactly, in a friendly, confident voice: 'Hello, world!'")
let data = await helloer.response().promise()
console.info(data)
helloer.close()