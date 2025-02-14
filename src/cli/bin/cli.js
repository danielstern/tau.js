#!/usr/bin/env node
// bin/cli.js
import { create_debug_server } from "@tau-js/debug";
// import { create_debug_server } from "../src/create-debug-server/index.js";
import open from "open"

const args = process.argv.slice(2);

if (args[0] === "debug" && args[1] === "start") {
    create_debug_server();
    open("https://owned.io/tau/debugger/")
    console.info(
        "Opened debugger at https://owned.io/tau/debugger/.\n*Click anywhere in the debugger ui to enable the audio context before generating audio.*"
    )
} else {
    console.log("Usage: tau debug start");
    process.exit(1);
}
