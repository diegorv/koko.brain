import { ask } from '@tauri-apps/plugin-dialog';
import { saveAllDirtyTabs } from '#lib/core/editor/editor.service.js';
import { flushSettingsPersistence } from '#lib/core/settings/settings-persistence.svelte.js';
import { drainPendingWrites } from './write-barrier.service';

/**
 * Puts every pending write on disk before the app goes away: the window
 * close, Quit (Cmd+Q, app menu) and Restart to update all run it first.
 * Saves dirty tabs; if any save fails, asks before discarding them. Then
 * drains the registered write barriers (calendar writes and their index
 * updates) and flushes the debounced settings write.
 * A rejection from a drain or the flush propagates to the caller.
 * @returns true to go on exiting, false when the user cancelled at the discard prompt
 */
export async function prepareForExit(): Promise<boolean> {
	if (!(await confirmDiscardFailedSaves(await saveAllDirtyTabs(), 'Close'))) return false;
	await drainPendingWrites();
	// The settings effect debounces its write by 500 ms; without this the last
	// change before exiting is lost. After the discard prompt so a cancelled
	// exit does not flush.
	await flushSettingsPersistence();
	return true;
}

/**
 * Asks whether to go on and lose the unsaved changes of tabs whose save
 * failed. No prompt when nothing failed.
 * @param failedPaths - paths returned by `saveAllDirtyTabs()`
 * @param verb - what goes on anyway, e.g. "Close" or "Switch"
 * @returns true when nothing failed or the user agreed to discard
 */
export async function confirmDiscardFailedSaves(failedPaths: string[], verb: string): Promise<boolean> {
	if (failedPaths.length === 0) return true;
	const fileNames = failedPaths.map((p) => p.split('/').pop()).join(', ');
	return ask(
		`Failed to save: ${fileNames}. ${verb} anyway and lose unsaved changes?`,
		{ title: 'Unsaved Changes', kind: 'warning', okLabel: `${verb} Anyway`, cancelLabel: 'Cancel' },
	);
}
