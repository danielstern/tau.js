import { createContext, useContext } from "react";

export const TauAudioContext = createContext()
export const useTauAudio = () => useContext(TauAudioContext)


function buffer_to_base64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk_size = 8192;

    for (let i = 0; i < bytes.length; i += chunk_size) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk_size));
    }
    
    return btoa(binary);
}

export function media_event_to_pcm16_base64(event) {
    const input_buffer = event.inputBuffer.getChannelData(0);
    const pcm16 = new Int16Array(input_buffer.length);
    for (let i = 0; i < input_buffer.length; i++) {
        pcm16[i] = input_buffer[i] * 32767;
    }
    let buffer = pcm16.buffer
    let base_64 = buffer_to_base64(buffer)
    return base_64
}
