import { call } from '#lib/contracts/ipc.js';
import type { FileEntry } from '#lib/core/filesystem/file-entries.logic.js';
import { getNoteName, isLinkTargetFile } from '#lib/core/filesystem/wikilink-resolution.logic.js';
import { NOOP_HOST, type EditorHost, type LinkCandidates, type VaultTag } from '#lib/core/markdown-editor/editor-host.js';

/** The composer's editor host, plus the per-summon reset of its reads. */
export interface ComposerEditorHost extends EditorHost {
	/** Drops the cached tags and link candidates, so the next completion reads the vault again. */
	reset(): void;
}

/**
 * The editor host of the composer popover. The composer webview has none of
 * the main window's stores, so the two completion reads go straight to the
 * Rust index: `get_all_tags_v2` and `get_all_vault_entries_v2`. Link
 * targets are therefore the indexed notes only, not every file of the
 * tree as in the editor, and `resolveLink` resolves nothing, so `[[Other#`
 * lists no headings. Every other method is the no-op host.
 *
 * Each read is cached until `reset()` (once per summon) and loaded on the
 * first completion that needs it: the sources re-query on every keystroke.
 * A failed read is not cached, and rejects as the host contract asks.
 */
export function createComposerEditorHost(): ComposerEditorHost {
	let tags: Promise<VaultTag[]> | null = null;
	let links: Promise<LinkCandidates> | null = null;

	function vaultTags(): Promise<VaultTag[]> {
		if (!tags) {
			const read = call('get_all_tags_v2').then((all) => all.map(({ name, count }) => ({ name, count })));
			tags = read;
			read.catch(() => {
				if (tags === read) tags = null;
			});
		}
		return tags;
	}

	function linkCandidates(): Promise<LinkCandidates> {
		if (!links) {
			const read = call('get_all_vault_entries_v2').then((entries) => {
				// A view entry would offer a target no link can reach, as in the editor.
				const notes = entries.filter((e) => isLinkTargetFile(e.path));
				const files: FileEntry[] = notes.map((e) => ({
					name: e.path.split('/').pop() ?? e.path,
					nameWithoutExt: getNoteName(e.path),
					path: e.path,
				}));
				return { files, notes };
			});
			links = read;
			read.catch(() => {
				if (links === read) links = null;
			});
		}
		return links;
	}

	return {
		...NOOP_HOST,
		listTags: vaultTags,
		async listLinkCandidates(includeNotes) {
			const { files, notes } = await linkCandidates();
			return { files, notes: includeNotes ? notes : [] };
		},
		reset() {
			tags = null;
			links = null;
		},
	};
}
