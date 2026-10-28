import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { saveFileByPath, syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { notifyAfterSave } from '$lib/core/editor/editor.hooks';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	detectLossyFrontmatter,
	extractBody,
	parseFrontmatterProperties,
	rebuildContent,
	type LossyFrontmatterReason,
} from './properties.logic';
import type { Property } from './properties.types';

/**
 * Why `updateNoteFrontmatter` refused or failed:
 * - a `LossyFrontmatterReason`: the rewrite would lose data; nothing was written.
 * - `save-failed`: saving the open tab failed. The tab was restored and the
 *   editor already showed a toast, so the caller must not toast again.
 * - `vault-changed`: the vault switched while the write was in flight.
 * - `missing`: the closed note vanished between the read and the write.
 */
export type FrontmatterWriteReason = LossyFrontmatterReason | 'save-failed' | 'vault-changed' | 'missing';

/** Typed failure of `updateNoteFrontmatter`, so callers can roll back by reason. */
export class FrontmatterWriteError extends Error {
	/** What went wrong; see `FrontmatterWriteReason`. */
	readonly reason: FrontmatterWriteReason;
	/** The note the write targeted. */
	readonly path: string;

	constructor(reason: FrontmatterWriteReason, path: string) {
		super(`Frontmatter write ${reason}: ${path}`);
		this.name = 'FrontmatterWriteError';
		this.reason = reason;
		this.path = path;
	}
}

/** Throws `vault-changed` when the vault is no longer the one captured at entry. */
function assertVault(vault: string | null, path: string): void {
	if (vaultStore.path !== vault) throw new FrontmatterWriteError('vault-changed', path);
}

/** The open tab for `path`, if any. */
function findTab(path: string) {
	return editorStore.tabs.find((t) => t.path === path);
}

/**
 * Rewrites one note's frontmatter by path without losing data, and returns the
 * written content (the unchanged base when `mutate` changes nothing).
 *
 * - Open note: patches the tab's content, keeping unsaved body edits, and saves
 *   the tab at once. This also flushes a pending body edit before autosave would.
 * - Closed note: writes the file, then runs the full after-save path
 *   (`notifyAfterSave`). It never re-creates a note that vanished during the read.
 *
 * Read errors propagate as-is. Every other failure is a `FrontmatterWriteError`.
 */
export async function updateNoteFrontmatter(
	path: string,
	mutate: (props: Property[]) => Property[],
): Promise<string> {
	const vault = vaultStore.path;
	return attempt(path, mutate, vault);
}

/**
 * One pass of `updateNoteFrontmatter`. It restarts itself at most once: the
 * restart finds the tab with no `await` in between, so it takes the tab branch.
 */
async function attempt(
	path: string,
	mutate: (props: Property[]) => Property[],
	vault: string | null,
): Promise<string> {
	const tab = findTab(path);
	let base: string;
	if (tab) {
		base = tab.content;
	} else {
		base = await readTextFile(path);
		assertVault(vault, path);
	}

	const lossy = detectLossyFrontmatter(base);
	if (lossy !== null) throw new FrontmatterWriteError(lossy, path);

	const next = rebuildContent(mutate(parseFrontmatterProperties(base)), extractBody(base));
	if (next === base) return base;

	if (tab) {
		syncExternalContentToEditor(path, next, false, 'none');
		const saved = await saveFileByPath(path);
		assertVault(vault, path);
		if (!saved) {
			syncExternalContentToEditor(path, base, false, 'none');
			throw new FrontmatterWriteError('save-failed', path);
		}
		return next;
	}

	const stillThere = await exists(path);
	assertVault(vault, path);
	if (!stillThere) throw new FrontmatterWriteError('missing', path);
	// No await between this check and the write: a tab opened while the read was
	// pending holds the newer base, so redo the edit on it.
	if (findTab(path)) return attempt(path, mutate, vault);

	await writeTextFile(path, next);
	assertVault(vault, path);
	// No-op without a tab; covers a tab opened during the write.
	syncExternalContentToEditor(path, next, true, 'none');
	notifyAfterSave(path, next);
	return next;
}
