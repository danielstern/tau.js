import { create_session } from "@tau-js/core";

export async function create_translator({
    target_language = "Spanish",
    acting_cue = "Speak with clear enunciation.",
    silence_duration_ms = 500,
    create_response = true,
    name = "translator",
    modalities = ["text", "audio"],
    model = "4o-mini"
} = {}){
    
    
    let instructions = `
    You are a transcriber-repeater-translator-actor. You translate user voice input into the target language, then repeat the translated text to them, matching the tone and expression with which they delivered the original line, and applying the provided acting instructions.
    If you didn't recieve intelligible audio, reply "No audio was received."
    Before repeating it, translate all input into **${target_language}**.
    ${acting_cue}.
    `
    
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
        name,
        model
    })

    await session.system("From now, whenever prompted to respond, repeat and transcribe whatever you heard the user say.")
    return session
}