import type { EditorView } from '@codemirror/view';
import { toast } from 'svelte-sonner';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import {
	detectBlockElement,
	generateBlockId,
	buildWikilinkText,
	getNoteName,
} from './copy-block-link.logic';

/**
 * Copies a wikilink (or embed) pointing to the block at the current cursor position.
 * For headings, produces `[[noteName#Heading]]`.
 * For blocks/list items, generates a block ID if needed, inserts it, and produces `[[noteName#^id]]`.
 */
export async function copyBlockLink(view: EditorView, embed: boolean): Promise<void> {
	const filePath = editorStore.activeTabPath;
	if (!filePath) return;

	const cursorPos = view.state.selection.main.head;
	const line = view.state.doc.lineAt(cursorPos);

	// Skip empty lines
	if (line.text.trim() === '') return;

	const element = detectBlockElement(line.text);
	const noteName = getNoteName(filePath);

	let blockId: string | null = null;

	if (element.type === 'heading') {
		// Headings use #heading format, no block ID needed
		const linkText = buildWikilinkText(noteName, element, null, embed);
		try {
			await navigator.clipboard.writeText(linkText);
		} catch (err) {
			console.error('Failed to copy link to clipboard:', err);
			toast.error('Failed to copy link to clipboard.');
			return;
		}
		return;
	}

	// For blocks and list items, we need a block ID
	if (element.existingBlockId) {
		blockId = element.existingBlockId;
	} else {
		blockId = generateBlockId();
		// Insert the block ID at the end of the line
		view.dispatch({
			changes: { from: line.to, insert: ` ^${blockId}` },
		});
	}

	const linkText = buildWikilinkText(noteName, element, blockId, embed);
	try {
		await navigator.clipboard.writeText(linkText);
	} catch (err) {
		console.error('Failed to copy link to clipboard:', err);
		toast.error('Failed to copy link to clipboard.');
	}
}

/** Copies a wikilink to the block at the current cursor position */
export async function copyBlockLinkToClipboard(view: EditorView): Promise<void> {
	return copyBlockLink(view, false);
}

/** Copies an embed wikilink to the block at the current cursor position */
export async function copyBlockEmbedToClipboard(view: EditorView): Promise<void> {
	return copyBlockLink(view, true);
}
