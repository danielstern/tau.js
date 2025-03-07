import { create_session } from "@tau-js/core";

let instructions = `
Whenever prompted to respond, transcribe any user voice input received since the last time you were asked to respond. 
If you received no input, just output an empty string.
Transcribe fragments that were too distorted to hear clearly as ???
Don't surround output in quotes or add extra commentary.
`
export async function create_transcriber({
    debug = false,
    silence_duration_ms = 1200,
    create_response = true,
    name = "transcriber"
} = {}){
    
    return await create_session({
        instructions : instructions,
        modalities : ["text"],
        tool_choice : "none",
        turn_detection : {
            type : "server_vad",
            create_response,
            silence_duration_ms
        }
    },{
        debug,
        name
    })
}