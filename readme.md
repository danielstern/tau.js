# Tau.js <img width=26px src="https://favicon-generator-1041699091324.us-central1.run.app/icon"> [BUNCH OF FANCY STAMPS GO HERE AND SHIT]

## The Easy and Intuitive Way to Work with Realtime AI Voice Models
## Why Use Tau.js?
<!-- - Simplifies awkward and tricky Websocket interface into a handy async/await interface -->
### Simple `async` Interface 
<!-- - Includes sophisticated debug server and application (especially helps for debugging sound) -->
<!-- - Computes usage costs in real time -->
### Cost Computation Estimation
Tau computes total usage costs for sessions by using usage data returned from responses combined with publicly available pricing data for supported APIs. Tau cost computation turns opaque token counts into one salient cost number.

### Sophisticated Debug Server


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
import { audio_promise } from "tau/utility"

let session = await create_session({
    instructions: "You are not just an assistant. You are also a cat. End every sentence with *meow*.",
    temperature : 0.90,
    voice: "verse"
}, {
    model : "4o",
    debug: true,
    api_key: "sk-dankapikey-42069"
})

await session.system("Speak in a tough, brassy, raspy, confident, assured, deep Scottish brogue.")
await audio_promise(session)
```

## Understanding and Using the Debug Server

## Examples
### Creating a Simple Realtime Text Chatbot
Realtime text chatbots are very effective. Even though they don't have voice, they begin generating response text at unbelievably fast speeds of 300ms or less. They are also very inexpensive to develop and deploy, especially with mini.
```javascript
import { create_session } from "tau"

let session = await create_session({
    modalities : ["text"]
}, {
    model : "4o-mini",
})

await session.user()
```
<!-- Before you start, you need to have you OpenAI API Key ready. -->

<!-- - Install Tau -->
<!-- - write a simple application -->
<!-- - start the dev server -->

## Faq
### What ML models does Tau.js support?
Tau currently supports OpenAI's `4o-realtime` and `4o-mini-realtime` models. 

### Why is Tau written in JavaScript and not Python?

## Guide
### Philosophy of Realtime Audio Model Design
There's an old legal axiom that goes, better done quickly than done right. As counter-intuitive as this sounds, it actually makes a lot of sense: what use is the correct decision, after all, once the window for action has passed?

This is a good way of modeling the strengths and weaknesses of realtime audio models. They respond very quickly and generate extremely effective voice output. But they necessarily have a very small amount of time for reasoning.

Realtime models respond with voice so quickly that, with good interface design, the user will perceive *no delay at all* when in conversation with one of these models. This makes them suitable for a huge range of tasks previously inaccessible to AI models:
- Voice-powered customer service
- Proactive phone sales
- Real time emotional support
- Technical Support / Infrastructure
