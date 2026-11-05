import { stem } from '#lib/utils/path.js';

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
 * Replaces all wikilinks whose note stem is `oldName` with `newName` in the given content.
 * Case-insensitive matching on the stem. Keeps the target's folder prefix and its
 * `.md` / `.markdown` extension as written (`[[folder/Old.md]]` -> `[[folder/New.md]]`),
 * so path-qualified links that Rust resolves to the renamed note keep pointing at it.
 * Preserves heading fragments, block references, and aliases.
 */
export function replaceWikilinks(content: string, oldName: string, newName: string): string {
	const oldNameLower = oldName.toLowerCase();
	const re = new RegExp(WIKILINK_RE.source, 'g');
	return content.replace(re, (fullMatch, target, heading, display) => {
		const { prefix, noteStem, ext } = splitTarget((target as string).trim());
		let written: string;
		if (noteStem.toLowerCase() === oldNameLower) {
			written = newName + ext;
		} else if (ext !== '' && (noteStem + ext).toLowerCase() === oldNameLower) {
			// A stem that itself ends in `.md` (`notes.md.md`): Rust resolves `[[notes.md]]`
			// to it by note name when no file `notes.md` exists.
			written = newName;
		} else {
			return fullMatch;
		}
		let result = '[[' + prefix + written;
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
