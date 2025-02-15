/**
 * Library for working with realtime AI models.
 */
declare module "tau"

/**
 * Default 4o and 4o-mini voices.
 */
type Voice = "alloy" | "ash" | "ballad" | "coral" | "echo" | "shimmer" | "sage" | "verse"
type ToolChoice = "required" | "auto" | "none" | { type: "function", name: string }
type Instructions = string | ""
type Temperature = number
type Model = "4o" | "4o-mini"
type Modalities = ["text"] | ["text", "audio"]
type ApiKey = string
type Name = string
type Conversation = "auto" | "none"
type Metadata = any
type ConversationItem = any

interface ResponseOptions {
    /**
     * Which conversation to create the message in.
     * 
     * There are only two options, `auto` or `none`:
     * - `auto` creates the response in the default conversation. the model will remember that it responded and that response will influence its future output.
     * - `none` the response isn't added to any conversation, and while you can still hear/read the output, the model will not remember saying it, and the response won't influence future responses.
     */
    conversation?: Conversation,

    /**
     * Tools (functions) that the model should use when generating this response. Doesn't override previously supplied tools, but the model will be more inclined to use tools included in the response request.
     */
    tools?: Tool[],

    /**
     * Guidance for which tools to use when responding.
     */
    tool_choice?: ToolChoice,

    /**
     * Value between 0.6-1.2. Specifying higher temperature values results in more random output.
     */

    temperature?: Temperature,

    /**
     * Guidance on how to generate the current response.
     * 
     * Works somewhat like a system message.
     * 
     * If not specified, the instructions specified when creating the session will be used. If none were specified, the model's default instructions, will be used.
     * 
     */
    instructions?: Instructions,

    /**
     * An array of conversation items to be used as the conversation up until that point.
     * 
     * Specifying this argument effectively ignores all messages in the default conversation. Leaving this undefined effectively uses the existing messages in the default conversation as the `input.`
     */
    input?: ConversationItem[],

    /**
     * Custom metadata to attach to the response request.
     */
    metadata?: Metadata

}

interface TurnDetection {
    /**
     * The turn detection algorithm to use (only `server_vad`) is supported.
     */
    type: "server_vad",
    /**
     * How loud the volume of the input needs to be to activate the model. 
     * 
     * A higher number means that more volume is needed to activate the model. Defaults to 0.5.
     */
    threshold: number,
    /**
     * Works in conjunction with `threshold` to prevent the very beginning of user supplied audio from being cut off.
     * 
     * Extends the beginning of the block of speech to be processed backwards by the specified amount of time. Allows the model to pick up quiet sounds at the beginning of words without needing to lower the threshold.
     * 
     * Example: The word *slight.* The *s* at the start of *slight* is quiet. Slight only gets loud in the middle so if the you couldn't extend the beginning of the window earlier the recording would only pick up "-light" or "-ight".
     */
    prefix_padding_ms: number,
    /**
     * After some voice input, the subsequent amount of silence required before the server starts to generate a response automatically.
     * 
     * A high value results in a longer delay before the model begins talking, increasing perceived latency, but the model will interrupt the user less frequently.
     * 
     * A low value results in less latency before the model begins responding, but the model may tend to "cut in", interrupting the user.
     */
    silence_duration_ms: number,
    /**
     * If this is enabled, the server will commit the audio buffer automatically and generate a response whenever it detects voice input.
     * 
     * If it's not enabled, the server will still automatically commit the buffer, but generating the response will need to be handled manually.
     */
    create_response: boolean

}
interface Tool {
    /**
     * Name of the function or other tool.
     */
    name: string
    /**
     * Type of tool to use. Only `function` is directly supported.
     * 
     */
    type: "function" // | "file_search" | "code_interpreter",
    description: string,
    parameters: {
        /**
         * The type of input accepted by the function.
         * 
         * Only `object` is currently supported.
         */
        type: "object",
        properties: {
            [key: string]: {
                type: "string" | "number", // possibly others?
                description: string,
                examples: string[]
            }
        },
        /**
         * Names of arguments which the model is always expected to include in calls to this function.
         */
        required: string[]
    }
}

export interface Session {
    /**
     * Creates a new conversation item with the role `user` using provided string as content. 
     */
    async user(message: string): Promise<ConversationItem>

