/**
 * Normalizes a path by resolving `.` and `..` segments.
 * Does not access the filesystem — purely string-based.
 */
export function normalizePath(path: string): string {
	const parts = path.split('/');
	const resolved: string[] = [];
	for (const part of parts) {
		if (part === '.' || part === '') {
			continue;
		} else if (part === '..') {
			resolved.pop();
		} else {
			resolved.push(part);
		}
	}
	return '/' + resolved.join('/');
}

/**
 * Resolves a relative file path against a vault root, normalizing
 * path segments and ensuring the result stays within the vault.
 *
 * @param vaultPath - Absolute vault root (e.g. `/Users/me/vault`)
 * @param file - Relative path (may include `..`, leading `/`, extension)
 * @returns Absolute resolved path inside the vault
 *
 * @example resolveFilePath('/vault', 'notes/hello') → '/vault/notes/hello.md'
 * @example resolveFilePath('/vault', 'notes/hello.md') → '/vault/notes/hello.md'
 * @example resolveFilePath('/vault/', 'notes/hello') → '/vault/notes/hello.md'
 * @throws {Error} If the resolved path escapes the vault directory
 */
export function resolveFilePath(vaultPath: string, file: string): string {
	const base = vaultPath.endsWith('/') ? vaultPath.slice(0, -1) : vaultPath;
	const relative = file.startsWith('/') ? file.slice(1) : file;
	const fullPath = `${base}/${relative}`;

	// Normalize the path by resolving ".." and "." segments
	const normalized = normalizePath(fullPath);

	// Ensure the resolved path stays within the vault
	if (!normalized.startsWith(base + '/') && normalized !== base) {
		throw new Error(`Path traversal detected: "${file}" resolves outside the vault`);
	}

	// Add .md if no extension is present
	const lastSegment = normalized.split('/').pop() ?? '';
	if (!lastSegment.includes('.')) {
		return `${normalized}.md`;
	}

	return normalized;
}
