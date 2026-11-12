import { EditorView, WidgetType } from '@codemirror/view';
import { toast } from 'svelte-sonner';
import { parseAlignments, type ColumnAlignment } from './parsers/table';
import type { MetaBindOption } from './parsers/meta-bind-input';
import { findMetaBindInputRanges } from './parsers/meta-bind-input';
import { renderInlineMarkdown } from './parsers/inline-markdown';
import type { MediaTag } from './parsers/media';
import { WIKILINK_DECORATION_RE, findWikilinkInfoAtPosition } from '../wikilink/decoration.logic';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import {
	parseFrontmatterProperties,
	setPropertyByBindTarget,
	typedOptionValue,
	extractBody,
	rebuildContent,
	detectLossyFrontmatter,
	LOSSY_FRONTMATTER_MESSAGES,
} from '#lib/core/frontmatter/properties.logic.js';
import { isSafeUrl } from '#lib/utils/sanitize-url.js';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
import { IS_MAC, isMacContextClick, isOpenLinkModifier } from '#lib/utils/platform.js';
import { editorHost, type EditorHost } from '../../editor-host';
import { editorLog, reportError } from './core/profiling';
import { isFormControlInputEvent } from './core/form-control-events';
import { followWikilinkInfo } from './wikilink-navigation';
import { TABLE_WIDGET_CLASS } from '../../wikilink-click-target';

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

	/** CodeMirror handles a click on the number, so the cursor moves to the item and reveals `1. ` as a bullet click does. Returning `true` hands the mousedown to the browser, which places no caret here, so the cursor would not move. */
	ignoreEvent() {
		return false;
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

/**
 * Converts a `file://` URL to a filesystem path the Tauri asset protocol can
 * resolve. Returns null when the URL is malformed, carries a non-local host
 * (SMB / UNC paths like `file://server/share/x.png` are rejected outright; the
 * asset-protocol scope would block them anyway, but we don't want to forward
 * those to `convertFileSrc` in the first place), or its path holds a `%` that
 * is not a valid escape (`file:///Users/me/100%.png`): `decodeURIComponent`
 * throws on it, and a throw here escapes `ImageWidget.toDOM` and the
 * CodeMirror dispatch that renders it.
 *
 * Handles Windows drive paths (`file:///C:/foo` → `C:/foo`) and percent-decodes
 * the path so spaces and other reserved characters survive the round-trip
 * (capture deep-links emit `file:///Users/.../CleanShot%202026...png` style URLs).
 */
function fileUrlToFsPath(fileUrl: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(fileUrl);
	} catch {
		return null;
	}
	if (parsed.protocol !== 'file:') return null;
	if (parsed.host && parsed.host !== 'localhost') return null;
	let path: string;
	try {
		path = decodeURIComponent(parsed.pathname);
	} catch {
		return null;
	}
	// Windows: `/C:/foo` → `C:/foo`
	if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
	return path;
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

	toDOM(view: EditorView) {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-image-wrapper';
		const img = document.createElement('img');
		img.alt = this.alt;
		img.className = 'cm-lp-image';
		if (this.width) {
			img.style.maxWidth = `${this.width}px`;
		}
		if (this.height) {
			img.style.height = `${this.height}px`;
		}
		wrapper.appendChild(img);

		if (this.url.toLowerCase().startsWith('file:')) {
			// `file://` URLs cannot be loaded directly by the webview. The host
			// turns the path into an asset-protocol URL; the path must fall
			// inside the asset-protocol scope declared in `tauri.conf.json`, so
			// access is OS-level gated (not by `isSafeUrl`).
			this.applyFileSrc(view.state.facet(editorHost), img, wrapper);
		} else if (isSafeUrl(this.url)) {
			img.src = this.url;
		}

		return wrapper;
	}

	private applyFileSrc(host: EditorHost, img: HTMLImageElement, wrapper: HTMLElement): void {
		const fsPath = fileUrlToFsPath(this.url);
		if (!fsPath) return;
		const src = host.assetUrl(fsPath);
		if (src) img.src = src;
		else wrapper.classList.add('cm-lp-image-missing');
	}

	eq(other: ImageWidget) {
		return this.url === other.url && this.alt === other.alt
			&& this.width === other.width && this.height === other.height;
	}

	ignoreEvent() {
		return true;
	}
}

