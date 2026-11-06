import { exists, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

import { call } from '#lib/contracts/ipc.js';
import { markRecentSave, notifyAfterSave } from '#lib/core/editor/editor.hooks.js';
import { isTabDirty } from '#lib/core/editor/editor.logic.js';
import { openFileInEditor, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
import { addToTree } from '#lib/core/filesystem/fs.service.js';
import { applyNoteChange } from '#lib/core/filesystem/note-change.service.js';
import { debug } from '#lib/utils/debug.js';

import type { ModVaultV1, ModWorkspaceV1 } from './contract/mod-api.v1';
import { assertVaultPath } from './mods.logic';

/** What `ctx.vault` and `ctx.workspace` need from the mod's `ctx` */
export interface ModVaultScope {
	/** Mod id, for messages */
	modId: string;
	/** Absolute root of the vault the mod was loaded in */
	vaultPath: string;
	/** Throws `Mod "<id>" is unloaded` once the mod is unloaded or another vault is open */
	assertLive: () => void;
}

/**
 * Builds `ctx.vault`. Every call checks the live guard first, and again after
 * each await that comes before a store update, so a call started in one vault
 * never updates the stores of the next one. File system errors propagate to the
 * mod, which the host's action wrapper reports (PRD P9).
 */
export function createModVault({ modId, vaultPath, assertLive }: ModVaultScope): ModVaultV1 {
	const tag = `MOD:${modId}`;
	/** Checks the guard and the path, then makes it absolute (Indexing rule 9) */
	const toAbsolute = (path: unknown): string => {
		assertLive();
		assertVaultPath(path);
		return `${vaultPath}/${path}`;
	};
	// Mods are untyped JavaScript, so what they pass is checked here.
	const assertContent = (op: string, content: unknown) => {
		if (typeof content !== 'string') throw new Error(`Mod "${modId}": vault.${op} needs string content`);
	};
	/** Logs a failed file system call with its path, then rethrows it */
	const logged = async <T>(op: string, path: string, run: () => Promise<T>): Promise<T> => {
		try {
			return await run();
		} catch (err) {
			debug(tag, `vault.${op} "${path}" failed:`, err);
			throw err;
		}
	};

	return {
		read: async (path) => {
			const abs = toAbsolute(path);
			return logged('read', path, () => readTextFile(abs));
		},
		exists: async (path) => {
			const abs = toAbsolute(path);
			return logged('exists', path, () => exists(abs));
		},
		list: async (folder) => {
			assertLive();
			const abs = folder === '' ? vaultPath : toAbsolute(folder);
			const entries = await logged('list', folder, () => readDir(abs));
			return entries
				.filter((e) => !e.name.startsWith('.'))
				.map((e) => ({ name: e.name, path: folder === '' ? e.name : `${folder}/${e.name}`, isFolder: e.isDirectory }));
		},
		create: async (path, content) => {
			const abs = toAbsolute(path);
			assertContent('create', content);
			if (await logged('create', path, () => exists(abs))) throw new Error(`"${path}" already exists; use write`);
			assertLive();
			await logged('create', path, async () => {
				// Rust `create_note` refuses a missing parent; `create_folder` is recursive and a no-op when it exists.
				await call('create_folder', { path: abs.slice(0, abs.lastIndexOf('/')) });
				await call('create_note', { path: abs, content });
			});
			assertLive();
			// Same steps as `openOrCreateNote`: `create_note` already updated VaultIndex.
			markRecentSave(abs);
			void applyNoteChange({
				kind: 'upsert',
				source: 'create',
				path: abs,
				content,
				vaultPath: isMarkdownFile(abs) ? vaultPath : undefined,
			});
			addToTree(abs);
			return path;
		},
		write: async (path, content) => {
			const abs = toAbsolute(path);
			assertContent('write', content);
			if (!(await logged('write', path, () => exists(abs)))) throw new Error(`"${path}" does not exist; use create`);
			assertLive();
			// Overwriting a dirty tab would lose the user's edits, and its next save would overwrite the mod's output.
			const tab = editorStore.tabs.find((t) => t.path === abs);
			if (tab && isTabDirty(tab)) throw new Error(`"${path}" has unsaved changes in an open tab`);
			// `create: false`: a file deleted since the check is refused, not recreated.
			await logged('write', path, () => writeTextFile(abs, content, { create: false }));
			assertLive();
			syncExternalContentToEditor(abs, content, true, 'none');
			// Marks the self-save, runs applyNoteChange, the invalidation signal and the after-save
			// observers, which include search's FTS5 / semantic update.
			notifyAfterSave(abs, content);
		},
	};
}

/** Builds `ctx.workspace` */
export function createModWorkspace({ modId, vaultPath, assertLive }: ModVaultScope): ModWorkspaceV1 {
	const tag = `MOD:${modId}`;
	return {
		openNote: async (path) => {
			assertLive();
			assertVaultPath(path);
			const abs = `${vaultPath}/${path}`;
			// openFileInEditor swallows a read failure into a generic toast and a Sentry report,
			// so a missing note is refused here, where the mod sees the rejection (PRD P9).
			let found: boolean;
			try {
				found = await exists(abs);
			} catch (err) {
				debug(tag, `workspace.openNote "${path}" failed:`, err);
				throw err;
			}
			if (!found) throw new Error(`"${path}" does not exist`);
			assertLive();
			await openFileInEditor(abs);
		},
	};
}
