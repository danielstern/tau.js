
import { createContext, useContext } from "react"

export const AudioHelperContext = createContext()
export const useAudioHelper = () => useContext(AudioHelperContext)

export function delta_to_buffer(audio_context, delta) {
    let binary_string = atob(delta)
    let len = binary_string.length
    let bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }

    let view = new DataView(bytes.buffer)
    let sample_count = view.byteLength / 2
    let samples = new Float32Array(sample_count)
    for (let i = 0; i < sample_count; i++) {
        let sample = view.getInt16(i * 2, true)
        samples[i] = sample / 32768
    }

    let audio_buffer = audio_context.createBuffer(1, sample_count, 24000)
    audio_buffer.getChannelData(0).set(samples)

    return audio_buffer
}