/** Renders an `<audio>` / `<video>` player; the tag drives the `cm-lp-${tag}` classes the theme styles */
export class MediaWidget extends WidgetType {
	constructor(
		readonly tag: MediaTag,
		readonly src: string,
	) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = `cm-lp-${this.tag}-wrapper`;
		const media = document.createElement(this.tag);
		if (isSafeUrl(this.src)) {
			media.src = this.src;
		}
		media.controls = true;
		media.className = `cm-lp-${this.tag}`;
		wrapper.appendChild(media);
		return wrapper;
	}

	eq(other: MediaWidget) {
		// Tag must be compared: one class now serves both players, so class
		// identity no longer keeps an audio widget apart from a video one.
		return this.tag === other.tag && this.src === other.src;
	}

	ignoreEvent() {
		return true;
	}
}


/**
 * Renders inline non-wikilink markdown segments (bold, italic, strikethrough, code,
 * markdown links, `<br>` line breaks, backslash escapes) as DOM nodes, never as HTML.
 * A markdown link is a `span.cm-lp-link` that opens its url through the editor host
 * on a primary press with the platform open modifier, when `view` is provided.
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
						const currentValue = boundValue(properties, range.bindTarget);
						const widget = pickWidget(range.inputType, range.options, range.bindTarget, currentValue);
						if (widget) {
							parent.appendChild(widget.toDOM(view));
							break;
						}
					}
				}
				const el = document.createElement('code');
				el.textContent = seg.content;
				el.className = 'cm-lp-code';
				parent.appendChild(el);
				break;
			}
			case 'link': {
				// A span, never `<a href>`: the url opens only through the editor host.
				const el = document.createElement('span');
				el.textContent = seg.content;
				el.className = 'cm-lp-link';
				const url = seg.href ?? '';
				if (view) {
					el.addEventListener('mousedown', (e) => {
						if (e.button !== 0 || !isOpenLinkModifier(e, IS_MAC)) return;
						// Stopped even for an unsafe url: the editor-level link handler would
						// otherwise fall back to the link text, which isSafeUrl accepts.
						e.preventDefault();
						e.stopPropagation();
						// isSafeUrl accepts '' (no scheme), which `[x](<>)` yields.
						if (!url || !isSafeUrl(url)) return;
						view.state
							.facet(editorHost)
							.openExternal(url)
							.catch((err) => reportError('LIVE-PREVIEW', 'Failed to open URL:', err));
					});
				}
				parent.appendChild(el);
				break;
			}
			case 'break':
				parent.appendChild(document.createElement('br'));
				break;
			default:
				parent.appendChild(document.createTextNode(seg.content));
		}
	}
}

/**
 * Renders inline markdown segments as DOM nodes inside a parent element.
 * Supports bold, italic, strikethrough, inline code, markdown links, `<br>` line breaks,
 * backslash escapes, meta-bind INPUT fields, and wikilinks. Escapes apply only to the
 * text between wikilinks. Wikilinks are rendered as clickable `<a>` elements that follow the link the
 * same way as one outside a table (anchor, same-note jump, create-on-click).
 */
function renderCellContent(
	parent: HTMLElement,
	text: string,
	view: EditorView,
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

		const source = match[0];
		const displayText = match[3] ?? match[1];

		const a = document.createElement('a');
		a.textContent = displayText;
		a.className = 'cm-lp-wikilink';
		a.href = '#';
		a.addEventListener('mousedown', (e) => {
			// Right click and macOS Ctrl+click mean the context menu: keep the default.
			if (e.button !== 0 || isMacContextClick(e, IS_MAC)) return;
			e.preventDefault();
			e.stopPropagation();
			// Parsed on click, not while rendering: the parser runs the shared
			// global WIKILINK_DECORATION_RE, which this loop is iterating.
			const info = findWikilinkInfoAtPosition(source, 0, 0);
			if (info) void followWikilinkInfo(view, info);
		});
		parent.appendChild(a);

		lastIndex = match.index + match[0].length;
	}

	// Render remaining text after the last wikilink
	if (lastIndex < text.length) {
		renderInlineSegments(parent, text.slice(lastIndex), view, properties);
	}
}

/** Range info for a table block in the document — used by edit-mode UI. */
export interface TableSourceRange {
	from: number;
	to: number;
	/** 1-based line number of the header row */
	startLine: number;
	/** 1-based line number of the last table row */
	endLine: number;
}

