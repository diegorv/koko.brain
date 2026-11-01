import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { isBinaryFile } from '#lib/core/filesystem/fs.logic.js';
import type { EditorHost, LinkAnchor } from '../../editor-host';
import { editorHost } from '../../editor-host';
import { findWikilinkInfoAtPosition, findHeadingPosition, findBlockIdPosition } from '../wikilink';
import { reportError } from './core/profiling';

/**
 * Follows a wikilink target through the host: opens the note it resolves to,
 * or creates it (a periodic note when the name matches a periodic format).
 *
 * Image / audio / video / pdf targets are a silent no-op: opening one in the
 * markdown editor would load the binary as UTF-8 and crash the renderer, and
 * the embed widget already shows the asset.
 */
export async function followWikilink(host: EditorHost, target: string, anchor?: LinkAnchor): Promise<void> {
	if (isBinaryFile(target)) return;
	const resolved = host.resolveLink(target);
	if (resolved) await host.openLink(resolved, anchor);
	else await host.createNote(target, anchor);
}

/**
 * Follows the wikilink at `pos` in `view`. A same-note `[[#heading]]` /
 * `[[#^block]]` moves the cursor there; any other target goes through
 * `followWikilink` with the view's host. No-op when `pos` is not on a wikilink.
 */
export async function followWikilinkClick(view: EditorView, pos: number): Promise<void> {
	try {
		const line = view.state.doc.lineAt(pos);
		const info = findWikilinkInfoAtPosition(line.text, line.from, pos);
		if (!info) return;
		const anchor: LinkAnchor = { heading: info.heading, blockId: info.blockId };

		if (!info.target) {
			if (anchor.heading === null && anchor.blockId === null) return;
			const content = view.state.doc.toString();
			const anchorPos = anchor.heading
				? findHeadingPosition(content, anchor.heading)
				: findBlockIdPosition(content, anchor.blockId!);
			if (anchorPos !== null) {
				view.dispatch({ selection: EditorSelection.cursor(anchorPos), scrollIntoView: true });
				view.focus();
			}
			return;
		}

		await followWikilink(view.state.facet(editorHost), info.target, anchor);
	} catch (err) {
		reportError('WIKILINK', 'Failed to handle wikilink click:', err);
	}
}
