import { virtualFS } from './virtual-fs';

export async function readTextFile(path: string): Promise<string> {
	return virtualFS.readFile(path);
}

export async function writeTextFile(path: string, content: string): Promise<void> {
	virtualFS.writeFile(path, content);
}

export async function mkdir(path: string): Promise<void> {
	virtualFS.mkdir(path);
}

export async function remove(path: string, _opts?: { recursive?: boolean }): Promise<void> {
	virtualFS.remove(path);
}

export async function rename(oldPath: string, newPath: string): Promise<void> {
	virtualFS.rename(oldPath, newPath);
}

export async function exists(path: string): Promise<boolean> {
	return virtualFS.exists(path);
}

/** File-kind metadata used by the mod vault adapter to choose file or folder deletion. */
export async function stat(path: string): Promise<{ isDirectory: boolean; isFile: boolean; isSymlink: boolean }> {
	const slash = path.lastIndexOf('/');
	const entry = virtualFS.readDir(path.slice(0, slash)).find((child) => child.name === path.slice(slash + 1));
	if (!entry) throw new Error(`Path not found: ${path}`);
	return { isDirectory: entry.isDirectory, isFile: entry.isFile, isSymlink: entry.isSymlink };
}

export async function copyFile(src: string, dest: string): Promise<void> {
	virtualFS.copyFile(src, dest);
}

export async function readDir(path: string): Promise<Array<{ name: string; isDirectory: boolean; isFile: boolean; isSymlink: boolean }>> {
	return virtualFS.readDir(path);
}

export async function readFile(path: string): Promise<Uint8Array> {
	const text = virtualFS.readFile(path);
	return new TextEncoder().encode(text);
}

export const BaseDirectory = {};