/** Widget that renders a pipe-delimited markdown table as an HTML `<table>` element. */
export class TableWidget extends WidgetType {
	constructor(
		readonly headers: string[],
		readonly alignments: ColumnAlignment[],
		readonly rows: string[][],
		readonly properties: Property[],
		readonly sourceRange: TableSourceRange,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const wrapper = document.createElement('div');
		wrapper.className = TABLE_WIDGET_CLASS;

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

		wrapper.appendChild(table);
		this.attachAddButtons(wrapper, view);

		return wrapper;
	}

	eq(other: TableWidget) {
		if (this.headers.length !== other.headers.length) return false;
		if (this.rows.length !== other.rows.length) return false;
		if (!this.headers.every((h, i) => h === other.headers[i])) return false;
		if (!this.alignments.every((a, i) => a === other.alignments[i])) return false;
		if (!this.rows.every((row, ri) => row.every((cell, ci) => cell === other.rows[ri][ci]))) return false;
		if (this.properties.length !== other.properties.length) return false;
		// sourceRange equality matters — a table that moved (e.g. content edits
		// above it) must rebuild so click handlers dispatch at the right offset.
		if (
			this.sourceRange.from !== other.sourceRange.from ||
			this.sourceRange.to !== other.sourceRange.to ||
			this.sourceRange.startLine !== other.sourceRange.startLine ||
			this.sourceRange.endLine !== other.sourceRange.endLine
		) return false;
		return this.properties.every(
			(p, i) => p.key === other.properties[i].key && String(p.value) === String(other.properties[i].value),
		);
	}

	/** Cells can hold meta-bind controls (`pickWidget`): their keys stay in the control. */
	ignoreEvent(event: Event) {
		return isFormControlInputEvent(event);
	}

	/**
	 * Adds floating `+col` (right edge) and `+row` (bottom edge) buttons to
	 * the wrapper. CSS handles the hover-only visibility — the buttons are
	 * always in the DOM but hidden via opacity until the wrapper is hovered.
	 *
	 * Click handlers dispatch a single transaction of point inserts read from
	 * the current source lines `sourceRange.startLine..endLine`: `+col` appends
	 * one cell at the end of every table line, `+row` inserts one line after
	 * the last. Existing bytes are never re-serialised from the parsed model,
	 * which drops cells beyond the header count, has lost the raw cell
	 * escaping, and has no line prefix (`> ` or a list indent) to write back.
	 */
	private attachAddButtons(wrapper: HTMLElement, view: EditorView): void {
		// `mousedown` must stopPropagation BEFORE CodeMirror's own mousedown
		// handler runs — otherwise CM moves the cursor into the table range,
		// the reveal rule shows the table as source on the next render, the widget
		// is destroyed, and the button's `click` event never fires (target gone).
		// Same pattern as MetaBindSelect / language switcher / callout type
		// popover. Without this, the buttons silently no-op.
		const addCol = document.createElement('button');
		addCol.type = 'button';
		addCol.className = 'cm-lp-table-add cm-lp-table-add-col';
		addCol.textContent = '+';
		addCol.title = 'Add column';
		addCol.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
		});
		addCol.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.dispatchAppendColumn(view);
		};
		wrapper.appendChild(addCol);

		const addRow = document.createElement('button');
		addRow.type = 'button';
		addRow.className = 'cm-lp-table-add cm-lp-table-add-row';
		addRow.textContent = '+';
		addRow.title = 'Add row';
		addRow.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
		});
		addRow.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.dispatchAppendRow(view);
		};
		wrapper.appendChild(addRow);
	}

	/** Appends one cell to the end of every table line, in one transaction. */
	private dispatchAppendColumn(view: EditorView): void {
		const { doc } = view.state;
		const { startLine, endLine } = this.sourceRange;
		const alignments = delimiterAlignments(doc.line(startLine + 1).text);
		const delimiter = ` ${delimiterCell(alignments[alignments.length - 1] ?? 'left')} |`;
		const changes = [];
		for (let n = startLine; n <= endLine; n++) {
			const line = doc.line(n);
			const content = line.text.trimEnd();
			const close = TRAILING_PIPE_RE.test(content) ? '' : ' |';
			changes.push({
				from: line.from + content.length,
				insert: close + (n === startLine + 1 ? delimiter : '  |'),
			});
		}
		view.dispatch({ changes, userEvent: 'input.table.add-column' });
	}

	/**
	 * Inserts one empty row after the last table line, carrying that line's
	 * container prefix (`> `, a list indent) and one cell per delimiter column.
	 */
	private dispatchAppendRow(view: EditorView): void {
		const { doc } = view.state;
		const { startLine, endLine } = this.sourceRange;
		const columns = delimiterAlignments(doc.line(startLine + 1).text).length;
		const last = doc.line(endLine);
		const prefix = LINE_PREFIX_RE.exec(last.text)![0];
		view.dispatch({
			changes: { from: last.to, insert: `\n${prefix}|${'  |'.repeat(columns)}` },
			userEvent: 'input.table.add-row',
		});
	}
}

