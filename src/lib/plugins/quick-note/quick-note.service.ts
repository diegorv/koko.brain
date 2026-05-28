import dayjs from 'dayjs';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import {
	buildQuickNotePath,
	getQuickNoteTitle,
	buildQuickNoteVariables,
} from './quick-note.logic';

/**
 * Creates and opens a new quick note instantly via the in-editor note-
 * composer surface (Cmd+N). The filename includes a millisecond
 * timestamp to ensure uniqueness. Shares folder / filename / template
 * configuration with the popover composer and the clipboard shortcut
 * through `settingsStore.quickCapture` — the `note` kind covers this
 * surface.
 */
export async function createQuickNote(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const quickCapture = settingsStore.quickCapture;
	const periodicNotesSettings = settingsStore.periodicNotes;
	const date = dayjs();

	const filePath = buildQuickNotePath(
		vaultPath,
		periodicNotesSettings.folder,
		quickCapture.folderFormat,
		quickCapture.filenameFormat,
		date,
	);

	const title = getQuickNoteTitle(quickCapture.filenameFormat, date);
	const noteTemplate = quickCapture.templates.note;
	const templatePath = noteTemplate ? `${vaultPath}/${noteTemplate}` : undefined;
	const customVariables = buildQuickNoteVariables(date, periodicNotesSettings);

	await openOrCreateNote({
		filePath,
		templatePath,
		title,
		customVariables,
	});
}
