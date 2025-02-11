import { readFileSync } from "fs";
import path from "path";
import yaml from "js-yaml";
import readline from "readline";
import delay from "delay"

export function load_md(filename = "", override_dir = null) {
    const dir = override_dir ? `src/${override_dir}` : "docs"
    const ext = "md";

    const filepath = path.join(dir, `${filename}.${ext}`);

    try {
        return readFileSync(filepath, "utf8");
    } catch (error) {
        throw error;
    }
}

export function load_yml(filename = "", override_dir = null) {
    const dir = override_dir ? `src/${override_dir}` : "docs"
    const ext = "yml";

    const filepath = path.join(dir, `${filename}.${ext}`);

    try {
        const fileContents = readFileSync(filepath, "utf8");
        const parsedYml = yaml.load(fileContents);

        return parsedYml;
    } catch (error) {
        console.error(`Failed to load YAML file ${filename}:`, error.message);
        throw error;
    }
}

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

export async function audio_promise(session) {
    let data = await session.response({
        // modalities : ["text", "audio"]
    })
    let { 
        total_audio_duration,
        first_audio_delta_compute_time,
        compute_time
     } = data

     await delay(
        total_audio_duration * 1000 + 
        first_audio_delta_compute_time - 
        compute_time
    )
}
