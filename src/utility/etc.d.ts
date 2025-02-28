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
 * Returns a promise that resolves more or less when the audio returned in a response would finish playing, if it started playing as soon as the first delta was returned.
 * 
 * Useful for testing purposes.
 */
export declare function audio_finished(response : Response) : Promise<void>

/**
 * Conerts an array of deltas into a wav file and play it. Only works once all the deltas are in, which makes this suitable mostly for archival and development purposes. 
 */
export declare function save_deltas_as_wav(deltas : string[], filename : string) : void