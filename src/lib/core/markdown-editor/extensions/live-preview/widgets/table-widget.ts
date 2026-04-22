import { EditorView, WidgetType } from '@codemirror/view';

import type { ColumnAlignment } from '../parsers/table';
import { findMetaBindInputRanges } from '../parsers/meta-bind-input';
import { renderInlineMarkdown } from '../parsers/inline-markdown';
import { WIKILINK_DECORATION_RE } from '../../wikilink/decoration.logic';
import type { Property } from '$lib/features/properties/properties.types';
import { openWikilinkTarget } from '../wikilink-navigation';
import { createMetaBindSelect } from './meta-bind-select-widget';

/**
 * Renders inline non-wikilink markdown segments (bold, italic, strikethrough,
 * code) as DOM nodes inside `parent`. Handles meta-bind INPUT fields when
 * `view` and `properties` are provided — a code segment that matches the
 * meta-bind pattern becomes a live <select>.
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

/**
 * Renders inline markdown segments as DOM nodes inside a parent element.
 * Supports bold, italic, strikethrough, inline code, meta-bind INPUT fields,
 * and wikilinks (rendered as clickable `<a>` elements).
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

/** Widget that renders a pipe-delimited markdown table as an HTML `<table>`. */
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
