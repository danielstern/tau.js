export enum Role {
  user = "user",
  assistant = "assistant",
  system = "system"
}

export enum ResponseAudioVoice {
  alloy = "alloy",
  ash = "ash",
  ballad = "ballad",
  coral = "coral",
  echo = "echo",
  shimmer = "shimmer",
  sage = "sage",
  verse = "verse"
}

// export enum ToolChoice {
//   required = "required",
//   auto = "auto",
//   none = "none"
// }


export enum Conversation {
  auto = "auto",
  none = "none"
}

export class ToolParameters {
  // todo...
}

//  *  * ![Tool Description](https://cdn.stability.ai/assets/org-CY0mEQ8ayEQ9WMXa4RneLqgq/00000000-0000-0000-0000-000000000000/d89f57b5-2a61-4312-9d71-f22c70c2f578)
export class Tool {
  type : "function" | "code_interpreter" | "file_search"
  name : string
  /**
   * Instructions for how to use and when to call the function.
   * This description is interpreted directly by the model.
   * 
   * **Examples**: 
   * - Call this function to respond to a prompt.
   * - Call this function to output your current progress on this task.
   */
  description : string
  parameters: ToolParameters
}

export class SessionResponse {
  name: string
}

/**
 * 
 */
export class ResponseArguments {
  conversation: Conversation
  tools: Tool[]
  /**
   * Influences whether the model responds with a text/audio message, a function call, or both.
   * - `auto` is the default value and will try to use the instructions and interpretation of the user input to determine whether to call a function or not. Possibly slower.
   * 
   */
  tool_choice?: "auto" | "required" | "none"
  instructions: string
  audio: boolean
  inputs : any[]
}

export class ConversationItemContent {
  type : "input_text" | "text"
  text : string
}

export class ConversationItem {
  id : string
  object : "realtime.item"
  type : string
  status : "completed" | "in_progress"
  role : Role
  content : ConversationItemContent
}
/**
 * A cool session.
 */
export class Session {
  close():void {}
  async user(message: string): Promise<void> {}
  async system(message: string): Promise<void> {}
  async assistant(message: string): Promise<void> {}
  async response(options?: ResponseArguments): Promise<SessionResponse> {}
  async cancel_response():Promise<void> {}
  async delete_conversation_item(item_id : string):Promise<void> {}

  public compute_time: string;
  public usage: string;
  public is_working: boolean;
}

// /**
//  * Create a new real-time session.
//  * @param {Object} options - Configuration options for the session.
//  * @param {string} [options.api_key] - API key for authentication.
//  * @param {boolean} [options.audio] - Enable audio output.
//  * @param {string} options.instructions - Instructions for the assistant.
//  * @param {boolean} [options.mini] - Run in mini mode.
//  * @param {number} [options.temperature] - Temperature setting for responses.
//  * @param {any[]} [options.tools] - List of tools.
//  * @param {ToolChoice} [options.tool_choice] - TODO.
//  * @param {ResponseAudioVoice} [options.voice] - TODO.
//  */

export class CreateSessionOptions {
  api_key?: string;
  audio?: boolean;
  instructions: string; // TODO : do default instructions save money or at least save on caching?
   /**
   * If true, the default mini (20m+ parameters) realtime model will be used. Otherwise, the default full-sized (200m+ parameters) will be used.
   * Mini performs slightly faster but the main advantage is that mini has a much lower cost, usually about 75%-80% cheaper.
   * 
   * As a general rule, if mini can't perform a task, then the full-sized model, if able to perform it at all, will do so slowly and inconsistently.
   */
  mini?: boolean;
  temperature?: number;
  // tools?: any[];
  // tool_choice?: ToolChoice;
  voice?: ResponseAudioVoice;
  // conversation: Conversation
  tools: Tool[]
  /**
   * Influences whether the model responds with a text/audio message, a function call, or both.
   * - `auto` is the default value and will try to use the instructions and interpretation of the user input to determine whether to call a function or not. Possibly slower.
   * 
   */
  tool_choice?: "auto" | "required" | "none"
  // instructions: string
  // audio: boolean
  // inputs : any[]
}

/**
 * It's quite something.
 */
export declare function create_session(options: CreateSessionOptions): Promise<Session>;
