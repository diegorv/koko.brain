import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { createFile } from '$lib/core/filesystem/fs.service';
import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
import { resolveWikilink } from '$lib/features/backlinks/backlinks.logic';
import { detectPeriodicNoteType } from '$lib/plugins/periodic-notes/periodic-notes.logic';
import { openOrCreatePeriodicNoteForDate } from '$lib/plugins/periodic-notes/periodic-notes.service';

import { findWikilinkInfoAtPosition, findHeadingPosition, findBlockIdPosition } from './index';

/** CSS selectors for DOM elements that represent a clickable wikilink. */
const WIKILINK_SELECTOR =
	'.cm-wikilink-target, .cm-wikilink-heading, .cm-wikilink-block-id, .cm-wikilink-display, .cm-wikilink-bracket, .cm-lp-wikilink';

/**
 * Resolves an anchor (heading or block id) inside the given content and
 * returns its document position, or null if not found.
 */
function resolveAnchorPosition(
	content: string,
	info: { heading: string | null; blockId: string | null },
): number | null {
	if (info.heading) return findHeadingPosition(content, info.heading);
	if (info.blockId) return findBlockIdPosition(content, info.blockId);
	return null;
}

/**
 * Handles a click on a wikilink DOM element.
 *
 * Orchestrates every path: same-note `#heading` / `#^block` jumps,
 * cross-note navigation, creation of non-existent targets via the periodic-
 * notes plugin or a plain `.md` file, and post-open anchor scrolling. Keeps
 * `MarkdownEditor.svelte` free of vault / file-tree / periodic-note
 * concerns.
 *
 * Returns true when the click was a wikilink and was handled (caller should
 * preventDefault + stopPropagation before calling); returns false when the
 * click wasn't on a wikilink at all, so the caller can fall through.
 */
export async function handleWikilinkClick(
	view: EditorView,
	target: EventTarget | null,
): Promise<boolean> {
	const el = (target as HTMLElement | null)?.closest(WIKILINK_SELECTOR) as HTMLElement | null;
	if (!el) return false;

	try {
		const pos = view.posAtDOM(el);
		const line = view.state.doc.lineAt(pos);
		const info = findWikilinkInfoAtPosition(line.text, line.from, pos);
		if (!info) return true;

		const hasAnchor = info.heading !== null || info.blockId !== null;

		// Same-note reference: [[#heading]] or [[#^block-id]]
		if (!info.target) {
			if (!hasAnchor) return true;
			const anchorPos = resolveAnchorPosition(view.state.doc.toString(), info);
			if (anchorPos !== null) {
				view.dispatch({
					selection: EditorSelection.cursor(anchorPos),
					scrollIntoView: true,
				});
				view.focus();
			}
			return true;
		}

		// Cross-note reference — resolve or create the target.
		const files = flattenFileTree(fsStore.fileTree);
		const allPaths = files.map((f) => f.path);
		let resolved = resolveWikilink(info.target, allPaths);

		if (!resolved && vaultStore.path) {
			const periodicMatch = detectPeriodicNoteType(info.target, settingsStore.periodicNotes);
			if (periodicMatch) {
				// openOrCreatePeriodicNoteForDate opens the file itself — skip the
				// openFileInEditor below to avoid a double-open when the periodic
				// folder differs from the vault root.
				await openOrCreatePeriodicNoteForDate(periodicMatch.periodType, periodicMatch.date);
			} else {
				const newPath = await createFile(vaultStore.path, `${info.target}.md`);
				if (!newPath) return true;
				resolved = newPath;
			}
		}

		if (!resolved) {
			// Periodic note was already opened by the branch above — just scroll
			// to the anchor in whatever tab is active now.
			if (hasAnchor) {
				const tab = editorStore.activeTab;
				if (tab) {
					const anchorPos = resolveAnchorPosition(tab.content, info);
					if (anchorPos !== null) editorStore.setPendingScrollPosition(anchorPos);
				}
			}
			return true;
		}

		await openFileInEditor(resolved);

		if (hasAnchor) {
			const tab = editorStore.activeTab;
			if (tab) {
				const anchorPos = resolveAnchorPosition(tab.content, info);
				if (anchorPos !== null) editorStore.setPendingScrollPosition(anchorPos);
			}
		}
		return true;
	} catch (err) {
		console.error('Failed to handle wikilink click:', err);
		return true;
	}
}
