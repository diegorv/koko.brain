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
	const fileName = filePath.split('/').pop() ?? filePath;
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

/**
 * Replaces all wikilinks targeting `oldName` with `newName` in the given content.
 * Case-insensitive matching on the target portion.
 * Preserves heading fragments, block references, and aliases.
 */
export function replaceWikilinks(content: string, oldName: string, newName: string): string {
	const oldNameLower = oldName.toLowerCase();
	const re = new RegExp(WIKILINK_RE.source, 'g');
	return content.replace(re, (fullMatch, target, heading, display) => {
		if ((target as string).trim().toLowerCase() !== oldNameLower) {
			return fullMatch;
		}
		let result = '[[' + newName;
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
