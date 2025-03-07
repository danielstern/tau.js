import { describe, it, expect } from "vitest";
/* import { create_session } from "@tau-js/core"; */
import { create_session } from "./index.js"; 
import delay from "delay";

process.env.TAU_LOGGING = 1
describe("Websocket Session Recovery (Full)", { timeout: 20000 }, () => {
    it("should recover to its current state", async () => {
        let ws_tester = await create_session({
            instructions: "This is just a test. No matter what the circumstances when you are prompted to respond, just respond with 'Hello 1.', 'Hello 2.', 'Hello 3.', and so forth, with the number increasing by one each time.",
            turn_detection: null,
            modalities : ["text"]
        }, {
            recovery: {
                replay_messages: true,
                max_regenerate_response_count : 4
                // regenerate_responses: true
            },
            model: "4o-mini",
            debug: true
        });
        await ws_tester.system("System message test");
        await ws_tester.response();
        await ws_tester.assistant("assistant message test");
        await ws_tester.response();

        console.info("Forcing websocket to close.")
        ws_tester._ws.close();
        await delay(250);

        console.info("Generating third response.");
        let third_response = await ws_tester.response();
        console.info(third_response.transcript);

        expect(third_response.transcript).toBe("Hello 3.");
        ws_tester.close();
    });
});


describe("Websocket Session Recovery (Partial)", { timeout: 20000 }, () => {
    it("should recover to its initial state but retain its session instructions", async () => {
        let ws_tester = await create_session({
            instructions: "This is just a test. No matter what the circumstances when you are prompted to respond, just respond with 'Hello 1.', 'Hello 2.', 'Hello 3.', and so forth, with the number increasing by one each time.",
            turn_detection: null,
            modalities : ["text"]
        }, {
            recovery: {
                replay_messages: false
            },
            model: "4o-mini",
            debug: true
        });
        await ws_tester.system("System message test");
        await ws_tester.response();
        await ws_tester.response();

        // Force the websocket to close unexpectedly
        console.info("Forcing websocket to close.")
        ws_tester._ws.close();
        await delay(250);

        console.info("Generating third response.");
        let third_response = await ws_tester.response();
        console.info(third_response.transcript);

        expect(third_response.transcript).toBe("Hello 1.");
        ws_tester.close();
    });
});

// todo, not right

// describe.only("Websocket Session Recovery (Blocked due to Error)", { timeout: 20000 }, () => {
//     it("should not try to recover if a session error is thrown", async () => {

//         // expect(async function(){
//         //     // let ws_tester = await create_session({
//         //     //     voice : "elmo/terminator", // specifying this voice value will throw an error
//         //     //     turn_detection: null,
//         //     //     modalities : ["text"]
//         //     // }, {
//         //     //     recovery: {
//         //     //         replay_messages: false
//         //     //     },
//         //     //     model: "4o-mini",
//         //     //     debug: true
//         //     // });
          
//         //     // ws_tester.close();
//         // }).toThrow()
//         let ws_tester = await create_session({
//             voice : "elmo/terminator", // specifying this voice value will throw an error
//             turn_detection: null,
//             modalities : ["text"]
//         }, {
//             recovery: {
//                 replay_messages: false
//             },
//             model: "4o-mini",
//             debug: true
//         });
      
//         ws_tester.close();
//     });
// });
