import { createContext, useContext } from "react";

export const TauWebsocketContext = createContext()
export const useTauWebsocket = () => useContext(TauWebsocketContext)