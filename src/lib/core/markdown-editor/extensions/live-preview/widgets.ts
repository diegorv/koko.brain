import { EditorView, WidgetType } from '@codemirror/view';
import type { ColumnAlignment } from './parsers/table';
import type { MetaBindOption } from './parsers/meta-bind-input';
import { findMetaBindInputRanges } from './parsers/meta-bind-input';
import { renderInlineMarkdown } from './parsers/inline-markdown';
import { WIKILINK_DECORATION_RE } from '../wikilink/decoration.logic';
import type { Property } from '$lib/features/properties/properties.types';
import {
	parseFrontmatterProperties,
	updatePropertyValue,
	addProperty,
	extractBody,
	rebuildContent,
} from '$lib/features/properties/properties.logic';
import { isSafeUrl } from '$lib/utils/sanitize-url';
import { openWikilinkTarget } from './wikilink-navigation';

export class HorizontalRuleWidget extends WidgetType {
	toDOM() {
		const hr = document.createElement('hr');
		hr.className = 'cm-lp-hr';
		return hr;
	}
}

export class TaskCheckboxWidget extends WidgetType {
	constructor(
		readonly checked: boolean,
		readonly pos: number,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = this.checked;
		input.className = 'cm-lp-task-checkbox';
		input.addEventListener('mousedown', (e) => {
			e.preventDefault();
			const newChar = this.checked ? ' ' : 'x';
			view.dispatch({
				changes: { from: this.pos + 1, to: this.pos + 2, insert: newChar },
			});
		});
		return input;
	}

	eq(other: TaskCheckboxWidget) {
		return this.checked === other.checked && this.pos === other.pos;
	}

	ignoreEvent() {
		return false;
	}
}

export class OrderedListMarkerWidget extends WidgetType {
	constructor(readonly number: number) {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-ol-marker';
		span.textContent = `${this.number}.`;
		return span;
	}

	eq(other: OrderedListMarkerWidget) {
		return this.number === other.number;
	}

	ignoreEvent() {
		return true;
	}
}

export class UnorderedListMarkerWidget extends WidgetType {
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-ul-marker';
		span.textContent = '•';
		return span;
	}

	eq() {
		return true;
	}

	ignoreEvent() {
		return true;
	}
}

export class ImageWidget extends WidgetType {
	constructor(
		readonly url: string,
		readonly alt: string,
		readonly width?: number,
		readonly height?: number,
	) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-image-wrapper';
		const img = document.createElement('img');
		if (isSafeUrl(this.url)) {
			img.src = this.url;
		}
		img.alt = this.alt;
		img.className = 'cm-lp-image';
		if (this.width) {
			img.style.maxWidth = `${this.width}px`;
		}
		if (this.height) {
			img.style.height = `${this.height}px`;
		}
		wrapper.appendChild(img);
		return wrapper;
	}

	eq(other: ImageWidget) {
		return this.url === other.url && this.alt === other.alt
			&& this.width === other.width && this.height === other.height;
	}

	ignoreEvent() {
		return true;
	}
}

export class AudioWidget extends WidgetType {
	constructor(readonly src: string) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-audio-wrapper';
		const audio = document.createElement('audio');
		if (isSafeUrl(this.src)) {
			audio.src = this.src;
		}
		audio.controls = true;
		audio.className = 'cm-lp-audio';
		wrapper.appendChild(audio);
		return wrapper;
	}

	eq(other: AudioWidget) {
		return this.src === other.src;
	}

	ignoreEvent() {
		return true;
	}
}

export class VideoWidget extends WidgetType {
	constructor(readonly src: string) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-video-wrapper';
		const video = document.createElement('video');
		if (isSafeUrl(this.src)) {
			video.src = this.src;
		}
		video.controls = true;
		video.className = 'cm-lp-video';
		wrapper.appendChild(video);
		return wrapper;
	}

	eq(other: VideoWidget) {
		return this.src === other.src;
	}

	ignoreEvent() {
		return true;
	}
}

export { FrontmatterWidget } from './widgets/frontmatter-widget';

/**
 * Renders inline non-wikilink markdown segments (bold, italic, strikethrough, code) as DOM nodes.
 * Handles meta-bind INPUT fields when view and properties are provided.
 */
