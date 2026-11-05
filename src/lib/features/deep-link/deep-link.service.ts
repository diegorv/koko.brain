import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { switchVault } from '#lib/core/vault/vault.service.js';
import { openSearch } from '#lib/features/search/open-search.service.js';
import { openFileInEditor, saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { applyExplicitOrganization, withUnorganizedFlag } from '#lib/core/note-creator/explicit-organization.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { addToTree } from '#lib/core/filesystem/fs.service.js';
import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
import { markRecentSave, notifyAfterSave } from '#lib/core/editor/editor.hooks.js';
import { deepLinkStore } from './deep-link.store.svelte';
import { parseDeepLinkUri, resolveFilePath } from './deep-link.logic';
import type { DeepLinkAction, NewAction } from './deep-link.types';
import { debug, error } from '#lib/utils/debug.js';

/**
 * Serializes deep-link dispatch: actions like append/prepend do a
 * read-modify-write on note files, so two URLs handled concurrently would
 * read the same baseline and the last write would drop the other's content.
 * Same policy as the quick-capture listener queue.
 */
let dispatchQueue: Promise<void> = Promise.resolve();

function enqueueDeepLinkUrl(url: string): Promise<void> {
	dispatchQueue = dispatchQueue
		.then(() => handleDeepLinkUrl(url))
		.catch((err) => {
			// Keep the queue alive: one failed dispatch must not block the next.
			error('DEEP_LINK', 'Deep link dispatch failed:', err);
		});
	return dispatchQueue;
}

/** The action types whose handler lives outside deep-link and is registered. */
export type RegisteredDeepLinkActionType = 'daily' | 'capture';

/** Carries out one registered action against the open vault. */
export type DeepLinkActionHandler<T extends RegisteredDeepLinkActionType> = (
	action: Extract<DeepLinkAction, { type: T }>,
	vaultPath: string,
) => Promise<void>;

/** Registered handlers by type; each entry only receives actions of its key's type. */
const actionHandlers = new Map<RegisteredDeepLinkActionType, (action: DeepLinkAction, vaultPath: string) => Promise<void>>();

/**
 * Registers the handler of a deep-link action that needs code outside this
 * feature (`daily`, `capture`); `src/lib/app/` wires them in. A later
 * registration for the same type replaces the earlier one. Returns a function
 * that removes this handler.
 */
export function registerDeepLinkAction<T extends RegisteredDeepLinkActionType>(
	type: T,
	handler: DeepLinkActionHandler<T>,
): () => void {
	const entry = (action: DeepLinkAction, vaultPath: string) =>
		handler(action as Extract<DeepLinkAction, { type: T }>, vaultPath);
	actionHandlers.set(type, entry);
	return () => {
		if (actionHandlers.get(type) === entry) actionHandlers.delete(type);
	};
}

/** Runs the registered handler of `action`; throws when none is registered. */
async function runRegisteredAction(
	action: Extract<DeepLinkAction, { type: RegisteredDeepLinkActionType }>,
	vaultPath: string,
): Promise<void> {
	const handler = actionHandlers.get(action.type);
	if (!handler) throw new Error(`No handler registered for deep-link action "${action.type}"`);
	await handler(action, vaultPath);
}

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
			enqueueDeepLinkUrl(url);
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
			enqueueDeepLinkUrl(url);
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
		// initializeVault will run reactively, then call executePendingAction().
		// A cancelled switch opens nothing, so drop the action: left in the
		// slot, the next vault open would run it against the wrong vault.
		if (!(await switchVault(resolvedPath))) deepLinkStore.consumePendingAction();
	}
}

/**
 * Executes a deep-link action against the currently open vault.
 * Dispatches to existing services based on action type. A failure is
 * logged and toasted here, not thrown; the result says whether the action
 * ran (the composer capture path reports it back to the composer).
 */
