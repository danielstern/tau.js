import { readFileSync } from "fs";
import path from "path";
import yaml from "js-yaml";

export function log_message_handler(message) {
    const data = parse_message(message)
    if (process.env.TAU_LOGGING) {
        console.info(data.type)
    }
    if (data.error) console.error(data.error)
}
export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}

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

export function message_promise(ws, condition = () => true) {
    let promise_handler = resolve => {
        let listener = (message) => {
            let data = parse_message(message)
            if (condition(data)) {
                resolver(data)
            }
        }
        let resolver = (data) => {
            ws.off("message", listener)
            resolve(data)
        }
        ws.on("message", listener)
    }
    return new Promise(promise_handler)
}
