/**
 * Parses the stored list of vault paths that have mods turned on.
 * Anything that is not a JSON array of strings reads as an empty list, so a
 * corrupt or hand-edited value turns mods off instead of throwing.
 */
export function parseEnabledVaults(raw: string | null): string[] {
	if (!raw) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	return [...new Set(parsed.filter((p): p is string => typeof p === 'string'))];
}

/**
 * Returns a copy of `paths` with `path` added (once) or removed.
 * Paths compare as exact strings: the vault's absolute path as opened.
 */
export function setVaultEnabled(paths: readonly string[], path: string, enabled: boolean): string[] {
	const rest = paths.filter((p) => p !== path);
	return enabled ? [...rest, path] : rest;
}
