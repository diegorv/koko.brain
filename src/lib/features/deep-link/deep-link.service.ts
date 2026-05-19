import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { readText as readClipboardText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import dayjs from 'dayjs';
import { toast } from 'svelte-sonner';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { pathExists, readText, writeText } from '$lib/core/filesystem/fs-rust.service';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { openOrCreateDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { deepLinkStore } from './deep-link.store.svelte';
import {
	parseDeepLinkUri,
	renderCaptureBody,
	resolveFilePath,
	injectTagsIntoContent,
	injectTitleIntoContent,
} from './deep-link.logic';
import type { DeepLinkAction, DailyAction, NewAction, CaptureAction } from './deep-link.types';
import { buildPeriodicNotePath } from '$lib/plugins/periodic-notes/periodic-notes.logic';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { buildQuickNotePath, getQuickNoteTitle, buildQuickNoteVariables } from '$lib/plugins/quick-note/quick-note.logic';
import { processTemplate } from '$lib/utils/template';
import { debug, error } from '$lib/utils/debug';

/**
 * Registers a listener for deep-link URL events from the Tauri deep-link plugin.
 * Also checks for a cold-start URL (app launched via URI before listener was ready).
 *
 * Follows the same pattern as `registerMenuSettingsListener` in tauri-listeners.service.ts.
 * Returns a cleanup function to unsubscribe.
 */
export function registerDeepLinkListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;

	// Listen for URLs while app is running
	onOpenUrl((urls) => {
		for (const url of urls) {
			handleDeepLinkUrl(url);
		}
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('DEEP_LINK', 'Failed to register deep-link listener:', err);
	});

	// Check for cold-start URL (app launched via deep link)
	getCurrent().then((urls) => {
		if (cancelled || !urls) return;
		for (const url of urls) {
			handleDeepLinkUrl(url);
		}
	}).catch((err) => {
		error('DEEP_LINK', 'Failed to get current deep-link URLs:', err);
	});

	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/**
 * Handles a single deep-link URL string.
 * Parses the URI, resolves the vault, and dispatches the action.
 */
export async function handleDeepLinkUrl(url: string): Promise<void> {
	debug('DEEP_LINK', 'Received URL:', url);

	const result = parseDeepLinkUri(url);
	if (!result.ok) {
		error('DEEP_LINK', 'Failed to parse URI:', result.error);
		toast.error(`Invalid deep link: ${result.error}`);
		return;
	}

	await resolveAndDispatch(result.action);
}

/**
 * Resolves a vault name to a path from the recent vaults list.
 * Uses case-insensitive name matching.
 *
 * @returns The vault path if found, null otherwise.
 */
export function resolveVaultPath(vaultName: string): string | null {
	const lowerName = vaultName.toLowerCase();
	const match = vaultStore.recentVaults.find(
		(v) => v.name.toLowerCase() === lowerName,
	);
	return match?.path ?? null;
}

/**
 * Resolves the vault from a deep-link action and dispatches it.
 * If the target vault is already open, executes immediately.
 * If a different vault is needed, stores the action as pending and triggers a vault switch.
 */
export async function resolveAndDispatch(action: DeepLinkAction): Promise<void> {
	const resolvedPath = resolveVaultPath(action.vault);
	if (!resolvedPath) {
		error('DEEP_LINK', `Vault not found: "${action.vault}"`);
		toast.error(`Vault "${action.vault}" not found. Open it in KokoBrain first.`);
		return;
	}

	if (vaultStore.path === resolvedPath) {
		// Same vault — execute immediately
		debug('DEEP_LINK', 'Same vault, executing action:', action.type);
		await executeAction(action, resolvedPath);
	} else {
		// Different vault — store pending action and switch
		debug('DEEP_LINK', 'Switching vault to:', resolvedPath);
		deepLinkStore.setPendingAction(action);
		vaultStore.open(resolvedPath);
		// initializeVault will run reactively, then call executePendingAction()
	}
}

/**
 * Executes a deep-link action against the currently open vault.
 * Dispatches to existing services based on action type.
 */
export async function executeAction(action: DeepLinkAction, vaultPath: string): Promise<void> {
	try {
		switch (action.type) {
			case 'open': {
				const filePath = action.file ?? action.path;
				if (filePath) {
					const fullPath = resolveFilePath(vaultPath, filePath);
					debug('DEEP_LINK', 'Opening file:', fullPath);
					await openFileInEditor(fullPath);
				}
				// If no file specified, just opening the vault is sufficient
				break;
			}

			case 'new':
				await executeNewAction(action, vaultPath);
				break;

			case 'search':
				debug('DEEP_LINK', 'Opening search with query:', action.query);
				searchStore.setQuery(action.query);
				searchStore.setOpen(true);
				break;

			case 'daily':
				await executeDailyAction(action, vaultPath);
				break;

			case 'capture':
				await executeCaptureAction(action, vaultPath);
				break;
		}
	} catch (err) {
		error('DEEP_LINK', `Failed to execute action "${action.type}":`, err);
		toast.error(`Failed to execute deep link action: ${action.type}`);
	}
}

/**
 * Resolves the actual content for a deep-link action.
 * If `clipboard` is true, reads from system clipboard via Tauri plugin.
 * Falls back to the `content` param if clipboard read fails.
 */
export async function resolveContent(action: { content?: string; clipboard?: boolean }): Promise<string> {
	if (action.clipboard) {
		try {
			const clipboardText = await readClipboardText();
			if (clipboardText) return clipboardText;
		} catch (err) {
			error('DEEP_LINK', 'Failed to read clipboard, falling back to content param:', err);
		}
	}
	return action.content ?? '';
}

/**
 * Handles the `new` action — creates a note with optional append, prepend,
 * overwrite, clipboard, and silent modes.
 */
async function executeNewAction(action: NewAction, vaultPath: string): Promise<void> {
	const noteName = action.name ?? action.file ?? '';
	const fullPath = resolveFilePath(vaultPath, noteName);
	const fileName = fullPath.split('/').pop() ?? noteName;
	const content = await resolveContent(action);
	debug('DEEP_LINK', 'Creating note:', fullPath, {
		silent: action.silent, append: action.append,
		prepend: action.prepend, overwrite: action.overwrite, clipboard: action.clipboard,
	});

	// Prepend: insert new content before existing content
	if (action.prepend) {
		const fileExists = await pathExists(vaultPath, fullPath);
		if (fileExists) {
			const existing = await readText(vaultPath, fullPath);
			// markRecentSave: tell the watcher we wrote this file ourselves so
			// rebuildAllIndexes is skipped 500 ms later (areAllRecentSaves).
			markRecentSave(fullPath);
			await writeText(vaultPath, fullPath, content + '\n' + existing);
			// Tree structure unchanged (file already existed) - skip refreshTree.
			if (!action.silent) {
				await openFileInEditor(fullPath);
			}
			return;
		}
		// File doesn't exist - fall through to create
	}

	// Append: add new content after existing content
	if (action.append) {
		const fileExists = await pathExists(vaultPath, fullPath);
		if (fileExists) {
			const existing = await readText(vaultPath, fullPath);
			markRecentSave(fullPath);
			await writeText(vaultPath, fullPath, existing + '\n' + content);
			// Tree structure unchanged - skip refreshTree.
			if (!action.silent) {
				await openFileInEditor(fullPath);
			}
			return;
		}
		// File doesn't exist - fall through to create
	}

	// Overwrite: replace file regardless of existence
	if (action.overwrite) {
		const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
		await invoke('create_folder', { path: parentDir });
		markRecentSave(fullPath);
		await writeText(vaultPath, fullPath, content);
		// File may be new - refresh in background so callback returns fast.
		void refreshTree();
		if (!action.silent) {
			await openFileInEditor(fullPath);
		}
		return;
	}

	// Create: default behavior
	if (action.silent) {
		const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
		await invoke('create_folder', { path: parentDir });
		markRecentSave(fullPath);
		await writeText(vaultPath, fullPath, content);
		void refreshTree();
	} else {
		await openOrCreateNote({
			filePath: fullPath,
			title: fileName.replace(/\.md$/, ''),
			inlineTemplate: content || undefined,
		});
	}
}

/**
 * Handles the `daily` action — opens/creates today's daily note.
 * If content is provided (via clipboard or content param), appends or prepends it.
 */
async function executeDailyAction(action: DailyAction, vaultPath: string): Promise<void> {
	debug('DEEP_LINK', 'Opening daily note', {
		append: action.append, prepend: action.prepend, clipboard: action.clipboard,
	});

	// Always ensure the daily note exists and is opened
	await openOrCreateDailyNote();

	// If content is being sent, add it to the daily note
	const content = await resolveContent(action);
	if (!content) return;

	const settings = settingsStore.periodicNotes;
	const filePath = buildPeriodicNotePath(
		vaultPath,
		settings.folder,
		settings.daily.format,
		dayjs(),
	);

	const fileExists = await pathExists(vaultPath, filePath);
	if (!fileExists) return;

	const existing = await readText(vaultPath, filePath);

	markRecentSave(filePath);
	if (action.prepend) {
		await writeText(vaultPath, filePath, content + '\n' + existing);
	} else {
		// Default to append
		await writeText(vaultPath, filePath, existing + '\n' + content);
	}

	// Daily note exists already (line above bails out if not) — tree structure
	// is unchanged, so refreshTree would re-scan the full vault for nothing.
}

/**
 * Handles the v2 `capture` action — creates a quick note from a typed
 * `CaptureAction`. Branches on `action.kind`:
 *
 * - `note` / `clip` / `link`: renders the body via `renderCaptureBody`, applies
 *   the user's quick-note template if configured, injects the link `title` as
 *   YAML frontmatter (link kind only), and merges `tags` into frontmatter.
 * - `shot` / `file`: renders a `file://` CommonMark link/embed to the local
 *   path (no copy into the vault) and writes through the same quick-note path
 *   as the text kinds. The note breaks if the user later moves or deletes the
 *   referenced file; durable attachments are a future change.
 */
async function executeCaptureAction(action: CaptureAction, vaultPath: string): Promise<void> {
	const quickNote = settingsStore.quickNote;
	const periodicNotes = settingsStore.periodicNotes;
	const date = dayjs();

	const filePath = buildQuickNotePath(
		vaultPath,
		periodicNotes.folder,
		quickNote.folderFormat,
		quickNote.filenameFormat,
		date,
	);

	debug('DEEP_LINK', 'Capturing note:', filePath, { kind: action.kind });

	const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
	await invoke('create_folder', { path: parentDir });

	const body = renderCaptureBody(action);
	let fileContent = body;

	if (quickNote.templatePath) {
		const templateFullPath = `${vaultPath}/${quickNote.templatePath}`;
		try {
			const template = await readText(vaultPath, templateFullPath);
			const fileTitle = getQuickNoteTitle(quickNote.filenameFormat, date);
			const vars = buildQuickNoteVariables(date, periodicNotes);
			vars.content = body;
			// Expose the deep-link `title` (link kind only) to user templates via
			// `<% title %>`. Falls back to the filename-derived title so templates
			// that reference the placeholder always resolve. The post-template
			// `injectTitleIntoContent` below remains the source of truth for the
			// YAML `title:` field on link captures.
			const linkTitle = action.kind === 'link' ? action.title : undefined;
			vars.title = linkTitle ?? fileTitle;
			// v2 provenance: expose every common + link-specific field. Default
			// missing fields to '' so `<% sourceUrl %>` etc. render as empty
			// instead of falling through to the literal-name return path in
			// template.ts:204.
			vars.kind = action.kind;
			vars.sourceApp = action.sourceApp ?? '';
			vars.sourceTitle = action.sourceTitle ?? '';
			vars.sourceUrl = action.sourceUrl ?? '';
			vars.capturedAt = action.capturedAt ?? '';
			vars.url = action.kind === 'link' ? action.url : '';
			const processed = processTemplate(template, fileTitle, vars);
			fileContent = processed + '\n' + body;
		} catch {
			// Template not found — save raw body
		}
	}

	if (action.kind === 'link' && action.title) {
		fileContent = injectTitleIntoContent(fileContent, action.title);
	}

	if (action.tags && action.tags.length > 0) {
		fileContent = injectTagsIntoContent(fileContent, action.tags);
	}

	markRecentSave(filePath);
	await writeText(vaultPath, filePath, fileContent);
	// Capture writes a fresh quick-note path -> tree usually gains a node.
	// Refresh in the background so the deep-link callback returns fast.
	void refreshTree();
}

/**
 * Executes a pending deep-link action after vault initialization completes.
 * Called at the end of initializeVault() in app-lifecycle.service.ts.
 */
export async function executePendingAction(): Promise<void> {
	const action = deepLinkStore.consumePendingAction();
	if (!action) return;

	const vaultPath = vaultStore.path;
	if (!vaultPath) {
		error('DEEP_LINK', 'Cannot execute pending action: no vault open');
		return;
	}

	debug('DEEP_LINK', 'Executing pending action:', action.type);
	await executeAction(action, vaultPath);
}

/** Resets all deep-link state. Called during teardownVault(). */
export function resetDeepLink(): void {
	deepLinkStore.reset();
}
