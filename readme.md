<img style="margin-bottom:12px" src="https://storage.googleapis.com/owned-io-public-files/images/tau-logo.png">


<img src="https://img.shields.io/badge/License-MIT-steelblue"><img src="https://img.shields.io/badge/version-alpha-orange"><img src="https://img.shields.io/badge/node-18.20.4-darkgreen">
<div style="margin-bottom:20px"></div>

# tau.js <img width=20px src="https://favicon-generator-1041699091324.us-central1.run.app/icon"> 
*The Easy and Intuitive Way to Work with Realtime AI Voice Models!*
### What is `tau.js`
`tau.js` is a node library that greatly simplifies the Websocket API used to communicate with realtime AI models like `4o-realtime`, and adds essential features like realtime voice debugging.

With `tau.js`, Starting a session and generating a voice response is as simple as:

```javascript
import { create_session } from "@tau/core"

let session = await create_session()
await session.system("Whenever prompted to respond, state a different teaching of the Sun Tzu.")
await session.response()

// "The supreme art of war is to subdue the enemy without fighting."
```
## Why Use `tau.js`?
`tau.js` greatly reduces ramp-up time when building applications with OpenAI's `4o-realtime` and `4o-mini-realtime` models. 
### Simple Async/Await Interface
Realtime AI sessions are based on Websockets. This is very good, as websockets are extremely fast and they're a critical part of delivering a fast user experience. But Websockets are hard to develop for and tend to create messy code that can't be maintained.

`tau.js` solves this problem by black-boxing away all websocket logic and instead providing a dead-simple `async/await` API with which to build powerful realtime apps.


### Cost Estimation
Tau computes total usage costs for sessions by using usage data returned from responses combined with publicly available pricing data for supported APIs. Tau cost computation turns opaque token counts into one salient cost number which assists in managing development costs and planning deployment costs.


```javascript
// example usage data
{
    computed: { total_usage_cost: 0.07504 },
    tokens: {
        realtime_input_text_tokens: { tokens: 520, cpm: 5, usage_cost: 0.0026 },,
        realtime_output_audio_tokens: { tokens: 458, cpm: 80, usage_cost: 0.03664 }
  }
}
```

**Computed usage cost is an estimate** and is likely to differ somewhat from actual usage costs incurred.

### Sophisticated Debug Server
One of the most difficult parts of getting started with realtime audio is handling and processing PCM audio data. 
`tau.js` includes a UI where you can...
- **Listen to incoming audio in real time**
- **Input voice and get responses in realtime**
- Review usage data

<a href="https://owned.io/tau/debugger/" target="_blank">
<img  src="https://storage.googleapis.com/owned-io-public-files/images/2025-02-12%2006_51_21-tau.js%20debugger.png">
</a>


## Quick Start Guide
Developing with Realtime AI Models is simple and easy with `tau.js`. You can be conversing with your model in short order by following these steps:
1. Install `tau.js`
```
npm install -g @tau-js/core @tau-js/cli
```

2. Start the `debug` server
```
tau debug start
```

3. Create a session and start working in realtime with AI!
```javascript
import { create_session } from "@tau-js/core"

let session = await create_session({
    instructions : "You're a wise, worldly assistant who is always looking out for the user.",
    modalities : ["text","audio"]
    temperature : 0.69,
    voice: "verse"
}, {
    model : "4o",
    debug: true
})

await session.system("Speak in a tough, brassy, raspy, confident, assured, deep Scottish brogue.")
await session.user("Why did Napoleon lose the battle of Waterloo?")
await session.response({
    conversation : "none",
})
```

## Understanding and Using the Debug Server + UI

The most challenging part of getting up-and-running when working with real-time voice models is handling voice input and decoding and playing voice output.

The Debug Server + UI makes this usually difficult process simple and easy:

```sh
npm install -g @tau-js/cli
tau debug start
```

This will start a local debug server, as well as open the debug UI at <a href="https://owned.io/tau/debugger/">https://owned.io/tau/debugger</a>.  

In order to enable audio playback and microphone access, you need to click on the debugger UI. 

The debug UI is still in development. You'll be able to run the debug UI locally, if desired, as part of future releases. You can still use `tau.js` without the debugger if you want an entirely localized experience.

