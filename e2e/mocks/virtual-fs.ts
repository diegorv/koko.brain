interface FsEntry {
	content: string;
	isDirectory: boolean;
	modifiedAt: number;
	createdAt: number;
}

interface FileTreeNode {
	name: string;
	path: string;
	isDirectory: boolean;
	children?: FileTreeNode[];
	modifiedAt?: number;
	createdAt?: number;
}

interface FileReadResult {
	path: string;
	content: string | null;
	error: string | null;
}

interface VaultSearchMatch {
	filePath: string;
	fileName: string;
	lineNumber: number;
	lineContent: string;
	matchStart: number;
	matchEnd: number;
}

interface DirEntry {
	name: string;
	isDirectory: boolean;
	isFile: boolean;
	isSymlink: boolean;
}

const store = new Map<string, FsEntry>();

function now(): number {
	return Date.now();
}

function getParentPath(p: string): string {
	const idx = p.lastIndexOf('/');
	return idx > 0 ? p.substring(0, idx) : '/';
}

function getFileName(p: string): string {
	const idx = p.lastIndexOf('/');
	return idx >= 0 ? p.substring(idx + 1) : p;
}

function ensureParentDirs(path: string): void {
	const parent = getParentPath(path);
	if (parent === path) return;
	if (!store.has(parent)) {
		ensureParentDirs(parent);
		store.set(parent, {
			content: '',
			isDirectory: true,
			modifiedAt: now(),
			createdAt: now(),
		});
	}
}

