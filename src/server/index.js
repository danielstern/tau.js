import cors from 'cors';
import express from 'express';
import { WebSocketServer } from 'ws';
import { Subject } from "rxjs"


function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}

export function create_server({
    port = process.env.PORT || 30033
} = {}) {
    const app = express();

    app.use(express.json());
    app.use(cors());

    const wss = new WebSocketServer({ noServer: true });

    let consumers = []
    let consumer_count = 0
    let message_from_client$ = new Subject()
    let message_to_client$ = new Subject()

    wss.on('connection', async (ws) => {
        let id = `consumer-${++consumer_count}`
        console.info("τ Server: A new client connected")
        
        ws.send(JSON.stringify({ 
            type: "connection.complete"
        }))
        consumers.push({ ws, id })

        ws.on("message", message => {
            let data = parse_message(message)
            message_from_client$.next(data)
        })
        
        ws.on("close", () => {
            consumers = consumers.filter(c => c.id !== id)
        })
    })

    message_to_client$.subscribe(data => {
        for (let consumer of consumers) {
            consumer.ws.send(JSON.stringify(data))
        }
    })

    const server = app.listen(port, () => {
        console.log(`τ Server running on port ${port}`);
    });

    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });


    app.get('/', (_req, res) => {
        res.send('ok');
    });

    return {
        server,
        message_from_client$,
        message_to_client$
    }
}