Enable debug output from a tau session by passing `{ debug : true }` (see examples) or by setting the following environment variable:

```
# If enabled, sessions will automatically connect to debug server
TAU_DEBUG=true
```

## Examples
### Example: Creating a Simple Realtime Translator
The example below is very simple but creates an effective and very fast universal translator. You can even specify how you want your translator to speak. 
If you provide voice input to a translator like this, it will match the user's emphasis and tone of voice.
```javascript
import { create_session } from "@tau-js/core"
let session = await create_session({
    instructions : "You are translation assistant. Translate all user input.",
    modalities : ["text", "audio"],
    voice : "ash",
},{
    debug : true,
})

await session.system("Translate user input into German. Speak in a friendly voice, loudly and clearly annunciating.")
await session.user("Excuse me, is this where I catch the train to the airport?")
await session.response()
// Entschuldigen Sie, ist das hier der Ort, wo ich den Zug zum Flughafen nehmen kann?
```

### Example: Creating a Dramatic Vocaloid
Realtime voice models (vocaloids) can produce surprisingly powerful and emotionally compelling audio. 

```javascript
import { create_session } from "@tau-js/core"
import { audio_promise, save_deltas_as_wav } from "@tau-js/utility"

let session = await create_session({
    modalities : ["text", "audio"],
    instructions: "You are a dramatic acting vocaloid.",
    voice: "ash"
}, {
    model : "4o",
    debug: true
})

await session.system("Repeat after the user.")
await session.system("Speak in a deep, raspy, brassy, assured Scottish brogue.")
for (let line of [
    "**SOFTLY, ARROGANTLY** I've seen things you people wouldn't believe. **DISMISSIVELY** Hmph.",
    "**EXCITED, FRIENDLY** Attack ships on fire off th'shoulder of Orion!",
    "**SADLY** I watched C-beams... glitter in the dark near the Tannhäuser Gate!",
    "**SADLY, CRYING, NOSTALGIC, WITH DRAMATIC TIMING** All those... moments will be lost... in time, like **CLEARS THROAT** tears... in rain.",
    "**CALMLY, ACCEPTING** Time... to die."
]) {
    await session.user(line)
    let response = await audio_promise(session)
    save_deltas_as_wav(response.audio_deltas)
}

console.info(session.usage)
session.close()
```
[Listen to the output 🔊🤯](https://storage.googleapis.com/owned-io-public-files/images/voice-1739534240862.wav)
<!-- <audio controls src="https://storage.googleapis.com/owned-io-public-files/images/voice-1739533651706.wav"></audio> -->

### Example: Language Tutor
This tutor will patiently work with any student to learn any target phrase in any known language. 

The tutor is able to listen to the user's pronunciation and provide customized and very helpful feedback.



```javascript
import { create_session } from "@tau-js/core"

let target_language = "Japanese"
let target_phrase = "Two is enough, really!"

let tutor = await create_session({
    instructions : `You're a friendly, helpful language tutor who is helping the user learn the ${target_language} language. Assume they have no previous knowledge of the target language. Speak all instructions in English. Your task is to help the user improve their pronunciation of the target phrase.`,
    modalities : ["text","audio"],
    temperature : 0.69,
    voice: "ash",
    turn_detection : {
        type : "server_vad",
        silence_duration_ms : 800
    }
    
}, {
    model : "4o-mini",
    debug: true
})

await tutor.system(`The target phrase is: '${target_phrase}'. The target language is ${target_language}`)
await tutor.system("Speak the target phrase in English. Then translate the target phrase into the target language and repeat it once. Finally, ask the user to speak the phrase 2-3 times.")

await tutor.response()
await tutor.system(`
    The user will now speak the target phrase. If the user's input is not clear enough to interpret, ask them to repeat themselves more clearly.

    Identify **one** area of the user's pronunciation to improve upon (don't overwhelm the user with multiple pieces of feedback at once), instruct the user on how to improve, and ask them to repeat the target phrase again. Always end your response by repeating the target phrase.

    Then, identify a **different** area of pronunciation to improve upon. and repeat the above process.

    Never conclude the conversation or change the target phrase. The goal is refine the target phrase to perfection and beyond.
`)

