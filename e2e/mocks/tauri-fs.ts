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
