export class SessionResponse {
  name: string;
}

export class ResponseArguments {
  conversation: "auto" | "none";
  tools: any[];
  tool_choice?: "required" | "auto" | "none";
  instructions: string;
  inputs : any[];
}

/**
 * Stateful real-time assistant session.
 */
export class Session {
  /**
   * Add a text user message to the session.
   * @param message 
   */
  async user(message: string): Promise<void> {}
  async system(message: string): Promise<void> {}
  async assistant(message: string): Promise<void> {}
  async response(options?: ResponseArguments): Promise<SessionResponse> {}
  async cancel_response():Promise<void> {}
  async delete_conversation_item(item_id : string):Promise<void> {}

  public compute_time: string;
  public usage: string;
  public conversation: any[];
  public is_working: boolean;
}

/**
 * Create a new real-time session.
 * @param {Object} options - Configuration options for the session.
 * @param {string} [options.api_key] - API key for authentication.
 * @param {boolean} [options.audio] - Enable audio output.
 * @param {string} options.instructions - Instructions for the assistant.
 * @param {boolean} [options.mini] - Run in mini mode.
 * @param {number} [options.temperature] - Temperature setting for responses.
 * @param {any[]} [options.tools] - List of tools.
 * @param {"required" | "auto" | "none"} [options.tool_choice] - Tool selection mode.
 * @param {"alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse"} [options.voice] - Voice selection.
 */
export declare function create_session(options: {
  api_key?: string;
  audio?: boolean;
  instructions: string;
  mini?: boolean;
  temperature?: number;
  tools?: any[];
  tool_choice?: "required" | "auto" | "none";
  voice?: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
}): Promise<Session>;