/** A line whose content ends in an unescaped `|` (an even run of `\` before it). */
const TRAILING_PIPE_RE = /(^|[^\\])(\\\\)*\|$/;

/** Container prefix of a table line: leading whitespace and blockquote `>` markers. */
const LINE_PREFIX_RE = /^[\s>]*/;

/**
 * Column alignments of a delimiter line, read without its container prefix:
 * on a pipe-less table in a quote the first cell would otherwise be `> ---`,
 * which is not a delimiter cell, and the column count would come out one short.
 */
function delimiterAlignments(text: string): ColumnAlignment[] {
	return parseAlignments(text.slice(LINE_PREFIX_RE.exec(text)![0].length));
}

/** Delimiter-row cell for a column alignment. */
function delimiterCell(a: ColumnAlignment): string {
	return a === 'center' ? ':---:' : a === 'right' ? '---:' : '---';
}

/** Renders headers/alignments/rows as a markdown pipe-table source string. */
export function renderTableSource(
	headers: string[],
	alignments: ColumnAlignment[],
	rows: string[][],
): string {
	const cellEscape = (cell: string) => cell.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

	const lines: string[] = [];
	lines.push(`| ${headers.map(cellEscape).join(' | ')} |`);
	lines.push(`| ${alignments.map(delimiterCell).join(' | ')} |`);
	for (const row of rows) {
		const padded = [...row];
		while (padded.length < headers.length) padded.push('');
		lines.push(`| ${padded.map(cellEscape).join(' | ')} |`);
	}
	return lines.join('\n');
}

/**
 * Resolves a wikilink image embed target to a webview-loadable asset URL.
 * Returns `null` when the target cannot be resolved against the current vault.
 *
 * The vault-relative path comes from the wikilink (e.g. `image.png` or
 * `Resources/foo/image.png`); the host resolves it and turns the file path
 * into an `asset://` URL the webview can load (gated by the asset-protocol
 * scope in `tauri.conf.json`).
 */
export function resolveImageEmbedAssetUrl(host: EditorHost, target: string): string | null {
	const resolved = host.resolveLink(target);
	if (!resolved) return null;
	return host.assetUrl(resolved) || null;
}

/** Widget that renders a wikilink image embed (`![[image.png]]`, `![[image.png|300]]`) */
export class WikilinkImageEmbedWidget extends WidgetType {
	constructor(
		readonly target: string,
		readonly width: number | null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-image-wrapper';
		const img = document.createElement('img');
		img.alt = this.target;
		img.className = 'cm-lp-image';
		if (this.width !== null) {
			img.style.maxWidth = `${this.width}px`;
		}
		wrapper.appendChild(img);

		const url = resolveImageEmbedAssetUrl(view.state.facet(editorHost), this.target);
		if (url) {
			img.src = url;
		} else {
			wrapper.classList.add('cm-lp-image-missing');
			wrapper.textContent = `"${this.target}" not found`;
		}

		return wrapper;
	}

	eq(other: WikilinkImageEmbedWidget) {
		return this.target === other.target && this.width === other.width;
	}

	ignoreEvent() {
		return true;
	}
}

