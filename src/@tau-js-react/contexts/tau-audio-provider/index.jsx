import { useState, useRef, useEffect } from "react";
import { useTauWebsocket } from "../tau-ws-provider/etc.js";
import { media_event_to_pcm16_base64, TauAudioContext, useTauAudio } from "./etc.js";

export function TauAudioProvider({
    children,
    autosend_audio_stream = true
}) {
    let [audio_context, set_audio_context] = useState(null);
    let [is_capturing_audio, set_is_capturing_audio] = useState(false)
    let websocket = useTauWebsocket()
    // let media_stream_ref = useRef(null)
    let autosend_error_ref = useRef(null)
    let stop_capture_audio_function_ref = useRef(null)

    function initialize_audio_context(_event) {
        if (audio_context) return audio_context
        let context = new (window.AudioContext || window['webkitAudioContext'])()
        set_audio_context(context)
        return context
    }

    function handle_audio_chunk(bytes) {
        if (autosend_audio_stream && !autosend_error_ref.current) {
            if (websocket) {
                websocket.send({bytes, type : "user.audio.stream"})
            } else {
                autosend_error_ref.current = true
                throw new Error("tau audio provider should be placed inside a tau websocket provider if `autosend_audio_stream` is enabled")
            }
        }
    }

    async function start_capture_audio(_event) {
        let audio_context = initialize_audio_context()
        let media_stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let source = audio_context.createMediaStreamSource(media_stream)
        let script_processor = audio_context.createScriptProcessor(4096, 1, 1)

        script_processor.onaudioprocess = (event) => {
            let base64 = media_event_to_pcm16_base64(event)
            handle_audio_chunk(base64);

        }
        source.connect(script_processor)
        script_processor.connect(audio_context.destination) // is this necessary? what does this do?
        set_is_capturing_audio(true)
        stop_capture_audio_function_ref.current = () => {
            media_stream.getTracks().forEach(track => track.stop());
            script_processor.onaudioprocess = null
            set_is_capturing_audio(false)
        }
    };

    async function stop_capture_audio() {
        if (!stop_capture_audio_function_ref.current) return
        stop_capture_audio_function_ref.current()
        stop_capture_audio_function_ref.current = null
    }
    
    return (
        <TauAudioContext.Provider value={{
            start_capture_audio,
            stop_capture_audio,
            is_capturing_audio,
            initialize_audio_context,
            audio_context,
        }}>
            {children}
        </TauAudioContext.Provider>
    )
}


export function AudioContextAutoconnector(){
    let { initialize_audio_context, audio_context } = useTauAudio()
    if (audio_context) return
    useEffect(() => {
        document.addEventListener("click", initialize_audio_context, { once: true });
        return () => {
            document.removeEventListener("click", initialize_audio_context);
        };
    }, [audio_context]);
}