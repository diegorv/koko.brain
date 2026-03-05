import { readTextFile } from '@tauri-apps/plugin-fs';

/** Loads a .js script file from the vault */
export async function loadExternalScript(absolutePath: string): Promise<string> {
	return await readTextFile(absolutePath);
}
