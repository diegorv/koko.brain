/**
 * Tracks the last content seen by the per-file index updaters, keyed by
 * absolute path. Both the layout content-effect (1 s debounce during typing)
 * and `notifyAfterSave` (at save time) call the same index updaters — if
 * both run for the same (path, content) pair, the second call is a no-op
 * in terms of output but still spends 5-15 ms re-parsing wikilinks, tags,
 * tasks, etc.
 *
 * The stored string is a REFERENCE, not a copy — V8 shares the same heap
 * object with `noteContents.get(path)`, so the total memory cost is a
 * Map entry per indexed file (~50 bytes × N files ≈ 90 KB for a 1870-note
 * vault). Typing produces a new content string every keystroke, so the
 * previous reference is freed when `markIndexed` overwrites it.
 */
const lastIndexedContent = new Map<string, string>();

/** Returns true if the given (path, content) was the most recent input to the
 *  shared updaters. Cheap — reference equality first, then length+char cmp. */
export function isAlreadyIndexed(path: string, content: string): boolean {
	return lastIndexedContent.get(path) === content;
}

/** Records that the given (path, content) has just been sent through the
 *  shared updaters. Subsequent callers with the same pair will be skipped by
 *  `isAlreadyIndexed`. */
export function markIndexed(path: string, content: string): void {
	lastIndexedContent.set(path, content);
}

/** Removes the signature for a path. Call when the file is deleted so a
 *  later re-creation with identical content is not silently skipped. */
export function clearIndexedEntry(path: string): void {
	lastIndexedContent.delete(path);
}

/** Drops every signature. Called during vault teardown. */
export function clearAllIndexed(): void {
	lastIndexedContent.clear();
}
