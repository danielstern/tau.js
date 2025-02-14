/**
 * It's heckin cool.
 */
declare module "tau"

/**
 * Default 4o and 4o-mini voices.
 */
type Voice = "alloy" | "ash" | "ballad" | "coral" | "echo" | "shimmer" | "sage" | "verse"
type ToolChoice = "required" | "auto" | "none" | { type : "function", name : string }
type Instructions = string | ""
type Temperature = number
type Model = "4o" | "4o-mini"
type Modalities =  ["text"] | ["text","audio"] 
type ApiKey = string
type Name = string
interface TurnDetection {
    type : "server_vad",
    threshold: number,
    prefix_padding_ms : number,
    silence_duration_ms : number,
    create_response : boolean

}
interface Tool {
    /**
     * Name of the function or other tool.
     */
    name : string
    /**
     * Type of tool to use. Only `function` is direclty supported.
     * 
     */
    type : "function" // | "file_search" | "code_interpreter",
    description : string,
    parameters : {
        /**
         * The type of input accepted by the function.
         * 
         * Only `object` is currently supported.
         */
        type : "object",
        properties : {
            [key : string] : {
                type : "string" | "number" , // possibly others?
                description : string,
                examples : string[]
            }
        },
        /**
         * Names of arguments which the model is always expected to include in calls to this function.
         */
        required : string[]
    }
}

/**
 * 
 */
export type Session = {}
/**
 * Create a new real-time model session.
 */
export declare async function create_session(session_options: {
    /**
     * Identifier of the voice with which to output audio.
     * 
     * Leave undefined to use the model's default voice.
     * 
     * *Voice can't be changed after a session is initialized.*
     */
    voice?: Voice

    /**
     * Default instructions. Instructions are passed to the model when each response is created. Instructions function somewhat like system prompts.
     * 
     * Pass an empty string to use no instructions, or leave undefined to use the model's default instructions.
     */
    instructions?: Instructions

    /**
     * Model temperature between 0.6-1.2.
     * 
     * The higher the model temperature, the less deterministic its response will be.
     * 
     * Might also improve performance at lower values since, at lower temperatures, the model has fewer plausible routes to investigate.
     * 
     */
    temperature?: Temperature

    /**
     * Specifies a default value for whether the model should attempt to call a function or use another tool when generating a response.
     * 
     * - `auto (default)` the model will choose whether to use a tool.
     * - `required` the model should attempt to use a tool.
     * - `none` the model should attempt to use a tool.
     * 
     * You can also specify a specific tool to use (only function types are supported):
     * - `{ type : "function", name : string }`
     * 
     * *This should be considered guidance for the model rather than hard rules as the model will sometimes ignore the tool_choice parameter.*
     */
    tool_choice? : ToolChoice

    /**
     * Specify an array of tools which are available to your model, typically functions that you define. 
     * 
     * Functions are the only category of tool explicitly supported by this API. 
     * 
     */
    tools? : Tool[]

    /**
     * 
     */
    turn_detection? : TurnDetection

    /**
     * Specify whether to return text and audio, or just text.
     * 
     * Accepted values are `["text"]` or `["text","audio"]`.
     * Returning only audio is not supported.
     */
    modalities? : Modalities
},
    tau_options: {
        /**
         * Specify the API key to use for this particular session.
         * 
         * If none is provided, the OPENAI_API_KEY environment variable will be used instead.
         */
        api_key?: ApiKey
        
        /**
         * Specify the model to use for the session.
         * 
         * Currently supported models are: **4o (default)**, **4o-mini.**
         * 
         * - **4o:** Highly reliable with nuanced voice and logic. 200 million parameters. High usage cost.
         * - **4o-mini:** Very inexpensive but random, unreliable and primitive. 20 million parameters.
         */
        model?: Model = "4o",
        /**
         * Optional session identifier for debugging purposes.
         */
        name?: Name,
        /**
         * If enabled, the session will connect to the debug server. This can be used to listen to and debug session voice output in real time.
         * - Install the debug server with `npm install -g @tau-js/cli
         * - Run the debug server with `tau debug start`
         */
        debug? : boolean
        /**
         * The debug server will not automatically generate a response whenever user voice input is received.
            // TODO... VAD mode??
         */
        autorespond? : boolean
    })
    : Promise<{
        /**
         * Ends the session and closes all associated websockets.
         */
        close(): void
    }>;