// Your pronunciation is quite good! Let's focus on the pitch accent for the word 「十分」 (jūbun). Make sure to emphasize the first syllable, "jū," and keep the second syllable, "bun," softer. This way, the word flows naturally and clearly. Please try saying the phrase again: 「二つで十分だよ！」🍜🍜🍜
```

### Example: Function-calling Assistant
This interesting example implements a real-time assistant which helps the user with simple tasks around the home.
- The `silence_duration_ms` parameter dictates how long the model waits before responding. If this value is too high, then the model seems slow and unresponsive. But if it's too low, the model will cut in and interrupt the user, which is even worse. However, when combined with non-vocalizing, function-calling models, a short time works very well. 
- **Combining voice output with function calling in a single model works inconsistently, at best**. Vocaloids (voice-producing models) tend to get "in" to their roles after a few responses. Calling functions confuses them and results in suboptimal output for both voice and function calls. It's better to use multiple sessions, as in the below example.

```javascript
import { create_session } from "@tau-js/core"

let name = `Rachel`

let assistant = await create_session({
    instructions : `You're an automated function calling unit designed to assist the user in household activities. Your name is ${name}.`,
    modalities : ["text"],
    temperature : 0.65,
    turn_detection : {
        type : "server_vad",
        silence_duration_ms : 200
    },
    tools : [
        {
            name : "pass",
            type : "function",
            description : "Call this method by default when you fail to detect BOTH your name and the command in the user's input."
        },
        {
            name : "turn_lights_on",
            type : "function",
            description : "Call this method when the user asks you to turn the lights on."
        },
        {
            name : "turn_lights_off",
            type : "function",
            description : "Call this method when the user asks you to turn the lights off."
        },
        {
            name : "you_are_welcome",
            type : "function",
            description : "Call this method to acknowledge when the user thanks you."
        },
    ],
    tool_choice : "required"
   
}, {
    model : "4o",
    debug: true
})

await assistant.system(`Listen to the user's speech. The user may issue a command at any given time. If the user speaks your name in full, then speaks a command compatabile with an available function, call that function.`)

let assistant_vocaloid = await create_session({
    instructions : "You are the voice output model for another model.",
    modalities : ["text","audio"],
    voice : "shimmer"
},{
    model : "4o",
    debug : true,
    debug_voice_in : false
})

await assistant_vocaloid.system("Speak in a friedly, confident, refined british accent.")

assistant.response$.subscribe(async data => {
    console.info()
    let name = data.function_call.name
    console.info(`Calling function`, name)

    if (name === "you_are_welcome") {
        await assistant_vocaloid.system("Please say, 'You're most welcome!'")
        await assistant_vocaloid.response()
    }
})

// "I'm kinda tired."
// > pass
// "Rachel, can you turn the lights off please?"
// > turns_lights_off (in under 900ms)
// "Thank you, Rachel."
// > "You are most welcome!" 🤯🤯🤯
```
### Example: Ensemble Performance
In the following multi-vocaloid example, three different vocaloids perform a scene with their own unique accents.
The output of each vocaloid is passed to the others, giving the models the ability to "play off" each other and create interesting, engaging and entertaining **live** performances.
Other than creating the vocaloids, which should be done in sequence to prevent 429 errors, all inter-vocaloid communication can be handled in parallel, meaning that a program like this can scale to any number of players with no performance decrease.
```javascript
import { create_session } from "@tau-js/core";
import { audio_promise } from "@tau-js/utility"

let instructions = "You are a comedic vocalizer unit. Read your line exactly as provided."

/**
 * Note that while it is tempting to create all the session in parallel, this can result in a 429 too many requests, so it's more consistent to create them one at a time. 
 */
let players = {
    brian : await create_session({voice : "ash",instructions}),
    passerby : await create_session({voice : "verse",instructions}),
    marketgoer : await create_session({voice : "ballad",instructions})
}

await players['brian'].system("Speak in in an hilarious, nervous sophisticated Liverpool accent.")
await players['passerby'].system("Speak in an hilarious cockney London accent.")
await players['marketgoer'].system("Whisper in an hilarous, maniacal Scottish brogue.")

