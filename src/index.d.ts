class SessionResponse {
  name : string
}
/**
 * Stateful realtime assistant session.
 */
class Session {
  async user(message: string): Promise<void>
  async system(message: string): Promise<void>
  async assistant(message: string): Promise<void>
  async response(options?: any): Promise<SessionResponse>
  public compute_time: String
  public usage: String
  public conversation: any[]
  public is_working: boolean
}
/**
 * Create a new realtime session.
 * @param {string} [options.voice] - The voice to use if audio output is enabled and compatible with the selected model.
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
  voice?: "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse"
}): Promise<Session>;
