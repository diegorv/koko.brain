import dayjs from 'dayjs';
import { readDir, exists } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { applyExplicitOrganization } from '#lib/core/note-creator/explicit-organization.logic.js';
import { ensureFrontmatterLink } from '#lib/core/frontmatter/properties.logic.js';
import { noteActionBarActionsStore } from '#lib/features/note-action-bar/note-action-bar-actions.store.svelte.js';
import { oneOnOneStore, type OneOnOneSelectHandler } from './one-on-one.store.svelte';
import {
	buildOneOnOnePath,
	buildOneOnOneVariables,
	loadPeopleFromEntries,
	mergePeopleLists,
} from './one-on-one.logic';
import { error } from '#lib/utils/debug.js';
import { stem } from '#lib/utils/path.js';

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
 * Creates and opens a new 1:1 note for the given person, or opens the one
 * that already exists at the same path. The note is placed in the periodic
 * notes base folder with date-based subfolders. A created note always has
 * `_related_to: [[person]]`, the link that makes it count as a 1:1, even when
 * the template does not write it.
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
		buildContent: (content) =>
			applyExplicitOrganization(ensureFrontmatterLink(content, '_related_to', personName), settingsStore.explicitOrganization),
	});
}

/**
 * Registers "New 1:1" into the note action bar for Person notes; the person
 * is the note's file name. Failures show a toast, as the picker does.
 * Returns an unregister function.
 */
export function registerOneOnOneActionBarAction(): () => void {
	return noteActionBarActionsStore.register({
		id: 'new-one-on-one',
		label: 'New 1:1',
		typeName: 'Person',
		run: async (path) => {
			try {
				await createOneOnOneNote(stem(path));
			} catch (err) {
				error('ONE_ON_ONE', 'Failed to create 1:1 note:', err);
				toast.error('Failed to create 1:1 note.');
			}
		},
	});
}

/**
 * Opens the person picker dialog, loading people first. Picking a person
 * creates the 1:1 note, or calls `onSelect` instead when one is given.
 */
export async function openOneOnOnePicker(onSelect?: OneOnOneSelectHandler): Promise<void> {
	await loadPeople();
	oneOnOneStore.open(onSelect);
}

/** Resets 1:1 notes plugin state */
export function resetOneOnOne(): void {
	oneOnOneStore.reset();
}
