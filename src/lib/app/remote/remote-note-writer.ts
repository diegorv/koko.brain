import { NoteConflictError } from '#lib/contracts/note-conflict.js';
import type { NoteWriter } from '#lib/core/editor/note-write.port.js';
import { REMOTE_CONFLICT_CODE, RemoteCallError, type RemoteInvoke } from './remote-transport';

/**
 * The browser's note writer over the session's `invoke`: plugin-fs
 * `write_text_file` in the shape the bridge stand-in forwards a
 * `writeTextFile` (the text as `{ text }`, the percent-encoded path in the
 * headers), plus the tab's base in a `base` header. The host writes only
 * when the note on disk still holds the base (`src-tauri/src/remote/write.rs`);
 * its conflict refusal becomes `NoteConflictError`.
 */
export function createRemoteNoteWriter(invoke: RemoteInvoke): NoteWriter {
	return async (path, content, base) => {
		try {
			await invoke('plugin:fs|write_text_file', { text: content }, { path: encodeURIComponent(path), base });
		} catch (err) {
			if (err instanceof RemoteCallError && err.code === REMOTE_CONFLICT_CODE) throw new NoteConflictError(path, err);
			throw err;
		}
	};
}
