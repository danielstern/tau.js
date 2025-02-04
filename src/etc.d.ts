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
  