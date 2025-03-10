import delay from "delay"
import { TauWebsocketContext, useTauWebsocket } from "./etc.js"
import { useEffect, useRef, useState } from "react"
import { Subject } from "rxjs"

export function TauWebsocketProvider ({
    children,
    websocket_url = import.meta.env.VITE_WS_URL ?? `ws://localhost:30033`,
    ws_reconnect_timeout = 500
}) {
    let ws_ref = useRef(null)
    let [ws_connection_enabled, set_ws_connection_enabled] = useState(false)
    let [ws_connected, set_ws_connected] = useState(false)
    let [ws_connecting, set_ws_connecting] = useState(false)
    let [messages, set_messages] = useState([])
    let message$ = useRef(new Subject())
    let connection_enabled_ref = useRef(false)
    let connection_attempts = useRef(0)

    async function handle_message(data) {
        set_messages(messages => [...messages, data])
        message$.current.next(data)
        
    }

    async function reset() {
        set_messages([])
    }

    async function connect_websocket() {
        if (ws_connecting) return
        await delay(connection_attempts.current * ws_reconnect_timeout)
        if (!connection_enabled_ref.current) return
        connection_attempts.current++
        set_ws_connecting(true)
        let ws = new WebSocket(websocket_url);
        
        ws.onmessage = (event) => {
            let data = JSON.parse(event.data);
            if (data.type === "connection.complete") {
                ws_ref.current = ws
                set_ws_connected(true)
                set_ws_connecting(false)
                return
            }
           
            handle_message(data)
        };

        ws.onerror = (event) => {
            console.error("A websocket error occurred", event, event.message);
        };

        ws.onclose = (_event) => {
            set_ws_connected(false)
            set_ws_connecting(false)
            ws_ref.current = null
        };

        return ws;
    }

    useEffect(()=>{
        connection_enabled_ref.current = ws_connection_enabled
    }, [ws_connection_enabled])

    
    function close_websocket() {
        let ws = ws_ref.current
        set_ws_connected(false)
        if (ws) {
            ws.onclose = null;
            ws.onmessage = null;
            ws_ref.current = null
            ws.close();
        }

    }

    function send(data) {
        let ws = ws_ref.current
        if (ws) return ws.send(JSON.stringify(data))
    }

    useEffect(() => {
        if (!ws_connection_enabled) return close_websocket()
        if (ws_connected) return
        if (ws_connecting) return
        connect_websocket();
        return () => close_websocket()
    }, [ws_connection_enabled, ws_connected, ws_connecting]);

    
    return (
        <TauWebsocketContext.Provider value={{
            ws_connection_enabled,
            set_ws_connection_enabled,
            connect_websocket,
            handle_message,
            ws_connected,
            reset,
            send,
            messages,
            message$,
        }}>
            {children}
        </TauWebsocketContext.Provider>
    )
}

export function WebsocketDebugMessageHelper({
    messages = [],
    output_speed_ms = 10
}) {
    let { handle_message, ws_connected, reset } = useTauWebsocket()
    let message_index_ref = useRef(0)
    useEffect(()=>{
        if (!ws_connected) {
            message_index_ref.current = 0
            reset()
            return
        }
        let interval = setInterval(function(){
            let message_index = message_index_ref.current
            let message = messages[message_index] 
            if (!message) {
                clearInterval(interval)
                return
            }
            handle_message(message)
            console.info("Sending debug message", message_index_ref.current, "of", messages.length)
            message_index_ref.current += 1

        }, output_speed_ms)
        return ()=>clearInterval(interval)
    },[ws_connected])
    return null
}