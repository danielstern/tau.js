class Session {
  async user(message: string, await_response?: boolean): Promise<void | "string">
  async system(message: string, await_response?: boolean): Promise<void | "string">
  // async user(message: string, await_response?: boolean): Promise<void | "string">
  // async user(message: string): Promise<void>
  async response(options?: any): Promise<any>
  public compute_time: String
  public usage: String
}
/**
 * Create a new session.
 * @param {string} [options.voice="sage"] - The voice to use if audio output is enabled and compatible with the selected model.
 * @param {string} [options.api_key] - An API key is required. Specify when creating a session or globally with the `OPENAI_API_KEY` environment variable.
 */
export declare function create_session(options: {
  api_key?: string,
  audio?: boolean,
  instructions: string,
  mini?: boolean,
  temperature?: number,
  tools?: any[],
  tool_choice?: "required" | "auto" | "none",
  voice?: string
}): Promise<Session>;