/** Reads the embedded note through the host and extracts the relevant embed content */
async function loadEmbedContent(
	host: EditorHost,
	target: string,
	heading: string | null,
	blockId: string | null,
): Promise<string | null> {
	const filePath = host.resolveLink(target);
	if (!filePath) return null;

	const content = await host.readNote(filePath);

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
		// The header opens the embedded note like a wikilink click. `ignoreEvent()`
		// already keeps CodeMirror from moving the cursor onto the embed line; the
		// press is also stopped (CLAUDE.md live-preview rule 11) so nothing else
		// reveals the raw `![[...]]` and destroys this widget.
		header.addEventListener('mousedown', (e) => {
			// Right click and macOS Ctrl+click mean the context menu: keep the default.
			if (e.button !== 0 || isMacContextClick(e, IS_MAC)) return;
			e.preventDefault();
			e.stopPropagation();
			void followWikilinkInfo(view, { target: this.target, heading: this.heading, blockId: this.blockId });
		});

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

		loadEmbedContent(view.state.facet(editorHost), this.target, this.heading, this.blockId)
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

/**
 * The stored value a meta-bind control bound to `bindTarget` shows, as text,
 * or null when the note does not hold it. Parsed properties carry canonical
 * keys, so an alias target (`archived`) reads its canonical key (`_archived`).
 */
export function boundValue(properties: Property[], bindTarget: string): string | null {
	const key = canonicalizeKey(bindTarget);
	const prop = properties.find((p) => p.key === key);
	return prop ? String(prop.value) : null;
}

/** Names a meta-bind control after the property it writes, for screen readers and as its tooltip. */
function labelControl(control: HTMLElement, bindTarget: string): void {
	const key = canonicalizeKey(bindTarget);
	control.setAttribute('aria-label', key);
	control.title = key;
}

/**
 * Creates a `<select>` element for a meta-bind inline select input, for
 * MetaBindSelectWidget (inline and in table cells).
 */
function createMetaBindSelect(
	options: MetaBindOption[],
	bindTarget: string,
	currentValue: string | null,
	view: EditorView,
): HTMLSelectElement {
	const select = document.createElement('select');
	select.className = 'cm-lp-meta-bind-select';
	labelControl(select, bindTarget);

	// Placeholder when no value is set
	if (currentValue === null || currentValue === '') {
		const placeholder = document.createElement('option');
		placeholder.value = '';
		placeholder.textContent = 'Select...';
		placeholder.disabled = true;
		placeholder.selected = true;
		select.appendChild(placeholder);
	} else if (!options.some((opt) => opt.value === currentValue)) {
		// Show what the note holds rather than claim the first option's value.
		const stored = document.createElement('option');
		stored.value = currentValue;
		stored.textContent = currentValue;
		stored.disabled = true;
		stored.selected = true;
		select.appendChild(stored);
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

	// What the first render selected (an option, the placeholder or the stored
	// value), which a refused write restores.
	const initialIndex = select.selectedIndex;

	select.addEventListener('change', (e) => {
		const selectedValue = (e.target as HTMLSelectElement).value;
		// A refused write rebuilds nothing, so put the control back to what it first showed.
		if (!dispatchMetaBindUpdate(view, bindTarget, typedOptionValue(selectedValue))) {
			select.selectedIndex = initialIndex;
		}
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

	ignoreEvent(event: Event) {
		return isFormControlInputEvent(event);
	}
}

/**
 * Dispatches a meta-bind INPUT type to its widget class, for the inline
 * plugin and for table cells. Returns null for unsupported types so the
 * caller falls through (the legacy behaviour was to treat every type as
 * inlineSelect; now unrecognised types just skip decoration and the user
 * sees the raw `INPUT[...]` source).
 */
export function pickWidget(
	inputType: string,
	options: MetaBindOption[],
	bindTarget: string,
	currentValue: string | null,
): WidgetType | null {
	switch (inputType) {
		case 'number':
		case 'date':
			return new MetaBindTextInputWidget(inputType, bindTarget, currentValue);
		case 'toggle':
		case 'boolean':
			return new MetaBindToggleWidget(bindTarget, currentValue);
		case 'inlineSelect':
		default:
			// Default keeps backward compatibility: any input with options renders
			// as an inline select. Inputs without options + unknown type fall
			// through to null below.
			if (options.length > 0) {
				return new MetaBindSelectWidget(options, bindTarget, currentValue);
			}
			return null;
	}
}

/**
 * Dispatches a frontmatter-property update for a meta-bind writer: the inline
 * select, the number / date / toggle inputs and the button's `updateMetadata`
 * action. Refuses with an error toast when rebuilding the block from the
 * parsed properties would lose data (`detectLossyFrontmatter`): a block that
 * does not parse parses to `[]` and would keep only the bound property, and
 * comments, nested values, duplicate keys, anchors and integers beyond 2^53
 * do not survive the round trip.
 *
 * A number or boolean `newValue` is written as a YAML number or boolean, a
 * string as a string (see `setPropertyByBindTarget`).
 *
 * Returns `false` when the write was refused. Nothing is dispatched then, so
 * the widget is not rebuilt: the caller resets its control to what it showed
 * before the edit.
 */
export function dispatchMetaBindUpdate(
	view: EditorView,
	bindTarget: string,
	newValue: string | number | boolean,
): boolean {
	const doc = view.state.doc.toString();
	const lossy = detectLossyFrontmatter(doc);
	if (lossy !== null) {
		editorLog('META-BIND', `refused write to ${bindTarget}: frontmatter is ${lossy}`);
		const reason = LOSSY_FRONTMATTER_MESSAGES[lossy];
		toast.error(`Cannot set ${bindTarget}: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`);
		return false;
	}
	const properties = parseFrontmatterProperties(doc);
	const body = extractBody(doc);
	const updated = setPropertyByBindTarget(properties, bindTarget, newValue);
	const newContent = rebuildContent(updated, body, doc);
	const frontmatterEnd = doc.length - body.length;
	const newFrontmatter = newContent.slice(0, newContent.length - body.length);
	const changes = view.state.changes({ from: 0, to: frontmatterEnd, insert: newFrontmatter });
	// The replaced lines are hidden (0 px) and usually off screen, so CodeMirror
	// re-estimates them at the default line height. Its own scroll anchor is lost
	// when a focus update from the control lands before the next measure, and
	// the text on screen slides down; the snapshot pins it
	// (e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts).
	view.dispatch({ changes, effects: view.scrollSnapshot().map(changes) });
	return true;
}

/** Pure validator: an empty string OR a finite number (`Number.isFinite`). */
export function isNumericString(text: string): boolean {
	if (text.trim() === '') return true; // empty = clearing the property
	const n = Number(text);
	return Number.isFinite(n);
}

/** Pure validator: empty string OR a `YYYY-MM-DD` date that round-trips through Date. */
export function isDateString(text: string): boolean {
	if (text.trim() === '') return true;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) return false;
	const d = new Date(text.trim());
	return !Number.isNaN(d.getTime());
}

/**
 * Per-type options for `MetaBindTextInputWidget`. The input type is the single
 * source of truth — validator and invalid message are looked up from it — so
 * `eq()` comparing the type compares the whole opts triple.
 */
const META_BIND_TEXT_INPUTS = {
	number: { validate: isNumericString, invalidMessage: 'Not a number' },
	date: { validate: isDateString, invalidMessage: 'Use YYYY-MM-DD' },
} as const;

/** Meta-bind INPUT types rendered as a validated text input. */
export type MetaBindTextInputType = keyof typeof META_BIND_TEXT_INPUTS;

/**
 * Widget for `INPUT[number():prop]` and `INPUT[date():prop]` — a text input
 * with inline validation. Pre-existing malformed frontmatter (e.g.
 * `count: not a number`) is flagged with `cm-lp-meta-bind-input-invalid` on
 * first render. Commit on blur/Enter; revert on Escape. Renders as
 * `<input type="number">` / `<input type="date">` (native date picker), or as
 * `type="text"` when the note's value is one those types cannot hold.
 */
export class MetaBindTextInputWidget extends WidgetType {
	constructor(
		readonly inputType: MetaBindTextInputType,
		readonly bindTarget: string,
		readonly currentValue: string | null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		return buildMetaBindTextInput(view, this.bindTarget, this.currentValue, this.inputType);
	}

	eq(other: MetaBindTextInputWidget) {
		// `inputType` MUST be compared. Before number/date were merged into this
		// one class, class identity was the ONLY thing stopping CodeMirror from
		// reusing a `<input type="number">` (with `isNumericString` and the wrong
		// invalid message still wired up) for a `date()` field at the same
		// position with the same value — reachable via watcher-driven reload of
		// the open tab, undo/redo, or replace-all, i.e. any doc change the cursor
		// is not sitting on. Opts are derived from `inputType` through
		// `META_BIND_TEXT_INPUTS`, so comparing the type compares the opts.
		return this.inputType === other.inputType
			&& this.bindTarget === other.bindTarget
			&& this.currentValue === other.currentValue;
	}

	ignoreEvent(event: Event) {
		return isFormControlInputEvent(event);
	}
}

/**
 * Widget for `INPUT[toggle():prop]` / `INPUT[boolean():prop]` — native
 * checkbox styled inline. Truthy frontmatter values (`true`/`yes`/`1`) start
 * checked; everything else starts unchecked. Toggling immediately commits
 * the YAML boolean `true` or `false` to frontmatter.
 */
export class MetaBindToggleWidget extends WidgetType {
	constructor(
		readonly bindTarget: string,
		readonly currentValue: string | null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const wrap = document.createElement('label');
		wrap.className = 'cm-lp-meta-bind-toggle';
		const cb = document.createElement('input');
		cb.type = 'checkbox';
		cb.className = 'cm-lp-meta-bind-toggle-input';
		labelControl(cb, this.bindTarget);
		const truthy = ['true', 'yes', '1', 'on'];
		cb.checked = this.currentValue !== null && truthy.includes(this.currentValue.toLowerCase());
		cb.addEventListener('mousedown', (e) => e.stopPropagation());
		cb.addEventListener('change', () => {
			if (!dispatchMetaBindUpdate(view, this.bindTarget, cb.checked)) {
				cb.checked = !cb.checked;
			}
		});
		wrap.appendChild(cb);
		return wrap;
	}

	eq(other: MetaBindToggleWidget) {
		return this.bindTarget === other.bindTarget && this.currentValue === other.currentValue;
	}

	ignoreEvent(event: Event) {
		return isFormControlInputEvent(event);
	}
}

/** Internal helper: builds the text input for number/date widgets with shared validation behaviour. */
function buildMetaBindTextInput(
	view: EditorView,
	bindTarget: string,
	currentValue: string | null,
	inputType: MetaBindTextInputType,
): HTMLElement {
	const { validate, invalidMessage } = META_BIND_TEXT_INPUTS[inputType];
	const wrap = document.createElement('span');
	wrap.className = 'cm-lp-meta-bind-input-wrap';

	const input = document.createElement('input');
	input.type = inputType;
	input.className = 'cm-lp-meta-bind-input';
	labelControl(input, bindTarget);
	const initial = currentValue ?? '';
	input.value = initial;
	// Number and date inputs sanitize a value they cannot hold (`1,000`,
	// `2026-01-05T10:00`) to "". Show it as text so the user sees what the note holds.
	if (input.value === '' && initial !== '') {
		input.type = 'text';
		input.value = initial;
	}
	// What the input shows, which the guard and resets compare against: a
	// sanitized "" compared with `initial` would read as an edit that clears the property.
	const shown = input.value;

	const error = document.createElement('span');
	error.className = 'cm-lp-meta-bind-input-error';
	error.textContent = '';

	const isInvalid = !validate(initial);
	if (isInvalid) {
		wrap.classList.add('cm-lp-meta-bind-input-invalid');
		error.textContent = invalidMessage;
	}

	const validateNow = () => {
		const ok = validate(input.value);
		if (ok) {
			wrap.classList.remove('cm-lp-meta-bind-input-invalid');
			error.textContent = '';
		} else {
			wrap.classList.add('cm-lp-meta-bind-input-invalid');
			error.textContent = invalidMessage;
		}
		return ok;
	};

	// Blur fires after Escape, after a focus with no typing and after a refused
	// Enter commit. Each leaves the input at `shown`, which has nothing to write
	// (and must not toast twice). A successful Enter rebuilds the widget.
	const commit = () => {
		if (input.value === shown) return;
		if (!validateNow()) return;
		// A number input writes a YAML number; emptied, it writes "" (clearing), never 0.
		// An integer beyond 2^53 is written as typed: Number() would round it, and
		// the rounded value makes the frontmatter lossy (ADR 0029).
		const n = inputType === 'number' && input.value.trim() !== '' ? Number(input.value) : null;
		const value = n !== null && (Number.isSafeInteger(n) || !Number.isInteger(n)) ? n : input.value;
		if (!dispatchMetaBindUpdate(view, bindTarget, value)) {
			input.value = shown;
			validateNow();
			return;
		}
		// `5.0` over `5` leaves `count: 5` on disk: the rebuilt widget is eq() to
		// this one, so CodeMirror keeps this input. Show what was written.
		if (typeof value === 'number') input.value = String(value);
	};

	input.addEventListener('mousedown', (e) => e.stopPropagation());
	input.addEventListener('input', validateNow);
	input.addEventListener('blur', commit);
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			input.value = shown;
			validateNow();
			input.blur();
		}
	});

	wrap.appendChild(input);
	wrap.appendChild(error);
	return wrap;
}

