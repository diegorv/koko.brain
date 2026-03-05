import dayjs from 'dayjs';
import { readDir, exists } from '@tauri-apps/plugin-fs';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { oneOnOneStore } from './one-on-one.store.svelte';
import {
	buildOneOnOnePath,
	buildOneOnOneVariables,
	loadPeopleFromEntries,
	mergePeopleLists,
} from './one-on-one.logic';
import { error } from '$lib/utils/debug';

/**
 * Loads people from a single folder and returns them tagged with the given context.
 * Returns an empty list if the folder does not exist.
 */
async function loadPeopleFromFolder(
	vaultPath: string,
	folder: string,
	context: 'work' | 'personal',
) {
	if (!folder) return [];
	const folderPath = `${vaultPath}/${folder}`;
	const folderExists = await exists(folderPath);
	if (!folderExists) return [];
	const entries = await readDir(folderPath);
	return loadPeopleFromEntries(entries, folderPath, context);
}

/**
 * Scans both the work and personal people folders in the vault and populates the store.
 * Work people appear first (alphabetically), followed by personal people (alphabetically).
 * If a folder does not exist, it is silently skipped.
 */
export async function loadPeople(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const { workPeopleFolder, peopleFolder } = settingsStore.oneOnOne;

	try {
		const [workPeople, personalPeople] = await Promise.all([
			loadPeopleFromFolder(vaultPath, workPeopleFolder, 'work'),
			loadPeopleFromFolder(vaultPath, peopleFolder, 'personal'),
		]);
		oneOnOneStore.setPeople(mergePeopleLists(workPeople, personalPeople));
	} catch (err) {
		error('ONE_ON_ONE', 'Failed to load people:', err);
		oneOnOneStore.setPeople([]);
	}
}

/**
 * Creates and opens a new 1:1 note for the given person.
 * The note is placed in the periodic notes base folder with date-based subfolders.
 */
export async function createOneOnOneNote(personName: string): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const oneOnOneSettings = settingsStore.oneOnOne;
	const periodicNotesSettings = settingsStore.periodicNotes;
	const date = dayjs();

	const filePath = buildOneOnOnePath(
		vaultPath,
		periodicNotesSettings.folder,
		oneOnOneSettings.folderFormat,
		oneOnOneSettings.filenameFormat,
		personName,
		date,
	);

	const title = date.format(oneOnOneSettings.filenameFormat.replace('{person}', `[${personName}]`));
	const templatePath = oneOnOneSettings.templatePath
		? `${vaultPath}/${oneOnOneSettings.templatePath}`
		: undefined;
	const customVariables = buildOneOnOneVariables(date, personName, periodicNotesSettings);

	await openOrCreateNote({
		filePath,
		templatePath,
		title,
		customVariables,
	});
}

/** Opens the person picker dialog, loading people first */
export async function openOneOnOnePicker(): Promise<void> {
	await loadPeople();
	oneOnOneStore.open();
}

/** Resets 1:1 notes plugin state */
export function resetOneOnOne(): void {
	oneOnOneStore.reset();
}
