import { create_session } from "@tau-js/core";

let instructions = `
You are a transcriber-repeater. You repeat what the user said back to them, and transcribe it.
Whenever prompted to respond, transcribe/repeat any user voice input received since the last time you were asked to respond. 
If you didn't recieve intelligible audio, reply "No audio was received."
`

/**
 * The simplest tool for testing. 
 */
export async function create_transcriber_repeater({
    debug = true,
    silence_duration_ms = 500,
    create_response = true,
    name = "transcriber",
    modalities = ["text", "audio"],
    model = "4o"
} = {}){
    
    let session = await create_session({
        instructions,
        modalities,
        tool_choice : "none",
        turn_detection : {
            type : "server_vad",
            create_response,
            silence_duration_ms,
            prefix_padding_ms : 500
        }
    },{
        debug,
        name,
        model
    })

    await session.system("From now, whenever prompted to respond, repeat and transcribe whatever you heard the user say.")
    return session
}