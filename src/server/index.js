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

    let models = []
    let clients = []
    let message_from_client$ = new Subject()
    let message_from_model$ = new Subject()

    wss.on('connection', async (ws, request) => {
        let { url } = request
        
        if (url === "/model") {
            models.push(ws)
            ws.send(JSON.stringify({ type: "connection.complete" }))
            if (process.env.TAU_LOGGING > 0) console.log("τ Server: A model connected");
            ws.on("message", message => {
                let data = parse_message(message)
                for (let client of clients) client.send(JSON.stringify(data))
            })
            ws.on('close', () => {
                console.log("τ Server: A model disconnected");
                models = models.filter(m => m !== ws)
            });
            return
        }

        if (url === "/client") {
            clients.push(ws)
            ws.send(JSON.stringify({ type: "connection.complete" }))
            if (process.env.TAU_LOGGING > 0) console.log("τ Server: A client connected");
            ws.on("message", message => {
                let data = parse_message(message)
                for (let model of models) model.send(JSON.stringify(data))
            })
            ws.on('close', () => {
                console.log("τ Server: A client disconnected");
                clients = clients.filter(c => c !== ws)
            });
            return
        }

        ws.send(JSON.stringify({type: "error", message: "must connect to /model or /client"}))
        ws.close()
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
        res.json({
            status:'ok',
            models_connected: models.length,
            clients_connected : clients.length
        });
    });

    function close(){
        server.close()
    }
    return {
        message_from_client$,
        message_from_model$,
        close,
    }
}