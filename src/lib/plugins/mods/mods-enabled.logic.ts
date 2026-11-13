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

/** Mod folders switched off, per vault absolute path; a mod not listed is on */
export type DisabledMods = Record<string, string[]>;

/**
 * Parses the stored map of vault paths to the mod folders switched off.
 * Anything malformed reads as "every mod on": a non-object value gives `{}`,
 * a vault whose value is not an array is dropped, non-string folders are
 * dropped, and a vault left with no folders is dropped.
 */
export function parseDisabledMods(raw: string | null): DisabledMods {
	if (!raw) return {};
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
	const result: DisabledMods = {};
	for (const [vault, folders] of Object.entries(parsed)) {
		if (!Array.isArray(folders)) continue;
		const names = [...new Set(folders.filter((f): f is string => typeof f === 'string'))];
		if (names.length > 0) result[vault] = names;
	}
	return result;
}

/**
 * Returns a copy of `map` with `folder` switched off (added once) or on
 * (removed) for `vault`. A vault left with no folders is dropped.
 */
export function setModDisabled(map: DisabledMods, vault: string, folder: string, disabled: boolean): DisabledMods {
	const rest = (map[vault] ?? []).filter((f) => f !== folder);
	const folders = disabled ? [...rest, folder] : rest;
	const { [vault]: _previous, ...others } = map;
	return folders.length > 0 ? { ...others, [vault]: folders } : others;
}
