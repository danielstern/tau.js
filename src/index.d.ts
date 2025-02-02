// declare module "tau"

class Session {
    async user(message: string) : Promise<void>
    async response(options? : any) : Promise<any>
    public compute_time : String
  }
  /**
   * Create a new session.
   * @param {string} [options.voice="sage"] - The voice to use if audio output is enabled and compatible with the selected model.
   */
  export declare function create_session(options: {
      audio?: boolean,
      // documents?: any[],
      instructions: any,
      // logging?: boolean,
      mini?: boolean,
      temperature?: number,
      tools?: any[],
      tool_choice?: string,
      tutorial?: any,
      voice?: string
    }): Promise<Session>;
    