import { WebSocketServer } from 'ws';
import cors from 'cors';
import express from 'express';
import { message_promise, parse_message } from '../create-session/etc.js';

export async function create_debug_server() {
    const app = express();
    const port = process.env.PORT || 30020;
    
    app.use(express.json());
    app.use(cors());
    
    const wss = new WebSocketServer({ noServer: true });

    // let providers = []
    let consumers = []
    let consumer_count = 0
    
    wss.on('connection', async (ws,request) => {
        console.log("A new client connected", request.url)
        let { url } = request
        if (url === "/provider") {

            // ws.isAlive = true; // i dont think this does anything
            ws.send(JSON.stringify({type : "connection.complete"}))
            // ws.send(JSON.stringify({type : "provider.identity.requested"}))
            // let { data } = await message_promise(ws, data => data.type === "provider.identity")
            // let { name } = data
            // providers.push({name, ws})
            // ws.send(JSON.stringify({type : "provider.identity.accepted"}))
            ws.on("message", message => {
                let data = parse_message(message)
                for (let consumer of consumers) {
                    let out_data = { ...data}
                    // console.info("Sending data", message)
                    // consumer.ws.send(message)
                    consumer.ws.send(JSON.stringify(out_data))
                }
            })
            ws.on('close', () => {
                console.log("A client disconnected");
                // delete providers[name]
            });
        } else if (url === "/consumer") {
            ws.send(JSON.stringify({type : "connection.complete"}))
            let id = `consumer-${++consumer_count}`
            consumers.push({ws, id})
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