export async function executeAction(action: DeepLinkAction, vaultPath: string): Promise<boolean> {
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
				openSearch(action.query);
				break;

			case 'daily':
			case 'capture':
				await runRegisteredAction(action, vaultPath);
				break;
		}
		return true;
	} catch (err) {
		error('DEEP_LINK', `Failed to execute action "${action.type}":`, err);
		toast.error(`Failed to execute deep link action: ${action.type}`);
		return false;
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
			const clipboardText = await readText();
			if (clipboardText) return clipboardText;
		} catch (err) {
			error('DEEP_LINK', 'Failed to read clipboard, falling back to content param:', err);
		}
	}
	return action.content ?? '';
}

/**
 * Saves the open tab of `path` when it has unsaved typing, before a deep
 * link writes the note from its disk copy and marks the tab saved (which
 * would otherwise drop that typing). Returns false, after a toast, when the
 * save failed: the caller must then write nothing, so the tab keeps its text.
 * A clean tab or a closed note returns true without writing.
 */
export async function saveOpenNoteBeforeWrite(path: string): Promise<boolean> {
	if (await saveFileByPath(path)) return true;
	toast.error('Deep link skipped: the open note could not be saved.');
	return false;
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

	// Overwrite saves too, so the replaced text gets a File History snapshot.
	if ((action.prepend || action.append || action.overwrite) && !(await saveOpenNoteBeforeWrite(fullPath))) {
		return;
	}

	// Prepend: insert new content before existing content
	if (action.prepend) {
		const fileExists = await exists(fullPath);
		if (fileExists) {
			const existing = await readTextFile(fullPath);
			const newContent = content + '\n' + existing;
			markRecentSave(fullPath);
			await writeTextFile(fullPath, newContent);
			// `'none'`: the merged content was just written to disk above.
			syncExternalContentToEditor(fullPath, newContent, true, 'none');
			notifyAfterSave(fullPath, newContent);
			if (!action.silent) {
				await openFileInEditor(fullPath);
			}
			return;
		}
		// File doesn't exist — fall through to create
	}

	// Append: add new content after existing content
	if (action.append) {
		const fileExists = await exists(fullPath);
		if (fileExists) {
			const existing = await readTextFile(fullPath);
			const newContent = existing + '\n' + content;
			markRecentSave(fullPath);
			await writeTextFile(fullPath, newContent);
			// `'none'`: the merged content was just written to disk above.
			syncExternalContentToEditor(fullPath, newContent, true, 'none');
			notifyAfterSave(fullPath, newContent);
			if (!action.silent) {
				await openFileInEditor(fullPath);
			}
			return;
		}
		// File doesn't exist — fall through to create
	}

	// Overwrite: replace file regardless of existence
	if (action.overwrite) {
		const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
		await mkdir(parentDir, { recursive: true });
		markRecentSave(fullPath);
		await writeTextFile(fullPath, content);
		// `'none'`: the overwritten content was just written to disk above.
		syncExternalContentToEditor(fullPath, content, true, 'none');
		notifyAfterSave(fullPath, content);
		// The file may be new; a no-op in the tree when it was already there.
		addToTree(fullPath);
		if (!action.silent) {
			await openFileInEditor(fullPath);
		}
		return;
	}

	// Create: default behavior. `resolveFilePath` keeps a name's own extension,
	// so only a Markdown target gets the `_organized` frontmatter.
	const markUnorganized = settingsStore.explicitOrganization && isMarkdownFile(fullPath);
	if (action.silent) {
		// Like openOrCreateNote on the non-silent path, never replace an
		// existing note here: replacing is the job of `overwrite=true`.
		if (await exists(fullPath)) {
			toast.info(`${fileName.replace(/\.md$/, '')} already exists; not overwritten. Use overwrite=true to replace it.`);
			return;
		}
		const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
		await mkdir(parentDir, { recursive: true });
		const created = applyExplicitOrganization(content, markUnorganized);
		markRecentSave(fullPath);
		await writeTextFile(fullPath, created);
		notifyAfterSave(fullPath, created);
		addToTree(fullPath);
	} else {
		await openOrCreateNote({
			filePath: fullPath,
			title: fileName.replace(/\.md$/, ''),
			inlineTemplate: content || undefined,
			buildContent: markUnorganized ? withUnorganizedFlag : undefined,
		});
	}
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
