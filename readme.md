# tau.js <img width=20px src="https://favicon-generator-1041699091324.us-central1.run.app/icon"> [TODO BUNCH OF FANCY STAMPS GO HERE]
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
## Why Use Tau.js?
### Simple Async/Await Interface
Realtime AI sessions are based on Websockets. This is very good, as websockets are extremely fast and they're a critical part of delivering a fast user experience.


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
`tau.js` includes a UI where you can listen to incoming audio in real time, input voice, and review usage data.
<a href="https://owned.io/tau/debugger/" target="_blank">
<!-- <div align="center"> -->
<img  src="https://storage.googleapis.com/owned-io-public-files/images/2025-02-12%2006_51_21-tau.js%20debugger.png">
<!-- </div> -->
</a>


## Quick Start Guide
Developing with Realtime AI Models is simple and easy with `tau.js`. You can be conversing with your model in short order by following these steps:
1. Install `tau.js`
```
npm install -g (what goes here?)
```

2. Start the `debug` server
```
tau debug start
```

3. Create a session and start working in realtime with AI!
```javascript
import { create_session } from "tau"

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

```
npm install -g tau // TODO? right url?
tau debug start
```

This will start a local debug server, as well as open the debug UI at <a href="https://owned.io/tau/debugger/">https://owned.io/tau/debugger</a>.  

In order to enable audio playback and microphone access, you need to click on the debugger UI. 

    The debug UI is still in development. You'll be able to run the debug UI locally, if desired, as part of future releases. You can still use `tau.js` without the debugger if you want entirely localized experience.

   

Enable debug output from a tau session by passing `{ debug : true }` (see examples) or by setting the following environment variable:

```
TAU_DEBUG=true
```


## Examples
### Example: Creating a Simple Realtime Translator
The example below is very simple but creates an effective and very fast universal translator. You can even specify how you want your translator to speak. 
    
    TODO formatting: Whether you specify instructions or not, if you provide voice input for a translation realtime model like the one below, it will copy your tone of voice and emphasis. 

```javascript
import { create_session } from "tau"

let session = await create_session({
    instructions : "You are translation assistant. Translate all user input.",
    modalities : ["text", "audio"],
    voice : "ash",
},{
    debug : "true"
})

await session.system("Translate user input into German. Speak in a friendly voice, loudly and clearly annunciating.")
await session.user("Excuse me, is this where I catch the train to the airport?")
```

### Example: Creating a Dramatic Vocaloid
Realtime voice models (vocaloids) can produce surprisingly powerful and emotionally compelling audio. 

```javascript
import { create_session } from "tau"
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




## FAQ
### What ML models does `tau.js` support?
Tau currently supports OpenAI's `4o-realtime` and `4o-mini-realtime` models. 

### Can I contribute to `tau.js`?
If you have an idea, suggestion, bug fix request or question, create an issue or pull request. If presenting a bug, be sure to provide enough information to consistently reproduce that bug. 

### How do I contact the developers and maintainers of `tau.js`?
Lead Developer / Lead Maintainer / Code Whisperer - Daniel J. Stern (daniel@herald.to)