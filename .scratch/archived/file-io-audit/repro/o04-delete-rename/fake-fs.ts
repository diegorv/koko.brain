/**
 * In-memory stand-in for `@tauri-apps/plugin-fs`, used by the o04 repro tests.
 *
 * `caseInsensitive` models the macOS APFS default: a lookup ignores case, an
 * entry keeps the casing it was created with, `exists` answers true for a
 * name that differs only in case, `copyFile` (std::fs::copy) truncates and
 * overwrites an existing destination, and `rename` may change only the case.
 *
 * `renameGate`, when set, lets a test hold the RESPONSE of a rename: the disk
 * mutation happens when the call is made (Tauri runs the sync `rename`
 * command on arrival), the returned promise settles only when the gate opens.
 */
export interface FakeFs {
	caseInsensitive: boolean;
	files: Map<string, { path: string; content: string }>;
	dirs: Map<string, string>;
	renameError: Error | null;
	renameGate: Promise<void> | null;
	key(p: string): string;
	read(p: string): string | undefined;
	put(p: string, content: string): void;
	listPaths(): string[];
	reset(): void;
}

export function createFakeFs(): FakeFs {
	const fs: FakeFs = {
		caseInsensitive: false,
		files: new Map(),
		dirs: new Map(),
		renameError: null,
		renameGate: null,
		key(p) {
			return fs.caseInsensitive ? p.toLowerCase() : p;
		},
		read(p) {
			return fs.files.get(fs.key(p))?.content;
		},
		put(p, content) {
			const existing = fs.files.get(fs.key(p));
			fs.files.set(fs.key(p), { path: existing?.path ?? p, content });
		},
		listPaths() {
			return [...fs.files.values()].map((f) => f.path).sort();
		},
		reset() {
			fs.caseInsensitive = false;
			fs.files.clear();
			fs.dirs.clear();
			fs.renameError = null;
			fs.renameGate = null;
		},
	};
	return fs;
}

function parentOf(p: string): string {
	return p.substring(0, p.lastIndexOf('/'));
}

/** Builds the plugin-fs mock module over `fs`. */
export function pluginFsMock(fs: FakeFs) {
	const dirExists = (p: string) => p === '/vault' || fs.dirs.has(fs.key(p));
	return {
		readTextFile: async (p: string) => {
			const c = fs.read(p);
			if (c === undefined) throw new Error(`ENOENT: ${p}`);
			return c;
		},
		// plugin-fs write_text_file defaults to create: true.
		writeTextFile: async (p: string, content: string) => {
			if (!dirExists(parentOf(p))) throw new Error(`ENOENT (parent): ${p}`);
			fs.put(p, content);
		},
		exists: async (p: string) => fs.files.has(fs.key(p)) || dirExists(p),
		mkdir: async (p: string) => {
			fs.dirs.set(fs.key(p), p);
		},
		remove: async (p: string) => {
			fs.files.delete(fs.key(p));
			fs.dirs.delete(fs.key(p));
		},
		copyFile: async (from: string, to: string) => {
			const src = fs.read(from);
			if (src === undefined) throw new Error(`ENOENT: ${from}`);
			fs.put(to, src);
		},
		readDir: async (dir: string) => {
			const prefix = fs.key(dir) + '/';
			const out: { name: string; isDirectory: boolean; isFile: boolean; isSymlink: boolean }[] = [];
			for (const [k, f] of fs.files) {
				if (k.startsWith(prefix) && !k.slice(prefix.length).includes('/')) {
					out.push({ name: f.path.split('/').pop()!, isDirectory: false, isFile: true, isSymlink: false });
				}
			}
			return out;
		},
		rename: (from: string, to: string) => {
			if (fs.renameError) return Promise.reject(fs.renameError);
			const fromKey = fs.key(from);
			const moves: [string, { path: string; content: string }][] = [];
			for (const [k, f] of fs.files) {
				if (k === fromKey || k.startsWith(fromKey + '/')) moves.push([k, f]);
			}
			for (const [k, f] of moves) {
				fs.files.delete(k);
				const newPath = to + f.path.slice(from.length);
				fs.files.set(fs.key(newPath), { path: newPath, content: f.content });
			}
			for (const [k, d] of [...fs.dirs]) {
				if (k === fromKey || k.startsWith(fromKey + '/')) {
					fs.dirs.delete(k);
					const newPath = to + d.slice(from.length);
					fs.dirs.set(fs.key(newPath), newPath);
				}
			}
			return fs.renameGate ? fs.renameGate.then(() => undefined) : Promise.resolve();
		},
	};
}
