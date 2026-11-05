import { convertFileSrc } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { flattenFileTree, type FileEntry } from '#lib/core/filesystem/file-entries.logic.js';
import { findNodeByPath } from '#lib/core/filesystem/fs.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import {
	buildResolutionCache,
	isLinkTargetFile,
	resolveWikilinkCached,
	type WikilinkResolutionCache,
} from '#lib/core/filesystem/wikilink-resolution.logic.js';
import type { BlockLinkActions, EditorHost, LinkAnchor } from '#lib/core/markdown-editor/editor-host.js';
import type { FencedBlockRenderer } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { followWikilink } from '#lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.js';
import { findBlockIdPosition, findHeadingPosition } from '#lib/core/markdown-editor/extensions/wikilink/navigation.logic.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { withUnorganizedFlag } from '#lib/core/note-creator/explicit-organization.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { getVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { resolveFilePath } from '#lib/utils/path.js';
import { collectionBlockRenderer } from '#lib/features/collection/collection-block-widget.js';
import { copyBlockEmbedToClipboard, copyBlockLinkToClipboard } from '#lib/features/copy-block-link/copy-block-link.service.js';
import { openSearch } from '#lib/features/search/open-search.service.js';
import { getViewOpensInEditor } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { detectPeriodicNoteType } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';
import { openOrCreatePeriodicNoteForDate } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { queryjsBlockRenderer } from '#lib/plugins/queryjs/queryjs-block-widget.js';
import { openRailView } from './rail-navigation';

/** Queues a scroll to `anchor` in the active tab, once the editor shows it. */
function scrollToAnchor(anchor: LinkAnchor | undefined): void {
	if (!anchor || (anchor.heading === null && anchor.blockId === null)) return;
	const tab = editorStore.activeTab;
	if (!tab) return;
	const pos = anchor.heading
		? findHeadingPosition(tab.content, anchor.heading)
		: findBlockIdPosition(tab.content, anchor.blockId!);
	if (pos !== null) editorStore.setPendingScrollPosition(pos);
}

/**
 * The periodic note a wikilink target names, or null. A bare name such as
 * `2026-11-01` also matches inside the periodic-notes folder, so the link
 * creates the note there, where the next lookup resolves it by name.
 */
function periodicTarget(target: string) {
	const settings = settingsStore.periodicNotes;
	const direct = detectPeriodicNoteType(target, settings);
	if (direct || !settings.folder) return direct;
	return detectPeriodicNoteType(`${settings.folder}/${target}`, settings);
}

/** The link targets of one file tree (every file but a `.view`) and their name index. */
interface TreeLinkIndex {
	files: FileEntry[];
	cache: WikilinkResolutionCache;
}

/**
 * Link index per tree root. `fsStore.fileTree` is replace-only raw state, so
 * the root's identity changes exactly when the tree does, and a dropped tree
 * frees its entry. Not a `$derived`: an unowned derived re-checks every
 * source it read (the whole tree) on each read.
 */
const linkIndexByTree = new WeakMap<FileTreeNode[], TreeLinkIndex>();

/** The link index of the current file tree, built on first use per tree. */
function treeLinkIndex(): TreeLinkIndex {
	const tree = fsStore.fileTree;
	let index = linkIndexByTree.get(tree);
	if (!index) {
		const files = flattenFileTree(tree).filter((f) => isLinkTargetFile(f.path));
		index = { files, cache: buildResolutionCache(files.map((f) => f.path)) };
		linkIndexByTree.set(tree, index);
	}
	return index;
}

/** The vault-relative target as a `.md` path: `Notes/v1.2` -> `Notes/v1.2.md`. */
function markdownTarget(target: string): string {
	return /\.md$/i.test(target) ? target : `${target}.md`;
}

/**
 * The editor host of the app, over the file tree, the vault entries, Tauri,
 * the note creator, periodic notes, the rail's view navigation and Search. One constant: `createExtensions`
 * installs it once per editor and nothing reconfigures it.
 */
export const appEditorHost: EditorHost = {
	resolveLink(target) {
		return resolveWikilinkCached(target, treeLinkIndex().cache, vaultStore.path);
	},

	async listLinkCandidates(includeNotes) {
		const { files } = treeLinkIndex();
		// A view entry would offer its aliases as targets no link can reach.
		const notes = includeNotes ? (await getVaultEntries()).filter((e) => isLinkTargetFile(e.path)) : [];
		return { files, notes };
	},

	readNote(path) {
		return readTextFile(path);
	},

	assetUrl(path) {
		return convertFileSrc(path);
	},

	async openLink(path, anchor) {
		await openFileInEditor(path);
		scrollToAnchor(anchor);
	},

	openExternal(url) {
		return openUrl(url);
	},

	async createNote(target, anchor, options) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return false;
		const periodic = options?.periodic === false ? null : periodicTarget(target);
		try {
			if (periodic) {
				await openOrCreatePeriodicNoteForDate(periodic.periodType, periodic.date);
			} else {
				const relative = markdownTarget(target);
				await openOrCreateNote({
					filePath: resolveFilePath(vaultPath, relative),
					title: relative.slice(relative.lastIndexOf('/') + 1, -'.md'.length),
					buildContent: settingsStore.explicitOrganization ? withUnorganizedFlag : undefined,
				});
			}
		} catch (err) {
			error('EDITOR_HOST', `Failed to create note for "${target}":`, err);
			return false;
		}
		scrollToAnchor(anchor);
		return true;
	},

	async openView(target) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return false;
		let path: string;
		try {
			path = resolveFilePath(vaultPath, target);
		} catch {
			return false;
		}
		// The tree the Views menu lists views from, so a view the menu shows opens here.
		const node = findNodeByPath(fsStore.fileTree, path);
		if (!node || node.isDirectory) return false;
		openRailView(path, getViewOpensInEditor(typeDefinitionsStore.getEntryByPath(path)));
		return true;
	},

	openTagSearch(tag) {
		openSearch(`tag:${tag}`);
	},
};

/**
 * Opens a wikilink target the way a click in the editor does: the note it
 * resolves to, else a new note (a periodic one when the name matches). For
 * views outside the editor (tasks, kanban), which get it as a prop.
 */
export function openWikilinkTarget(target: string): Promise<void> {
	return followWikilink(appEditorHost, target);
}

/** The fenced-block renderers the app's editor installs: each feature or plugin that owns a block kind registers here. */
export const appFencedBlockRenderers: readonly FencedBlockRenderer[] = [queryjsBlockRenderer, collectionBlockRenderer];

/** The editor's copy-block-link actions, from the copy-block-link feature. */
export const appBlockLinks: BlockLinkActions = {
	copyLink: copyBlockLinkToClipboard,
	copyEmbed: copyBlockEmbedToClipboard,
};
