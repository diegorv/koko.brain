/** Where a Quick Switcher "Create" puts its note, or why it refuses the query. */
export type CreatePath =
	| {
			/** Folder under the vault, `/`-separated; `''` is the vault root. */
			folder: string;
			/** File name of the note, ending in `.md`. */
			name: string;
	  }
	| {
			/** Why the query cannot be created, ready for a toast. */
			error: string;
	  };

/**
 * Splits a Quick Switcher query into the target folder and the note name: the
 * last `/` segment is the note (`.md` appended unless present), the segments
 * before it the folder under the vault. Refuses an empty (or blank) segment,
 * and any segment starting with `.`: Rust `ensure_safe_write_path` rejects
 * only `..`, so `.kokobrain/x` would write into the app data dir (ADR-0019),
 * and `insertTreeNode` drops dot-segment paths, so the note would never show.
 */
export function parseCreatePath(query: string): CreatePath {
	const trimmed = query.trim();
	const segments = trimmed.split('/');
	if (segments.some((s) => s.trim() === '')) {
		return { error: `Cannot create "${trimmed}": a folder or note name in the path is empty.` };
	}
	if (segments.some((s) => s.startsWith('.'))) {
		return { error: `Cannot create "${trimmed}": folder and note names cannot start with ".".` };
	}
	const last = segments[segments.length - 1];
	return {
		folder: segments.slice(0, -1).join('/'),
		name: last.endsWith('.md') ? last : `${last}.md`,
	};
}

/** The Create row's target: "in <folder>", or "in vault root" for `''`. */
export function createTargetLabel(folder: string): string {
	return folder ? `in ${folder}` : 'in vault root';
}
