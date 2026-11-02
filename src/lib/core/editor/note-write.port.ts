import { writeTextFile } from '@tauri-apps/plugin-fs';

/**
 * Writes `content` to the note at `path`. `base` is the content the editor
 * tab was loaded or last saved with: a writer that checks the disk (the
 * browser's, in `app/remote`) refuses the write when the note no longer
 * holds it, by throwing `NoteConflictError`.
 */
export type NoteWriter = (path: string, content: string, base: string) => Promise<void>;

/** The desktop's writer: plugin-fs, with no disk check. */
const desktopWriter: NoteWriter = (path, content) => writeTextFile(path, content);

let writer: NoteWriter = desktopWriter;

/**
 * Sets the writer the editor saves through; `null` restores the desktop's.
 * `core/` cannot import `app/` (ADR-0003), so the browser's session installs
 * its writer here.
 */
export function setNoteWriter(next: NoteWriter | null): void {
	writer = next ?? desktopWriter;
}

/** Writes a note through the current writer. */
export function writeNote(path: string, content: string, base: string): Promise<void> {
	return writer(path, content, base);
}
