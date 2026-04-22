import { EditorView, WidgetType } from '@codemirror/view';

/** Resolves a wikilink target to a file path using the file tree. */
async function resolveEmbedTarget(target: string): Promise<string | null> {
	const { fsStore } = await import('$lib/core/filesystem/fs.store.svelte');
	const { flattenFileTree } = await import('$lib/features/quick-switcher/quick-switcher.logic');
	const { resolveWikilink } = await import('$lib/features/backlinks/backlinks.logic');
	const files = flattenFileTree(fsStore.fileTree);
	return resolveWikilink(target, files.map((f) => f.path));
}

/** Reads the target file and returns the relevant embed content. */
async function loadEmbedContent(
	target: string,
	heading: string | null,
	blockId: string | null,
): Promise<string | null> {
	const filePath = await resolveEmbedTarget(target);
	if (!filePath) return null;

	const { readTextFile } = await import('@tauri-apps/plugin-fs');
	const content = await readTextFile(filePath);

	const { extractHeadingSection, extractBlockContent, getNotePreview } =
		await import('../embed-resolver.logic');

	if (heading) return extractHeadingSection(content, heading);
	if (blockId) return extractBlockContent(content, blockId);
	return getNotePreview(content);
}

/** Widget that renders a wikilink note embed (`![[note]]`, `![[note#heading]]`, `![[note#^block]]`). */
export class WikilinkNoteEmbedWidget extends WidgetType {
	private mounted = true;

	constructor(
		readonly target: string,
		readonly heading: string | null,
		readonly blockId: string | null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		this.mounted = true;
		const container = document.createElement('div');
		container.className = 'cm-lp-embed';

		// Header row with icon + label
		const header = document.createElement('div');
		header.className = 'cm-lp-embed-header';

		const icon = document.createElement('span');
		icon.className = 'cm-lp-embed-icon';
		icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
		header.appendChild(icon);

		const label = document.createElement('span');
		label.className = 'cm-lp-embed-label';
		let text = this.target;
		if (this.heading) text += ` > ${this.heading}`;
		else if (this.blockId) text += ` > ^${this.blockId}`;
		label.textContent = text;
		header.appendChild(label);

		container.appendChild(header);

		// Content area (loads async)
		const contentEl = document.createElement('div');
		contentEl.className = 'cm-lp-embed-content';
		contentEl.textContent = 'Loading…';
		container.appendChild(contentEl);

		loadEmbedContent(this.target, this.heading, this.blockId)
			.then((result) => {
				if (!this.mounted) return;
				if (result) {
					contentEl.textContent = '';
					const lines = result.split('\n');
					for (let i = 0; i < lines.length; i++) {
						if (i > 0) contentEl.appendChild(document.createElement('br'));
						contentEl.appendChild(document.createTextNode(lines[i]));
					}
				} else {
					contentEl.textContent = `"${this.target}" not found`;
					contentEl.classList.add('cm-lp-embed-error');
				}
				view.requestMeasure();
			})
			.catch(() => {
				if (!this.mounted) return;
				contentEl.textContent = `Failed to load "${this.target}"`;
				contentEl.classList.add('cm-lp-embed-error');
			});

		return container;
	}

	destroy() {
		this.mounted = false;
	}

	eq(other: WikilinkNoteEmbedWidget) {
		return this.target === other.target && this.heading === other.heading && this.blockId === other.blockId;
	}

	ignoreEvent() {
		return true;
	}
}