let dialog = [
    [
        "brian",
        "Don't pass judgement on... other people or... **CLEARS THROAT** you may get judged yourself!",
        "**NERVOUSLY, IMPROVISING, PONTIFICATING**",
    ],
    [
        "passerby", 
        "What?!",
        "**DISBELIEVING**", 
    ],
    [
        "brian",
        "I said don't pass judgement on other people or *you* might get judged *too*.",
        "**HOPEFULLY, CHEERFULLY**", 
    ],
    [
        "passerby", 
        "Who, me?",
        "**HAPPILY**", 
    ],
    [
        "brian",
        "Yes!"
    ],
    [
        "passerby", 
        "Oh, thanks very much!",
        "**GIDDILY**", 
    ],
    [
        "brian", 
        "**Well, not just you. *All* of you!**", 
    ],
    [
        "marketgoer",
        "... that's a nice gourd.",
        "**CONSPIRATORILY, TIPSILY**"
    ]
]

for (let [player_name, line, direction] of dialog) {
    let player = players[player_name]
    let input = `LINE: "${line}"`
    if (direction) input = `Speak as follows: ${direction}. ${input}`
    await player.user(input)
    let response = await audio_promise(player)
    let deltas = response.audio_deltas

    /**
     * Since calling `create_audio` doesn't make any HTTP requests, it won't 429 and it's possible to do any number in parallel.
     * */
    await Promise.all(
        Object.keys(players)
            .filter(key => key !== player_name)
            .map(key => players[key])
            .map(player => player.create_audio(deltas.join("")) //todo test
    )
}

for (let player_name in players) {
    players[player_name].close()
}
```


# API Reference
# `create_session`

Creates a new real-time model session by opening a persistent websocket connection to the model endpoint. This function is equivalent to opening a websocket connection and then calling `session.update` with the same options.

## Signature

```typescript
async function create_session(
  session_options: { ... },
  tau_options: { ... }
): Promise<Session>
```

## Parameters

### `session_options`

- **`voice?`** (`Voice`):  
  Voice identifier for audio output. Leave undefined to use the default.  
  *Note: Cannot be changed after session initialization.*

- **`instructions?`** (`Instructions`):  
  Default instructions for the model (works like system prompts).  
  Use an empty string for no instructions or undefined for default instructions.

- **`temperature?`** (`Temperature`):  
  A number between 0.6 and 1.2. Higher values yield more random outputs; lower values yield more deterministic responses and may improve performance.

- **`tool_choice?`** (`ToolChoice`):  
  Guidance on whether the model should use a tool when generating a response.  
  - `"auto"` (default): Model chooses.  
  - `"required"`: Model should use a tool.  
  - `"none"`: Model should not use a tool.  
  - `{ type: "function", name: string }`: Specifies a particular function tool.

- **`tools?`** (`Tool[]`):  
  An array of available tools (functions) for the model.

- **`turn_detection?`** (`TurnDetection`):  
  Enables automatic handling of voice input via turn detection. When enabled, the server monitors the audio buffer and commits it after a defined period of silence.

- **`modalities?`** (`Modalities`):  
  Determines the output format. Acceptable values: `["text"]` or `["text", "audio"]`.  
  *Note: Only text or text with audio is supported.*

### `tau_options`

- **`api_key?`** (`ApiKey`):  
  API key for the session. If undefined, the `OPENAI_API_KEY` environment variable is used.

- **`model?`** (`Model`):  
  The model to use. Supported models:  
  - **4o (default):** Reliable with nuanced output (200 million parameters).  
  - **4o-mini:** Less reliable but cost-effective (20 million parameters).

- **`name?`** (`Name`):  
  Optional session identifier for debugging purposes.

- **`debug?`** (`boolean`):  
  If `true`, connects the session to the debug server for real-time monitoring of voice output.  
  *Usage:*  
  - Install: `npm install -g @tau-js/cli`  
  - Run: `tau debug start`

## Returns

A `Promise` that resolves to a `Session` object, which provides methods to interact with the conversation, manage audio input, generate responses, and handle debugging events.

# Session Interface

The `Session` interface provides methods and properties for interacting with a real-time AI model session. Use it to manage conversation items, handle audio input, generate responses, and access debugging tools.

## Methods

### `user(message: string): Promise<ConversationItem>`
Creates a new conversation item with the role `user` using the provided text.

### `assistant(message: string): Promise<ConversationItem>`
Creates a new conversation item with the role `assistant` using the provided text.

### `system(message: string): Promise<ConversationItem>`
Creates a new conversation item with the role `system` (developer/system message) using the provided text.

### `create_audio(bytes: string): Promise<ConversationItem>`
Creates a new conversation item with the role `user` using the provided audio bytes as content.

### `append_input_audio_buffer(bytes: string): Promise<void>`
Appends audio bytes to the input buffer. Unlike `create_audio`, this does not immediately create a conversation item; the buffer is committed later, either manually or automatically via turn detection.

### `commit_input_audio_buffer(): Promise<void>`
Commits the audio in the input buffer, creating a conversation item. When turn detection is enabled, this is handled automatically.

### `cancel_response(): Promise<void>`
Cancels an in-progress response generation.

### `delete_conversation_item(item_id): Promise<void>`
Deletes a conversation item from the default conversation. The `item_id` is obtained from a previously created conversation item.

### `response(response_options?: ResponseOptions): Promise<Response>`
Generates a new assistant message and adds it to the conversation.  
*Note:* The default conversation supports only one active response at a time, unless set to "none".

### `close(): void`
Ends the session and closes all associated websocket connections.

## Properties

- **`name: string`**  
  The session's name (useful for debugging).

- **`session: SessionDetails`**  
  Detailed information about the current session.

- **`usage: UsageData`**  
  Accumulated token usage and cost for the session.

- **`ws: WebSocket`**  
  The active websocket connection for low-level debugging and custom implementations.

- **`event$: Observable<any>`**  
  An observable that emits data received from the remote server.  
  *Usage:* `event$.subscribe(handler)`

- **`response$: Observable<Response>`**  
  An observable that fires whenever the server generates a response. The data includes pre-processed usage information.  
  *Usage:* `response$.subscribe(handler)`


# ResponseOptions Interface

Defines options to customize the generation of a model response.

## Properties

- **`conversation?`** (`Conversation`):  
  Specifies which conversation to add the response to.  
  - `"auto"`: Adds the response to the default conversation, influencing future outputs.  
  - `"none"`: The response is not added to any conversation; it is transient and does not affect future outputs.

- **`tools?`** (`Tool[]`):  
  An array of tools (e.g., functions) available for use during response generation.  
  *Note:* Does not override previously supplied tools; it makes the model more inclined to use the specified ones.

- **`tool_choice?`** (`ToolChoice`):  
  Guidance on which tool to use when generating the response.  
  Options include: `"auto"`, `"required"`, `"none"`, or a specific function tool defined as `{ type: "function", name: string }`.

- **`temperature?`** (`Temperature`):  
  A numeric value between 0.6 and 1.2. Higher values yield more random output.

- **`instructions?`** (`Instructions`):  
  Provides guidance on how to generate the response, functioning similarly to a system message.  
  If omitted, the session’s default instructions or the model's built-in defaults are used.

- **`input?`** (`ConversationItem[]`):  
  An array of conversation items to use as context for the response.  
  Specifying this ignores the default conversation history.

- **`metadata?`** (`Metadata`):  
  Custom metadata attached to the response request.

## Environment Variables
```sh
# If provided, will be used as the API key for all sessions.
OPENAI_API_KEY=sk-1234567890abcdefg
# If enabled, sessions will automatically connect to debug server. 
TAU_DEBUG=true
```

## FAQ
### What ML models does `tau.js` support?
Tau currently supports OpenAI's `4o-realtime` and `4o-mini-realtime` models. 

### Can I contribute to `tau.js`?
If you have an idea, suggestion, bug fix request or question, create an issue or pull request. If presenting a bug, be sure to provide enough information to consistently reproduce that bug. 

### How do I contact the developers and maintainers of `tau.js`?
Lead Developer / Lead Maintainer / Code Whisperer - Daniel J. Stern (daniel@herald.to)

### Will `tau.js` support non-realtime models like `o1` or `4o`?
No, `tau.js` is focused entirely on supporting realtime, websocket based. It will add support for additional realtime models as they come along.

### Will `tau.js` support realtime models other than `OpenAI` models?
Yes, `tau.js` will support competing realtime models as they come along. Please direct suggestions to the `issues` page.

### Is `tau.js` actively maintained?
Yes. `tau.js` is maintained actively and will continue to update to support additional models and features of those models.