function renderInlineSegments(
	parent: HTMLElement,
	text: string,
	view?: EditorView,
	properties?: Property[],
) {
	const segments = renderInlineMarkdown(text);
	for (const seg of segments) {
		switch (seg.type) {
			case 'bold': {
				const el = document.createElement('strong');
				el.textContent = seg.content;
				parent.appendChild(el);
				break;
			}
			case 'italic': {
				const el = document.createElement('em');
				el.textContent = seg.content;
				parent.appendChild(el);
				break;
			}
			case 'strikethrough': {
				const el = document.createElement('s');
				el.textContent = seg.content;
				parent.appendChild(el);
				break;
			}
			case 'code': {
				// Check if this code segment is a meta-bind INPUT field
				if (view && properties) {
					const wrapped = `\`${seg.content}\``;
					const ranges = findMetaBindInputRanges(wrapped, 0);
					if (ranges.length > 0) {
						const range = ranges[0];
						const prop = properties.find((p) => p.key === range.bindTarget);
						const currentValue = prop ? String(prop.value) : null;
						const select = createMetaBindSelect(range.options, range.bindTarget, currentValue, view);
						parent.appendChild(select);
						break;
					}
				}
				const el = document.createElement('code');
				el.textContent = seg.content;
				el.className = 'cm-lp-code';
				parent.appendChild(el);
				break;
			}
			default:
				parent.appendChild(document.createTextNode(seg.content));
		}
	}
}

export { openWikilinkTarget } from './wikilink-navigation';

/**
 * Renders inline markdown segments as DOM nodes inside a parent element.
 * Supports bold, italic, strikethrough, inline code, meta-bind INPUT fields, and wikilinks.
 * Wikilinks are rendered as clickable `<a>` elements that open the target file.
 */
function renderCellContent(
	parent: HTMLElement,
	text: string,
	view?: EditorView,
	properties?: Property[],
) {
	WIKILINK_DECORATION_RE.lastIndex = 0;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = WIKILINK_DECORATION_RE.exec(text)) !== null) {
		// Render any text before this wikilink as inline markdown
		if (match.index > lastIndex) {
			renderInlineSegments(parent, text.slice(lastIndex, match.index), view, properties);
		}

		const target = match[1];
		const displayText = match[3] ?? target;

		const a = document.createElement('a');
		a.textContent = displayText;
		a.className = 'cm-lp-wikilink';
		a.href = '#';
		a.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			openWikilinkTarget(target);
		});
		parent.appendChild(a);

		lastIndex = match.index + match[0].length;
	}

	// Render remaining text after the last wikilink
	if (lastIndex < text.length) {
		renderInlineSegments(parent, text.slice(lastIndex), view, properties);
	}
}

/** Widget that renders a pipe-delimited markdown table as an HTML `<table>` element */
export class TableWidget extends WidgetType {
	constructor(
		readonly headers: string[],
		readonly alignments: ColumnAlignment[],
		readonly rows: string[][],
		readonly properties: Property[],
	) {
		super();
	}

	toDOM(view: EditorView) {
		const table = document.createElement('table');
		table.className = 'cm-lp-table';

		// Header
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		for (let i = 0; i < this.headers.length; i++) {
			const th = document.createElement('th');
			renderCellContent(th, this.headers[i], view, this.properties);
			th.style.textAlign = this.alignments[i];
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// Body
		if (this.rows.length > 0) {
			const tbody = document.createElement('tbody');
			for (const row of this.rows) {
				const tr = document.createElement('tr');
				for (let i = 0; i < this.headers.length; i++) {
					const td = document.createElement('td');
					renderCellContent(td, row[i] ?? '', view, this.properties);
					td.style.textAlign = this.alignments[i];
					tr.appendChild(td);
				}
				tbody.appendChild(tr);
			}
			table.appendChild(tbody);
		}

		return table;
	}

	eq(other: TableWidget) {
		if (this.headers.length !== other.headers.length) return false;
		if (this.rows.length !== other.rows.length) return false;
		if (!this.headers.every((h, i) => h === other.headers[i])) return false;
		if (!this.alignments.every((a, i) => a === other.alignments[i])) return false;
		if (!this.rows.every((row, ri) => row.every((cell, ci) => cell === other.rows[ri][ci]))) return false;
		if (this.properties.length !== other.properties.length) return false;
		return this.properties.every(
			(p, i) => p.key === other.properties[i].key && String(p.value) === String(other.properties[i].value),
		);
	}

	ignoreEvent() {
		return false;
	}
}

/** Widget that renders a wikilink image embed (`![[image.png]]`, `![[image.png|300]]`) */
export class WikilinkImageEmbedWidget extends WidgetType {
	constructor(
		readonly target: string,
		readonly width: number | null,
	) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-image-wrapper';
		const img = document.createElement('img');
		if (isSafeUrl(this.target)) {
			img.src = this.target;
		}
		img.alt = this.target;
		img.className = 'cm-lp-image';
		if (this.width !== null) {
			img.style.maxWidth = `${this.width}px`;
		}
		wrapper.appendChild(img);
		return wrapper;
	}

