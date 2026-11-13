import { formatFileSize } from '#lib/features/file-history/file-history.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

const PLACEHOLDER = '--';

/** One read-only label and value of the panel's Info section. */
export interface NoteInfoRow {
	/** Row label, e.g. "Modified". */
	label: string;
	/** Formatted value, or a placeholder when it is unknown. */
	value: string;
}

/** Formats an index timestamp in seconds; `0` means the filesystem does not expose it. */
function formatTimestamp(seconds: number): string {
	if (!seconds) return PLACEHOLDER;
	const moment = new Date(seconds * 1000);
	const date = moment.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	// The system locale, not en-US: it is what carries the 12-hour or 24-hour clock setting.
	const time = moment.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	return `${date}, ${time}`;
}

/**
 * Builds the Info section rows from a note's index entry. `null` is a note the
 * index does not have (not saved yet, or the read failed): every value is a placeholder.
 */
export function buildNoteInfoRows(entry: NoteEntryV2 | null): NoteInfoRow[] {
	return [
		{ label: 'Modified', value: entry ? formatTimestamp(entry.modifiedAt) : PLACEHOLDER },
		{ label: 'Created', value: entry ? formatTimestamp(entry.createdAt) : PLACEHOLDER },
		{ label: 'Words', value: entry ? String(entry.wordCount) : PLACEHOLDER },
		{ label: 'Size', value: entry ? formatFileSize(entry.size) : PLACEHOLDER },
	];
}
