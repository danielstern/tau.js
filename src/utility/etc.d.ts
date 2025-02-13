/**
 * Loads a yml file from the `docs` folder.
 * @param path Path to the yml file to load, excluding the extensions.
 * @param override_dir Optionally specify this if you want to load the file from a directory other than `docs`.
 */
export declare function load_yml(
    path : string,
    override_dir? : string
): string;
  
/**
 * Loads a md file from the `docs` folder.
 * @param path Path to the file md to load, excluding the extensions.
 * @param override_dir Optionally specify this if you want to load the file from a directory other than `docs`.
 */
export declare function load_md(
    path : string,
    override_dir? : string
): string;

/**
 * Returns a promise that resolves when the user inputs something into the CLI and presses enter.
 * Good for testing.
 */
export declare function user_tty() : Promise<string>

/**
 * Invokes `.response()` on the provided session and returns a promise that resolves after the *total duration of the audio generated in the response.* This is distinct from how long it takes for the response to be generated.
 * 
 * Useful for testing purposes.
 */
export declare function audio_promise(session : Session) : Promise<void>

export declare function save_deltas_as_wav(deltas : string[], filename : string) : void