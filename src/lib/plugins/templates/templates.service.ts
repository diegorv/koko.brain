import { readDir, exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { templatesStore } from './templates.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import {
	buildTemplatesFolderPath,
	extractTitleFromPath,
	type TemplateEntry,
} from './templates.logic';
import { error } from '$lib/utils/debug';

/**
 * Scans the _templates/ folder in the vault and populates the templates store.
 * If the folder does not exist, the store is set to an empty list.
 */
export async function loadTemplates(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const folderPath = buildTemplatesFolderPath(vaultPath, settingsStore.templates.folder);

	try {
		const folderExists = await exists(folderPath);
		if (!folderExists) {
			templatesStore.setTemplates([]);
			return;
		}

		const entries = await readDir(folderPath);
		const templates: TemplateEntry[] = entries
			.filter((e) => !e.isDirectory && e.name.endsWith('.md'))
			.map((e) => {
				const dotIndex = e.name.lastIndexOf('.');
				const name = dotIndex > 0 ? e.name.substring(0, dotIndex) : e.name;
				return { name, path: `${folderPath}/${e.name}` };
			})
			.sort((a, b) => a.name.localeCompare(b.name));

		templatesStore.setTemplates(templates);
	} catch (err) {
		error('TEMPLATES', 'Failed to load templates:', err);
		templatesStore.setTemplates([]);
	}
}

/**
 * Creates a new file from a template.
 * Reads the template, processes `<% %>` expressions using the given file name as title,
 * writes the new file to the vault root, and opens it in the editor.
 */
export async function createFileFromTemplate(templatePath: string, fileName: string): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const fullFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
	const title = extractTitleFromPath(fullFileName);
	const filePath = `${vaultPath}/${fullFileName}`;

	await openOrCreateNote({
		filePath,
		templatePath,
		title,
	});
}

/**
 * Ensures the _templates/ folder and default template files exist.
 * Reads templatePath from DEFAULT_SETTINGS and creates any missing files as empty .md.
 */
export async function ensureTemplatesFolder(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const folderPath = buildTemplatesFolderPath(vaultPath, settingsStore.templates.folder);
	const { daily, weekly, monthly, quarterly } = settingsStore.periodicNotes;
	const templatePaths = [daily, weekly, monthly, quarterly]
		.map((s) => s.templatePath)
		.filter((p): p is string => !!p);

	const quickNoteTemplatePath = settingsStore.quickNote.templatePath;
	if (quickNoteTemplatePath) {
		templatePaths.push(quickNoteTemplatePath);
	}

	const oneOnOneTemplatePath = settingsStore.oneOnOne.templatePath;
	if (oneOnOneTemplatePath) {
		templatePaths.push(oneOnOneTemplatePath);
	}

	try {
		const folderExists = await exists(folderPath);
		if (!folderExists) {
			await mkdir(folderPath, { recursive: true });
		}

		let created = false;
		for (const relPath of templatePaths) {
			const absPath = `${vaultPath}/${relPath}`;
			if (!(await exists(absPath))) {
				await writeTextFile(absPath, '');
				created = true;
			}
		}

		if (!folderExists || created) {
			await refreshTree();
		}
	} catch (err) {
		error('TEMPLATES', 'Failed to create templates folder:', err);
	}
}

/** Opens the template picker dialog, loading templates first */
export async function openTemplatePicker(): Promise<void> {
	await loadTemplates();
	templatesStore.open();
}

/** Resets template plugin state */
export function resetTemplates(): void {
	templatesStore.reset();
}