	eq(other: WikilinkImageEmbedWidget) {
		return this.target === other.target && this.width === other.width;
	}

	ignoreEvent() {
		return true;
	}
}

/** Resolves a wikilink target to a file path using the file tree */
async function resolveEmbedTarget(target: string): Promise<string | null> {
	const { fsStore } = await import('$lib/core/filesystem/fs.store.svelte');
	const { flattenFileTree } = await import('$lib/features/quick-switcher/quick-switcher.logic');
	const { resolveWikilink } = await import('$lib/features/backlinks/backlinks.logic');
	const files = flattenFileTree(fsStore.fileTree);
	return resolveWikilink(target, files.map((f) => f.path));
}

/** Reads a file and extracts the relevant embed content */
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
		await import('./embed-resolver.logic');

	if (heading) return extractHeadingSection(content, heading);
	if (blockId) return extractBlockContent(content, blockId);
	return getNotePreview(content);
}

/** Widget that renders a wikilink note embed (`![[note]]`, `![[note#heading]]`, `![[note#^block]]`) */
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
		contentEl.textContent = 'Loading\u2026';
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

/** Widget that renders a meta-bind inline select dropdown for `INPUT[inlineSelect(...):prop]` */
/**
 * Creates a `<select>` element for a meta-bind inline select input.
 * Shared between MetaBindSelectWidget (inline) and TableWidget (table cells).
 */
export function createMetaBindSelect(
	options: MetaBindOption[],
	bindTarget: string,
	currentValue: string | null,
	view: EditorView,
): HTMLSelectElement {
	const select = document.createElement('select');
	select.className = 'cm-lp-meta-bind-select';

	// Placeholder when no value is set
	if (currentValue === null || currentValue === '') {
		const placeholder = document.createElement('option');
		placeholder.value = '';
		placeholder.textContent = 'Select...';
		placeholder.disabled = true;
		placeholder.selected = true;
		select.appendChild(placeholder);
	}

	for (const opt of options) {
		const option = document.createElement('option');
		option.value = opt.value;
		option.textContent = opt.label;
		if (opt.value === currentValue) {
			option.selected = true;
		}
		select.appendChild(option);
	}

	// Prevent CodeMirror from moving the cursor to this line on click,
	// which would remove the decoration and close the native dropdown
	select.addEventListener('mousedown', (e) => {
		e.stopPropagation();
	});

	select.addEventListener('change', (e) => {
		const selectedValue = (e.target as HTMLSelectElement).value;
		const doc = view.state.doc.toString();
		const properties = parseFrontmatterProperties(doc);
		const body = extractBody(doc);

		const existing = properties.find((p) => p.key === bindTarget);
		let updated;
		if (existing) {
			updated = updatePropertyValue(properties, bindTarget, selectedValue);
		} else {
			updated = addProperty(properties, bindTarget);
			updated = updatePropertyValue(updated, bindTarget, selectedValue);
		}

		const newContent = rebuildContent(updated, body);
		const frontmatterEnd = doc.length - body.length;
		const newFrontmatter = newContent.slice(0, newContent.length - body.length);

		view.dispatch({
			changes: { from: 0, to: frontmatterEnd, insert: newFrontmatter },
		});
	});

	return select;
}

/** Widget that renders a meta-bind inline select dropdown for `INPUT[inlineSelect(...):prop]` */
export class MetaBindSelectWidget extends WidgetType {
	constructor(
		readonly options: MetaBindOption[],
		readonly bindTarget: string,
		readonly currentValue: string | null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		return createMetaBindSelect(this.options, this.bindTarget, this.currentValue, view);
	}

	eq(other: MetaBindSelectWidget) {
		if (this.bindTarget !== other.bindTarget) return false;
		if (this.currentValue !== other.currentValue) return false;
		if (this.options.length !== other.options.length) return false;
		return this.options.every(
			(opt, i) => opt.value === other.options[i].value && opt.label === other.options[i].label,
		);
	}

	ignoreEvent() {
		return false;
	}
}

