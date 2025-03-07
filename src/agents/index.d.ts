/**
 * Creates a basic agent with turn detection enabled that converts any voice input received into text.
 */
export declare async function create_transcriber(options : TranscriberOptions) : Session

export declare async function tutorial(agent, lessons, options : {
    create_responses : boolean
}) : Promise<void>