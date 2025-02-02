/**
 * Create a new session.
 * @param {string} [options.voice="sage"] - The voice to use if audio output is enabled and compatible with the selected model.
 */
export declare function Tau(options: {
    audio?: boolean,
    documents?: any[],
    instructions: any,
    logging?: boolean,
    mini?: boolean,
    temperature?: number,
    tools?: any[],
    tool_choice?: string,
    tutorial?: any,
    voice?: string
  }): Promise<void>;
  