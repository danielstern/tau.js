// export interface 
export declare interface TauServer {
    /**
     * Subscribers to message_from_client$ will be called whenever a front-end application connected to the websocket send a message to the server.
     */
    message_from_client$ : Subject<any> // (rxjs subject)
    message_to_client$ : Subject<any>
}

/**
 * Creates a fast, simple websocket server suitable for production.
 */
export declare function create_server(
    server_options : {
        /**
         * Specifies the port the server should listen on.
         */
        port : string
    }
) : TauServer