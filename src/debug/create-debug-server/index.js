import cors from 'cors';
import express from 'express';
import { WebSocketServer } from 'ws';
import { parse_message } from '../create-session/etc.js'; //todo..? = ???

export async function create_debug_server() {
    const app = express();
    const port = process.env.PORT || 30020;
    
    app.use(express.json());
    app.use(cors());
    
    const wss = new WebSocketServer({ noServer: true });

    let consumers = []
    let providers = []
    let consumer_count = 0
    
    wss.on('connection', async (ws,request) => {
        console.log("A new client connected", request.url)
        let { url } = request
        if (url === "/provider") {

            let id = `providers-${++consumer_count}`
            providers.push({id,ws})

            ws.send(JSON.stringify({type : "connection.complete"}))
            ws.on("message", message => {
                let data = parse_message(message)
                for (let consumer of consumers) {
                    let out_data = { ...data}
                    consumer.ws.send(JSON.stringify(out_data))
                }
            })
            ws.on('close', () => {
                console.log("A client disconnected");
            });
        } else if (url === "/consumer") {
            ws.send(JSON.stringify({type : "connection.complete"}))
            let id = `consumer-${++consumer_count}`
            consumers.push({ws, id})
            ws.on("message", message => {
                let data = parse_message(message)
                let type = data.type
                if (type === "user.audio.input") {
                    let bytes = data.bytes
                    console.info("Got audio bytes",bytes.length)
                    for (let provider of providers) {
                        let out_data = { ...data}
                        provider.ws.send(JSON.stringify(out_data))
                    }
                }
                // for (let consumer of consumers) {
                //     let out_data = { ...data}
                //     consumer.ws.send(JSON.stringify(out_data))
                // }
            })
            ws.on("close", () => {
                consumers = consumers.filter(c => c.id !== id)
            })
        } 
        else {
            ws.close()
        }
    })
    
    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
    
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    
    
    app.get('/', (_req, res) => {
        res.send('ok');
    });

    return server
}

import WebSocket from "ws";

export function handle_debugger_client_input(handler) {
    let debug_server_url = process.env.TAU_DEBUG_SERVER_URL ?? `ws://localhost:30020`
    let debug_ws = new WebSocket(`${debug_server_url}/provider`)

    debug_ws.on("message", (message) => {
        let data = parse_message(message)
        handler(data)
    })

    return ()=>{
        debug_ws.removeAllListeners()
        debug_ws.close()
    }
}