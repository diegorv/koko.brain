import { exists, readDir, readTextFile, rename, stat, writeTextFile } from '@tauri-apps/plugin-fs';

import { call } from '#lib/contracts/ipc.js';
import { markRecentSave, notifyAfterSave } from '#lib/core/editor/editor.hooks.js';
import { isTabDirty } from '#lib/core/editor/editor.logic.js';
import { openFileInEditor, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
import { addToTree, deleteItem, moveItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { applyNoteChange } from '#lib/core/filesystem/note-change.service.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { debug } from '#lib/utils/debug.js';
import { relativePath } from '#lib/utils/path.js';

import type { ModContextV1, ModDataCorruptErrorV1, ModVaultV1, ModWorkspaceV1 } from './contract/mod-api.v1';
import { assertVaultPath, errorText, isModCodePath, MOD_DATA_DIR, parseModData, serializeModData } from './mods.logic';

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
 * Builds `ctx.vault`. Every call checks the live guard first and before local
 * store updates after awaits. Path operations delegate to the app's filesystem
 * services: once started, those operations cannot be cancelled by unload.
 * File system errors propagate to the mod's caller.
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
			debug(tag, `vault.${op} "${path}" failed:`, errorText(err));
			throw err;
		}
	};

	return {
		rename: async (path, newName) => {
			const abs = toAbsolute(path);
			assertVaultPath(newName);
			if (newName.includes('/')) throw new Error(`Mod "${modId}": vault.rename needs a single name`);
			const renamed = await logged('rename', path, () => renameItem(abs, newName));
			assertLive();
			return relativePath(vaultPath, renamed);
		},
		move: async (path, targetFolder) => {
			const abs = toAbsolute(path);
			const target = targetFolder === '' ? vaultPath : toAbsolute(targetFolder);
			const moved = await logged('move', path, () => moveItem(abs, target));
			assertLive();
			// The filesystem service uses null for an already-in-folder no-op.
			return relativePath(vaultPath, moved ?? abs);
		},
		delete: async (path) => {
			const abs = toAbsolute(path);
			const info = await logged('delete', path, () => stat(abs));
			assertLive();
			await logged('delete', path, () => deleteItem(abs, info.isDirectory));
			assertLive();
		},
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
			// A mod's own file (its data.json) is no note: the index and search skip it anyway, so the
			// after-save path would mostly clear the vault-wide caches and add a file history row per write.
			if (isModCodePath(abs, vaultPath)) return;
			// Marks the self-save, runs applyNoteChange, the invalidation signal and the after-save
			// observers, which include search's FTS5 / semantic update.
			notifyAfterSave(abs, content);
		},
		updateFrontmatter: async (path, mutate) => {
			const abs = toAbsolute(path);
			// Data safety: the rebuild prepends a YAML block to a file without one, which would corrupt
			// a .canvas, a .view or a mod's main.js.
			if (!isMarkdownFile(abs)) throw new Error(`Mod "${modId}": vault.updateFrontmatter needs a Markdown note`);
			// The core writer owns the after-save path (tab save or notifyAfterSave) and leaves
			// serialization per path to the caller, as the contract tells the mod.
			await logged('updateFrontmatter', path, () => updateNoteFrontmatter(abs, mutate));
			assertLive();
		},
	};
}

/**
 * Builds `ctx.loadData` and `ctx.saveData`. `modId` must be the id
 * `parseModManifest` validated, since it goes into the path. Calls run one at a
 * time per mod instance, loads too: the file system does not order two writes in
 * flight, and two loads must not both move a corrupt file. A call that reaches
 * the head of the queue after unload rejects without touching the disk. Nothing
 * here reaches `applyNoteChange`, `notifyAfterSave` or the file tree: this file
 * is not a note, and the watcher ignores its folder (Indexing rule 5).
 */
export function createModData({ modId, vaultPath, assertLive }: ModVaultScope): Pick<ModContextV1, 'loadData' | 'saveData'> {
	const tag = `MOD:${modId}`;
	const dir = `${MOD_DATA_DIR}/${modId}`;
	const dataPath = `${vaultPath}/${dir}/data.json`;

	/**
	 * True from the start of a load until it knows the state of the file, which a
	 * corrupt file moved aside counts as: after a load that failed otherwise,
	 * `data.json` may still hold what it could not read, and a save would replace
	 * the only copy.
	 */
	let saveBlocked = false;
	let tail: Promise<unknown> = Promise.resolve();
	const inOrder = <T>(run: () => Promise<T>): Promise<T> => {
		const result = tail.then(() => {
			assertLive();
			return run();
		});
		tail = result.catch(() => {});
		return result;
	};
	/**
	 * Logs a failed file system call, then rethrows it: as the unload when one came
	 * during the call, and otherwise as an `Error`, since Tauri rejects with a bare string
	 */
	const logged = async <T>(op: string, run: () => Promise<T>): Promise<T> => {
		try {
			return await run();
		} catch (err) {
			debug(tag, `${op} failed:`, errorText(err));
			assertLive();
			throw err instanceof Error ? err : new Error(String(err));
		}
	};

	return {
		loadData: () =>
			inOrder(async () => {
				saveBlocked = true;
				const bytes = await logged('loadData', () => call('read_mod_data', { vaultPath, modId }));
				assertLive();
				const parsed = bytes === null ? ({ ok: true, value: null } as const) : parseModData(bytes);
				if (parsed.ok) {
					saveBlocked = false;
					return parsed.value;
				}
				// A rename, not a rewrite: only the file itself holds these exact bytes.
				const name = `data.corrupt-${Date.now()}.json`;
				await logged('loadData', () => rename(dataPath, `${vaultPath}/${dir}/${name}`));
				saveBlocked = false;
				debug(tag, `data.json is not valid JSON; moved to ${name}`);
				assertLive();
				const corruptPath = `${dir}/${name}`;
				const failure: ModDataCorruptErrorV1 = Object.assign(
					new Error(`Mod "${modId}": data.json is not valid JSON; its content was kept in ${corruptPath}`),
					{ name: 'ModDataCorruptError' as const, corruptPath },
				);
				throw failure;
			}),
		saveData: async (data) => {
			assertLive();
			let content: string;
			try {
				content = serializeModData(data);
			} catch (err) {
				throw new Error(`Mod "${modId}": saveData needs a value JSON can represent: ${err instanceof Error ? err.message : String(err)}`);
			}
			await inOrder(async () => {
				if (saveBlocked) {
					throw new Error(`Mod "${modId}": saveData refused: the last loadData failed, so data.json may hold data that was not read; call loadData again`);
				}
				await logged('saveData', () => call('write_mod_data', { vaultPath, modId, content }));
				assertLive();
			});
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
				debug(tag, `workspace.openNote "${path}" failed:`, errorText(err));
				throw err;
			}
			if (!found) throw new Error(`"${path}" does not exist`);
			assertLive();
			await openFileInEditor(abs);
		},
	};
}
