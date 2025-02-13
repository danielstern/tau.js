<img style="margin-bottom:12px" src="https://storage.googleapis.com/owned-io-public-files/images/tau-logo.png">


<img src="https://img.shields.io/badge/License-MIT-steelblue"><img src="https://img.shields.io/badge/version-alpha-orange"><img src="https://img.shields.io/badge/node-18.20.4-darkgreen">
<div style="margin-bottom:20px"></div>

# tau.js <img width=20px src="https://favicon-generator-1041699091324.us-central1.run.app/icon"> 
*The Easy and Intuitive Way to Work with Realtime AI Voice Models!*
### What is `tau.js`
`tau.js` is a node library that greatly simplifies the Websocket API used to communicate with realtime AI models like `4o-realtime`, and adds essential features like realtime voice debugging.

With `tau.js`, Starting a session and generating a voice response is as simple as:

```javascript
import { create_session } from "tau"

let session = await create_session()
await session.system("Whenever prompted to respond, state a different teaching of the Sun Tzu.")
let data = await session.response()

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
# If enabled, sessions will automatically respond to voice commands. If this is not enabled you have to handle the user's debug voice input yourself (see examples.)
TAU_DEBUG_AUTOPLAY=true 
```


## Examples
### Example: Creating a Simple Realtime Translator
The example below is very simple but creates an effective and very fast universal translator. You can even specify how you want your translator to speak. 
    

```javascript
import { create_session } from "tau" // TODO update import
//  todo make sure this work

let session = await create_session({
    instructions : "You are translation assistant. Translate all user input.",
    modalities : ["text", "audio"],
    voice : "ash",
},{
    debug : true,
    debug_autoplay : true
})

await session.system("Translate user input into German. Speak in a friendly voice, loudly and clearly annunciating.")
await session.user("Excuse me, is this where I catch the train to the airport?")
```

### Example: Creating a Dramatic Vocaloid
Realtime voice models (vocaloids) can produce surprisingly powerful and emotionally compelling audio. 

```javascript
import { create_session } from "tau" // TODO
import { audio_promise } from "tau/utility"

let session = await create_session({
    modalities : ["text", "audio"],
    instructions: "",
    temperature : 0.86,
    voice: "ash"
}, {
    name : "thespion-4.0",
    model : "4o",
    debug: true
})

await session.system("Repeat after the user.")
await session.system("Speak in a deep, raspy, brassy, assured Scottish brogue.")
for (let line of [
    "**SOFTLY, CONDESCENDING** I've seen things you people wouldn't believe. **DISMISSIVELY** Hmph.",
    "**EXCITED, CONFIDINGLY** Attack ships on fire off th'shoulder of Orion!",
    "**SADLY** I watched C-beams... glitter in the dark near the Tannhäuser Gate!",
    "**SADLY, CRYING, NOSTALGIC, WITH DRAMATIC TIMING** All those... moments will be lost... in time, like **CLEARS THROAT** tears... in rain.",
    "**CALMLY, ACCEPTING** Time... to die."
]) {
    await session.user(line)
    /**
     * Audio promise is a simple utility that resolves around when 
     * the realtime voice response would finish playing if 
     * it had started as soon as the first audio delta was returned. 
     * It's useful, in conjunction with the debugger, for listening to long chains of realtime voice output. 
     */
    await audio_promise(session)
}

console.info(session.usage)
session.close()
```

### Example: Lanuage Tutor
This tutor will patiently work with any student to learn any target phrase in any known language. It's very effective.

```javascript
import { create_session } from "tau"
import { handle_debugger_client_input } from "tau/debug" // todo

let target_language = "Mandarin"
let target_phrase = "It's high noon."

let tutor = await create_session({
    instructions : `You're a friendly, helpful language tutor who is helping the user learn the ${target_language} language. Assume they have no previous knowledge of the target language. Speak all instructions in English.`,
    modalities : ["text","audio"],
    temperature : 0.69,
    voice: "ash",
   
}, {
    model : "4o",
    debug: true
})

let target_prompt = `The target phrase is: '${target_phrase}'. The target language is ${target_language}`
await tutor.system(target_prompt)
await tutor.system("Speak the target phrase in English. Then translate the target phrase into the target language and repeat it once. Finally, ask the user to speak the phrase 2-3 times.")
await tutor.response()

handle_debugger_client_input(async data => {

    if (data.type !== "user.audio.input") return
    await tutor.create_audio({bytes:data.bytes})
    await tutor.response({
        instructions : `Analyze the user's input and provide one imperative suggestion on how they can improve their pronunciation. Focus on one key are to improve upon at a time, even if there are multiple issues that need to be addressed. Quickly explain the improvement then speak the phrase in the target language again. Finally, ask the user to speak the phrase again. This process will continuously repeat (the user will exit the program when they are satisfied.) **Always** end your response by speaking the target phrase.`
    })
    // Good effort! This time, focus on the tone of the word “正午”. It should have a falling-rising tone on "正" and a falling tone on "午". Let's try it again. "现在是正午。" Now, repeat it after me. 🤯🤯
})
```
### Environment Variables
<!-- It is simpler and more effective to define the `OPENAI_API_KEY` environment variable than to pass the API key in when creating a new session. -->
The simplest way to set your project-wide API Key is by setting the following environment variable.

```sh
OPENAI_API_KEY=<YOUR_API_KEY>
```

You can also pass the API Key in on a per-session basis by using the options interface (See #)

# API Reference
## Session Reference 
### `async tau.create_session(options, config)`

## Utility Reference
### `async tau.utility.audio_promise(session)`

## Debug Reference
### async TODO

## FAQ
### What ML models does `tau.js` support?
Tau currently supports OpenAI's `4o-realtime` and `4o-mini-realtime` models. 

### Can I contribute to `tau.js`?
If you have an idea, suggestion, bug fix request or question, create an issue or pull request. If presenting a bug, be sure to provide enough information to consistently reproduce that bug. 

### How do I contact the developers and maintainers of `tau.js`?
Lead Developer / Lead Maintainer / Code Whisperer - Daniel J. Stern (daniel@herald.to)

### Will `tau.js` support non-realtime models like `o1` or `4o`?
No, `tau.js` is focused entirely on supporting realtime, websocket based. It will add support for additional realtime models as they come along.

### Why do you use `snake_case`? Why do you use `let` instead of `const`? Should I adopt these style conventions?
Yes. JavaScript is better this way and you should adopt these conventions.

`snake_case` is much more versatile and readable than `camelCase`. Bless `python` for making it mainstream.

`let` is two fewer characeters than `const`. More esoterically, `const` is just an ugly word that evokes discomfort, unpleasantness and perplexity. `let` is a pleasant word that evokes opportunity and freedom. Only use `const` in conjunction with all-uppercase variables. Never mix `let` and `const` declarations.

```js
export const API_KEY = process.env.API_KEY // acceptable const usage
```
