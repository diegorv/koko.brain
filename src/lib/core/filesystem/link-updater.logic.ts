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

/**
 * Checks whether a content string contains any wikilinks targeting the given name.
 * Case-insensitive. Useful for quickly filtering which files need updating.
 */
export function contentHasWikilinkTo(content: string, noteName: string): boolean {
	const noteNameLower = noteName.toLowerCase();
	const re = new RegExp(WIKILINK_RE.source, 'g');
	let match: RegExpExecArray | null;
	while ((match = re.exec(content)) !== null) {
		if (match[1].trim().toLowerCase() === noteNameLower) {
			return true;
		}
	}
	return false;
}

/**
 * Finds all file paths whose content contains a wikilink to the given note name.
 * Excludes the source file itself to avoid self-referencing updates.
 */
export function findFilesLinkingTo(
	noteName: string,
	noteContents: Map<string, string>,
	excludePath: string,
): string[] {
	const results: string[] = [];
	for (const [filePath, content] of noteContents) {
		if (filePath === excludePath) continue;
		if (contentHasWikilinkTo(content, noteName)) {
			results.push(filePath);
		}
	}
	return results;
}
