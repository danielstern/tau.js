import delay from "delay";
// import {
//     readFileSync,
//     writeFileSync
// } from "fs";
// import yaml from "js-yaml";
// import path from "path";
import readline from "readline";

export async function user_tty() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'Enter user action> '
    });
    return new Promise(resolve => {
        let handler = line => {
            let input = line.trim()
            rl.off(line, handler)
            resolve(input)
            rl.close()
        }
        rl.on("line", handler)
    })
}

export async function audio_finished(data, shift_time = 0) {
    let { first_audio_delta_timestamp, total_audio_duration } = data
    if (!first_audio_delta_timestamp) return
    let target = total_audio_duration + first_audio_delta_timestamp + shift_time
    console.info({
        first_audio_delta_timestamp,
        total_audio_duration,
        shift_time, 
        target
    })
    while (true) {
        await delay(10)
        if (Date.now() >= target) return true
    }
}

export function pcm_to_wav({
    pcm_data,
    sample_rate = 24000,
}) {
    let channels = 1
    let wav_header = Buffer.alloc(44)
    let byte_rate = sample_rate * channels * 2
    let block_align = channels * 2

    wav_header.write("RIFF", 0)
    wav_header.writeUInt32LE(36 + pcm_data.length, 4) // File size - 8 bytes
    wav_header.write("WAVE", 8)
    wav_header.write("fmt ", 12)
    wav_header.writeUInt32LE(16, 16) // PCM header size
    wav_header.writeUInt16LE(1, 20) // Audio format (1 = PCM)
    wav_header.writeUInt16LE(channels, 22)
    wav_header.writeUInt32LE(sample_rate, 24)
    wav_header.writeUInt32LE(byte_rate, 28)
    wav_header.writeUInt16LE(block_align, 32)
    wav_header.writeUInt16LE(16, 34) // Bits per sample
    wav_header.write("data", 36)
    wav_header.writeUInt32LE(pcm_data.length, 40)

    return Buffer.concat([wav_header, pcm_data])

    // writeFileSync(output_file, Buffer.concat([wav_header, pcm_data]))
}

// export async function save_deltas_as_wav(deltas, filename = `tmp/voice-${Date.now()}.wav`) {
//     let buffer_queue = []

//     try {
//         for (let delta of deltas) {
//             let audio_data = Buffer.from(delta, "base64")
//             buffer_queue.push(audio_data)
//         }

//         let audio_buffer = Buffer.concat(buffer_queue)

//         convert_pcm_to_wav(
//             audio_buffer,
//             filename
//         )
//     } catch (e) {
//         console.error(e)
//         throw new Error("τ Encountered an error saving an audio file. Are you sure the folder to which you are trying to save the audio exists?")
//     }
// }