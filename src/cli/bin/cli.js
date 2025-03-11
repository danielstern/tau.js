#!/usr/bin/env node
// bin/cli.js
import { create_server } from "@tau-js/server"
import open from "open"

const args = process.argv.slice(2);

if (args[0] === "server" && args[1] === "start") {
    create_server();
    if (args[2] === "--debug") {
        open("https://owned.io/tau/debugger/")
        console.info(
            "Opened tau debugger at https://owned.io/tau/debugger/.\n*.*"
        )
    }
} else {
    console.info("Usage: tau server start [--debug]");
    process.exit(1);
}