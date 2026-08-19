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

/**
 * Extracts the last segment of a path, extension included.
 *
 * @param path - Any path (absolute or relative)
 * @returns The last segment, or the input when it contains no separator
 *
 * @example basename('/vault/notes/hello.md') → 'hello.md'
 * @example basename('/') → ''
 */
export function basename(path: string): string {
	return path.split('/').pop() ?? path;
}

/**
 * Extracts the last segment of a path without its extension.
 * A leading dot is not treated as an extension separator, so dotfiles keep their name.
 *
 * @param path - Any path (absolute or relative)
 * @returns The last segment minus its extension
 *
 * @example stem('/vault/notes/hello.md') → 'hello'
 * @example stem('/vault/README') → 'README'
 * @example stem('/vault/.gitignore') → '.gitignore'
 */
export function stem(path: string): string {
	const name = basename(path);
	const dotIndex = name.lastIndexOf('.');
	return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}

/**
 * Strips the vault root prefix from an absolute path to produce a vault-relative path.
 * The prefix test is strict (`vaultPath + '/'`), so a sibling directory that merely
 * shares the prefix, and the vault path itself, are returned unchanged.
 *
 * @param vaultPath - Absolute vault root, without a trailing slash
 * @param filePath - Absolute path to strip
 * @returns The vault-relative path, or `filePath` unchanged when it is not inside the vault
 *
 * @example relativePath('/vault', '/vault/notes/hello.md') → 'notes/hello.md'
 * @example relativePath('/vault', '/vaulted/note.md') → '/vaulted/note.md'
 * @example relativePath('/vault', '/vault') → '/vault'
 */
export function relativePath(vaultPath: string, filePath: string): string {
	if (filePath.startsWith(vaultPath + '/')) {
		return filePath.substring(vaultPath.length + 1);
	}
	return filePath;
}
