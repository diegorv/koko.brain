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
 * Creates and opens a new quick note instantly.
 * The filename includes a millisecond timestamp to ensure uniqueness.
 * If the file already exists (extremely unlikely), it is simply opened.
 */
export async function createQuickNote(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const quickNoteSettings = settingsStore.quickNote;
	const periodicNotesSettings = settingsStore.periodicNotes;
	const date = dayjs();

	const filePath = buildQuickNotePath(
		vaultPath,
		periodicNotesSettings.folder,
		quickNoteSettings.folderFormat,
		quickNoteSettings.filenameFormat,
		date,
	);

	const title = getQuickNoteTitle(quickNoteSettings.filenameFormat, date);
	const templatePath = quickNoteSettings.templatePath
		? `${vaultPath}/${quickNoteSettings.templatePath}`
		: undefined;
	const customVariables = buildQuickNoteVariables(date, periodicNotesSettings);

	await openOrCreateNote({
		filePath,
		templatePath,
		title,
		customVariables,
	});
}
