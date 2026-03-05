import { EditorView } from '@codemirror/view';
import { openUrl } from '@tauri-apps/plugin-opener';
import { findMarkdownLinkUrlAtPosition } from './parsers/link';
import { isSafeUrl } from '$lib/utils/sanitize-url';

export const livePreviewClickHandler = EditorView.domEventHandlers({
	mousedown(e: MouseEvent, view: EditorView) {
		if (!e.metaKey && !e.ctrlKey) return false;
		const linkEl = (e.target as HTMLElement).closest('.cm-lp-link') as HTMLElement | null;
		if (!linkEl) return false;

		e.preventDefault();
		const pos = view.posAtDOM(linkEl);
		const line = view.state.doc.lineAt(pos);

		// Try markdown link [text](url) first
		let url = findMarkdownLinkUrlAtPosition(view.state, line.from, line.to, pos);

		// For autolinks <url> and bare URLs, the link text IS the URL
		if (!url) {
			url = linkEl.textContent?.trim() || null;
		}

		if (url && isSafeUrl(url)) {
			openUrl(url).catch((err) => console.error('Failed to open URL:', err));
		}
		return true;
	},
});