    /**
    * Creates a new conversation item with the role `assistant` using provided string as content. 
    */
    async assistant(message: string): Promise<ConversationItem>

    /**
    * Creates a new conversation item with the role `system` using provided string as content. 
    * 
    * Equivalent to creating a developer or system message.
    */
    async system(message: string): Promise<ConversationItem>

    /**
     * Creates a new conversation item with the role `user` and the provided audio bytes as content.
     */
    async create_audio(bytes: string): Promise<ConversationItem>

    /**
    * Appends the audio bytes to the audio input buffer.
    * 
    * This is different from `create_audio` as it does not create a conversation item. Instead, a conversation item will be created when the buffer is committed. If turn detection is enabled, the buffer will be committed automatically.
    */
    async append_input_audio_buffer(bytes: string): Promise<void>


    /**
    * Commits all the audio in the audio input buffer, creating a conversation item.
    * 
    * If turn detection is enabled, the buffer will be committed automatically.
    */
    async commit_input_audio_buffer(): Promise<void>

    /**
    * Cancels an in-progress response.
    */
    async cancel_response(): Promise<void>

    /**
     * Deletes a conversation item from the default conversation.
     * 
     * `item_id` can be retrieved from the `ConversationItem` object returned by the `user`, `assistant`, `system` and `create_audio` methods.
     */
    async delete_conversation_item(item_id): Promise<void>


    /**
    * The model generates a new assistant message (response) and adds it to the conversation.
    * 
    * The default conversation can only have one response being generated at a time, but multiple can be generated at once if the conversation is set to "none".
    * 
    */
    async response(response_options?: ResponseOptions): Promise<Response>

    /**
    * Ends the session and closes all associated websockets.
    */
    close(): void

    /**
     * Returns the name of the session (for debugging purposes.)
     */
    name: string

    /**
     * Details of the current session.
     */
    session: SessionDetails

    /**
     * Accumulated token usage and cost for the session. 
     */
    usage: UsageData

    /**
     * The websocket object currently connected to the model.
     * 
     * Use for very low-level debugging, making plugins, implementing features, etc. 
     */
    ws: WebSocket

    /**
     * An observable which sends along any data sent from the remote server.
     * 
     * Used for debugging, creating plugins, etc.
     * 
     * Usage: `event$.subscribe(handler)`
     */
    event$: Observable<any>

    /**
     * An observable which fires whenever the server generates a response. The data is pre-processed and contains usage information.
     * 
     * Useful for when turn detection is enabled and you're not calling `response` directly.
     * 
     * Usage: `response$.subscribe(handler)`
     */
    response$: Observable<Response>
}

/**
 * Creates a new real-time model session. This opens a persistent websocket connection to the model endpoint, returning an object which can be used to interact with the session.
 * 
 * This is equivalent to opening a new websocket connection then calling `session.update` with the same options.
 */
export declare async function create_session(
    /**
     * Default options for creating a session. These options are passed as arguments with `session.update` to the model before the promise resolves.
     */
    session_options: {
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
        tool_choice?: ToolChoice

        /**
         * Specify an array of tools which are available to your model, typically functions that you define. 
         * 
         * Functions are the only category of tool explicitly supported by this API. 
         * 
         */
        tools?: Tool[]

        /**
         * Enables turn detection.
         * 
         * Turn detection allows the server to generate and cancel responses automatically when reacting to user voice input.
         * 
         * When enabled, the server will continually monitor the voice input buffer. After the user speaks and after a specified silence duration, the model will automatically commit the buffer and generate a response.
         */
        turn_detection?: TurnDetection

        /**
         * Specify whether to return text and audio, or just text.
         * 
         * Accepted values are `["text"]` or `["text","audio"]`.
         * Returning only audio is not supported.
         */
        modalities?: Modalities
    },
    /**
     * Options when creating the session related to configuration and debugging.
     */
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
        model?: Model,
        /**
         * Optional session identifier for debugging purposes.
         */
        name?: Name,
        /**
         * If enabled, the session will connect to the debug server. This can be used to listen to and debug session voice output in real time.
         * - Install the debug server with `npm install -g @tau-js/cli
         * - Run the debug server with `tau debug start`
         */
        debug?: boolean
    })
    : Promise<Session>;