export const virtualFS = {
	populate(entries: Record<string, string>): void {
		for (const [path, content] of Object.entries(entries)) {
			if (path.endsWith('/')) {
				const dirPath = path.slice(0, -1);
				ensureParentDirs(dirPath);
				store.set(dirPath, {
					content: '',
					isDirectory: true,
					modifiedAt: now(),
					createdAt: now(),
				});
			} else {
				ensureParentDirs(path);
				store.set(path, {
					content,
					isDirectory: false,
					modifiedAt: now(),
					createdAt: now(),
				});
			}
		}
	},

	reset(): void {
		store.clear();
	},

	readFile(path: string): string {
		const entry = store.get(path);
		if (!entry || entry.isDirectory) {
			throw new Error(`File not found: ${path}`);
		}
		return entry.content;
	},

	writeFile(path: string, content: string): void {
		ensureParentDirs(path);
		const existing = store.get(path);
		store.set(path, {
			content,
			isDirectory: false,
			modifiedAt: now(),
			createdAt: existing?.createdAt ?? now(),
		});
	},

	mkdir(path: string): void {
		ensureParentDirs(path);
		if (!store.has(path)) {
			store.set(path, {
				content: '',
				isDirectory: true,
				modifiedAt: now(),
				createdAt: now(),
			});
		}
	},

	remove(path: string): void {
		// Delete the entry and all children
		const prefix = path + '/';
		for (const key of [...store.keys()]) {
			if (key === path || key.startsWith(prefix)) {
				store.delete(key);
			}
		}
	},

	rename(oldPath: string, newPath: string): void {
		const prefix = oldPath + '/';
		const entries: [string, FsEntry][] = [];

		for (const [key, val] of store.entries()) {
			if (key === oldPath || key.startsWith(prefix)) {
				entries.push([key, val]);
			}
		}

		for (const [key] of entries) {
			store.delete(key);
		}

		ensureParentDirs(newPath);
		for (const [key, val] of entries) {
			const newKey = key === oldPath ? newPath : newPath + key.substring(oldPath.length);
			store.set(newKey, val);
		}
	},

	exists(path: string): boolean {
		return store.has(path);
	},

	readDir(path: string): DirEntry[] {
		const prefix = path + '/';
		const seen = new Set<string>();
		const results: DirEntry[] = [];

		for (const [key, val] of store.entries()) {
			if (!key.startsWith(prefix)) continue;
			const rest = key.substring(prefix.length);
			const slashIdx = rest.indexOf('/');
			const childName = slashIdx >= 0 ? rest.substring(0, slashIdx) : rest;

			if (seen.has(childName)) continue;
			seen.add(childName);

			// Check if the direct child entry is a directory
			const childPath = prefix + childName;
			const childEntry = store.get(childPath);
			const isDir = childEntry ? childEntry.isDirectory : slashIdx >= 0;

			results.push({
				name: childName,
				isDirectory: isDir,
				isFile: !isDir,
				isSymlink: false,
			});
		}

		return results;
	},

	copyFile(src: string, dest: string): void {
		const entry = store.get(src);
		if (!entry || entry.isDirectory) {
			throw new Error(`File not found: ${src}`);
		}
		ensureParentDirs(dest);
		store.set(dest, {
			content: entry.content,
			isDirectory: false,
			modifiedAt: now(),
			createdAt: now(),
		});
	},

	scanVault(path: string, sortBy: string): FileTreeNode[] {
		const children = this.readDir(path);
		const nodes: FileTreeNode[] = [];

		for (const child of children) {
			// Skip hidden files/directories (dot-prefixed) — matches Rust scan_vault behavior
			if (child.name.startsWith('.')) continue;

			const childPath = `${path}/${child.name}`;
			const entry = store.get(childPath);
			const node: FileTreeNode = {
				name: child.name,
				path: childPath,
				isDirectory: child.isDirectory,
				modifiedAt: entry?.modifiedAt,
				createdAt: entry?.createdAt,
			};

			if (child.isDirectory) {
				node.children = this.scanVault(childPath, sortBy);
			}

			nodes.push(node);
		}

		nodes.sort((a, b) => {
			// Directories first
			if (a.isDirectory !== b.isDirectory) {
				return a.isDirectory ? -1 : 1;
			}
			if (sortBy === 'modified') {
				return (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0);
			}
			return a.name.localeCompare(b.name);
		});

		return nodes;
	},

	readFilesBatch(paths: string[]): FileReadResult[] {
		return paths.map((path) => {
			const entry = store.get(path);
			if (!entry || entry.isDirectory) {
				return { path, content: null, error: `File not found: ${path}` };
			}
			return { path, content: entry.content, error: null };
		});
	},

	searchVault(
		path: string,
		query: string,
		caseSensitive: boolean,
		wholeWord: boolean,
		useRegex: boolean,
	): VaultSearchMatch[] {
		const matches: VaultSearchMatch[] = [];
		const prefix = path + '/';

		let pattern: RegExp;
		try {
			let src = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			if (wholeWord) {
				src = `\\b${src}\\b`;
			}
			pattern = new RegExp(src, caseSensitive ? 'g' : 'gi');
		} catch {
			return [];
		}

		for (const [filePath, entry] of store.entries()) {
			if (entry.isDirectory) continue;
			if (!filePath.startsWith(prefix) && filePath !== path) continue;

			const lines = entry.content.split('\n');
			for (let i = 0; i < lines.length; i++) {
				let match: RegExpExecArray | null;
				pattern.lastIndex = 0;
				while ((match = pattern.exec(lines[i])) !== null) {
					const name = getFileName(filePath);
					const dotIdx = name.lastIndexOf('.');
					matches.push({
						filePath,
						fileName: dotIdx > 0 ? name.substring(0, dotIdx) : name,
						lineNumber: i + 1,
						lineContent: lines[i],
						matchStart: match.index,
						matchEnd: match.index + match[0].length,
					});
				}
			}
		}

		return matches;
	},

	dump(): Record<string, string> {
		const result: Record<string, string> = {};
		for (const [path, entry] of store.entries()) {
			if (!entry.isDirectory) {
				result[path] = entry.content;
			}
		}
		return result;
	},
};

// Expose on window for Playwright access (guard for SSR)
if (typeof window !== 'undefined') {
	(window as any).__e2e = (window as any).__e2e || {};
	(window as any).__e2e.fs = virtualFS;
}
