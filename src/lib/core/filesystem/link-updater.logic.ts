import { stem, vaultRelativeKey } from '#lib/utils/path.js';
import { buildResolutionCache, resolveWikilinkCached, type WikilinkResolutionCache } from './wikilink-resolution.logic';

/**
 * Regex pattern matching all wikilink variations (without global flag).
 * [[target]], [[target#heading]], [[target#^block]], [[target|alias]], [[target#heading|alias]]
 * Each function creates its own RegExp instance with `/g` to avoid shared `lastIndex` state.
 */
const WIKILINK_RE = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/;

/**
 * Extracts the note name (filename without extension) from a file path.
 * Example: "/vault/folder/My Note.md" → "My Note"
 */
export function extractNoteName(filePath: string): string {
	return stem(filePath);
}

/**
 * Splits a trimmed wikilink target into its folder prefix (through the last `/`),
 * note stem and Markdown extension. Only `.md` / `.markdown` count as the
 * extension, so `[[Old.png]]` keeps `Old.png` as its stem and never matches a
 * note named `Old`, and a dotted note name (`v1.2 notes`) stays whole.
 */
function splitTarget(target: string): { prefix: string; noteStem: string; ext: string } {
	const slash = target.lastIndexOf('/');
	const prefix = target.slice(0, slash + 1);
	const fileName = target.slice(slash + 1);
	const ext = /\.(md|markdown)$/i.exec(fileName)?.[0] ?? '';
	// A bare `.md` is a dotfile name, not an extension (getNoteName semantics).
	if (ext === '' || ext === fileName) return { prefix, noteStem: fileName, ext: '' };
	return { prefix, noteStem: fileName.slice(0, -ext.length), ext };
}

/**
 * One rename as wikilink resolution sees it: the note's old and new path and
 * the vault's note paths resolved before and after the rename.
 */
export interface RenameResolution {
	/** Absolute path the note leaves. */
	oldPath: string;
	/** Absolute path the note lands on. */
	newPath: string;
	/** Vault root, for the vault-relative path form; `null` skips verification. */
	vaultRoot: string | null;
	/** Resolution over the note paths as they were before the rename. */
	before: WikilinkResolutionCache;
	/** Resolution over the note paths after the rename. */
	after: WikilinkResolutionCache;
}

/**
 * Builds the before and after resolution of renaming `oldPath` to `newPath`.
 * `notePaths` may already hold `newPath` or lack `oldPath` (a watcher patch
 * landed); both are normalized away. After the rename `newPath` comes last,
 * because Rust `rename_note` re-inserts it into a first-write-wins cache, so a
 * note that already owns the new stem keeps it.
 */
export function buildRenameResolution(oldPath: string, newPath: string, notePaths: string[], vaultRoot: string | null): RenameResolution {
	const others = notePaths.filter((p) => p !== oldPath && p !== newPath);
	const beforePaths = notePaths.filter((p) => p !== newPath);
	if (!beforePaths.includes(oldPath)) beforePaths.push(oldPath);
	return {
		oldPath,
		newPath,
		vaultRoot,
		before: buildResolutionCache(beforePaths),
		after: buildResolutionCache([...others, newPath]),
	};
}

/**
 * Rewrites the wikilinks in `content` that resolve to `rename.oldPath` before
 * the rename (case-insensitive stem match first, so `[[Old.png]]` is never
 * touched). The new target keeps the written form, folder prefix and
 * `.md` / `.markdown` extension included (`[[folder/Old.md]]` ->
 * `[[folder/New.md]]`), when that form resolves to `rename.newPath`
 * afterwards; otherwise, because another note owns the new stem, it is the
 * vault-relative path with extension (`[[A/New.md]]`), which both resolvers
 * map exactly when it holds a `/`. A note at the vault root has no such form:
 * `[[New.md]]` goes to the first note with that file name in either resolver,
 * so it can still land on a nested namesake such as `B/New.md`. Links
 * that resolve elsewhere stay as they are.
 * Preserves heading fragments, block references, and aliases.
 */
export function replaceWikilinks(content: string, rename: RenameResolution): string {
	const { oldPath, newPath, vaultRoot, before, after } = rename;
	const oldNameLower = extractNoteName(oldPath).toLowerCase();
	const newName = extractNoteName(newPath);
	const pathForm = vaultRoot === null ? null : vaultRelativeKey(vaultRoot, newPath);
	const re = new RegExp(WIKILINK_RE.source, 'g');
	return content.replace(re, (fullMatch, target, heading, display) => {
		const trimmed = (target as string).trim();
		const { prefix, noteStem, ext } = splitTarget(trimmed);
		let written: string;
		if (noteStem.toLowerCase() === oldNameLower) {
			written = prefix + newName + ext;
		} else if (ext !== '' && (noteStem + ext).toLowerCase() === oldNameLower) {
			// A stem that itself ends in `.md` (`notes.md.md`): Rust resolves `[[notes.md]]`
			// to it by note name when no file `notes.md` exists.
			written = prefix + newName;
		} else {
			return fullMatch;
		}
		if (resolveWikilinkCached(trimmed, before, vaultRoot) !== oldPath) return fullMatch;
		if (pathForm !== null && resolveWikilinkCached(written, after, vaultRoot) !== newPath) {
			written = pathForm;
		}
		let result = '[[' + written;
		if (heading !== undefined) {
			result += '#' + heading;
		}
		if (display !== undefined) {
			result += '|' + display;
		}
		result += ']]';
		return result;
	});
}
