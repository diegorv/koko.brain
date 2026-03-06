import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';
import type { KBPage, KBLink, KBElOptions } from './queryjs.types';
import { DataArray } from './data-array';
import { KBDateTime } from './kb-datetime';
import { KBUI } from './kb-ui';
import { buildKBLink, buildKBPage, buildReverseIndex, parseSource } from './queryjs.logic';
import { openFileInEditor } from '$lib/core/editor/editor.service';

/**
 * QueryJS API object.
 * Instantiated per widget render with access to the container DOM and vault data.
 * Provides the `kb` (and legacy `dv`) scripting API for inline queries.
 */
export class KBAPI {
	/** The DOM container to render into */
	readonly container: HTMLElement;

	private readonly propertyIndex: Map<string, NoteRecord>;
	private readonly noteIndex: Map<string, WikiLink[]>;
	private readonly noteContents: Map<string, string>;
	private readonly currentFilePath: string;
	private readonly vaultPath: string;
	private readonly loadScript: (path: string) => Promise<string>;
	private _pageCache: { list: KBPage[]; byPath: Map<string, KBPage> } | null = null;
	private _ui: KBUI | null = null;

	constructor(opts: {
		container: HTMLElement;
		propertyIndex: Map<string, NoteRecord>;
		noteIndex: Map<string, WikiLink[]>;
		noteContents: Map<string, string>;
		currentFilePath: string;
		vaultPath: string;
		loadScript: (path: string) => Promise<string>;
	}) {
		this.container = opts.container;
		this.propertyIndex = opts.propertyIndex;
		this.noteIndex = opts.noteIndex;
		this.noteContents = opts.noteContents;
		this.currentFilePath = opts.currentFilePath;
		this.vaultPath = opts.vaultPath;
		this.loadScript = opts.loadScript;
	}

	// ── Query methods ──

	/**
	 * Returns all pages, optionally filtered by a source string.
	 * kb.pages() — all pages
	 * kb.pages('#tag') — pages with that tag (includes subtags)
	 * kb.pages('"folder"') — pages in that folder
	 */
	pages(source?: string): DataArray<KBPage> {
		const cache = this.ensureCache();

		if (source) {
			const filter = parseSource(source);
			if (filter) {
				return new DataArray(cache.list.filter(filter));
			}
		}

		return new DataArray(cache.list);
	}

	/** Returns file paths, optionally filtered by source */
	pagePaths(source?: string): DataArray<string> {
		return this.pages(source).map((p) => p.file.path);
	}

	/** Returns the KBPage for the currently active file */
	current(): KBPage | null {
		return this.ensureCache().byPath.get(this.currentFilePath) ?? null;
	}

	/** Returns KBPage for a specific file path */
	page(path: string): KBPage | undefined {
		return this.ensureCache().byPath.get(path);
	}

	/** UI render helpers namespace (cards, heatmap, tagCloud, table, etc.) */
	get ui(): KBUI {
		if (!this._ui) {
			this._ui = new KBUI(this.container, this.renderValue.bind(this));
		}
		return this._ui;
	}

	// ── Date/utility methods ──

	/** Creates a KBDateTime from a string, number, Date, or returns now */
	date(input?: string | number | Date): KBDateTime {
		return new KBDateTime(input);
	}

	/**
	 * Safely normalizes any date-like value to KBDateTime.
	 * Returns null for values that cannot be parsed.
	 * Handles: null, undefined, KBDateTime, Date, number, string,
	 * objects with {year, month, day}, objects with {ts}.
	 */
	tryDate(value: unknown): KBDateTime | null {
		return KBDateTime.tryParse(value);
	}

	/**
	 * Generates a DataArray of KBDateTime for each day from start to end (inclusive).
	 * Start and end are normalized via tryDate — accepts any date-like input.
	 * Returns an empty DataArray if either bound is not parseable or start > end.
	 */
	getDaysInRange(start: unknown, end: unknown): DataArray<KBDateTime> {
		const startDt = KBDateTime.tryParse(start);
		const endDt = KBDateTime.tryParse(end);
		if (!startDt || !endDt) return new DataArray<KBDateTime>([]);

		const startDay = startDt.startOf('day');
		const endDay = endDt.startOf('day');
		if (startDay > endDay) return new DataArray<KBDateTime>([]);

		const days: KBDateTime[] = [];
		let current = startDay;
		while (current <= endDay) {
			days.push(current);
			current = current.plus({ days: 1 });
		}
		return new DataArray(days);
	}

	/** Wraps a value in a DataArray */
	array(raw: unknown): DataArray<unknown> {
		if (raw instanceof DataArray) return raw;
		if (Array.isArray(raw)) return new DataArray(raw);
		return new DataArray([raw]);
	}

	/** Returns true if the value is a DataArray or plain Array */
	isArray(raw: unknown): boolean {
		return raw instanceof DataArray || Array.isArray(raw);
	}

	/** Creates a KBLink from a path */
	fileLink(path: string, _embed?: boolean, display?: string): KBLink {
		const link = buildKBLink(path);
		if (display) link.display = display;
		return link;
	}

	/** Compares two values, returning negative/zero/positive */
	compare(a: unknown, b: unknown): number {
		if (a === b) return 0;
		if (a == null) return -1;
		if (b == null) return 1;
		if (a < b) return -1;
		if (a > b) return 1;
		return 0;
	}

	/** Returns true if two values are equal */
	equal(a: unknown, b: unknown): boolean {
		return this.compare(a, b) === 0;
	}

	/** Safely converts any value to a number. Returns 0 for non-numeric values. */
	number(value: unknown): number {
		return Number(value) || 0;
	}

	/**
	 * Returns a text progress bar string using Unicode block characters.
	 * Value is clamped between 0 and max. Uses filled (U+2588) and empty (U+2591) chars.
	 * Distinct from kb.ui.progressBar() which renders DOM elements.
	 */
	progressBar(value: number, max: number): string {
		const clamped = Math.max(0, Math.min(max, Math.round(value)));
		return '\u2588'.repeat(clamped) + '\u2591'.repeat(max - clamped);
	}

	// ── Render methods ──

	/**
	 * Creates an HTML element, optionally sets text and attributes, appends to container.
	 * Returns the element for further manipulation.
	 */
	el<K extends keyof HTMLElementTagNameMap>(
		tag: K,
		text?: string,
		options?: KBElOptions,
	): HTMLElementTagNameMap[K] {
		const element = document.createElement(tag);

		if (text !== undefined && text !== null && text !== '') {
			element.textContent = text;
		}

		if (options?.attr) {
			for (const [key, value] of Object.entries(options.attr)) {
				element.setAttribute(key, value);
			}
		}

		if (options?.cls) {
			element.className = options.cls;
		}

		this.container.appendChild(element);
		return element;
	}

	/** Renders a paragraph */
	paragraph(text: string): HTMLParagraphElement {
		return this.el('p', text);
	}

	/** Renders a header (h1-h6). Accepts strings or KBLink objects. */
	header(level: number, content: unknown): HTMLElement {
		const tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof HTMLElementTagNameMap;
		if (typeof content === 'string') {
			return this.el(tag, content);
		}
		const el = document.createElement(tag);
		this.renderValue(el, content);
		this.container.appendChild(el);
		return el;
	}

	/** Renders a span */
	span(text: string, options?: KBElOptions): HTMLSpanElement {
		return this.el('span', text, options);
	}

	/** Renders a bulleted list. KBLink items become clickable links. */
	list(items: Iterable<unknown> | DataArray<unknown>): HTMLElement {
		const arr = items instanceof DataArray ? items.array() : [...items];
		const ul = document.createElement('ul');
		ul.className = 'cm-lp-qjs-list';

		for (const item of arr) {
			const li = document.createElement('li');
			this.renderValue(li, item);
			ul.appendChild(li);
		}

		this.container.appendChild(ul);
		return ul;
	}

	/** Renders a table with headers and rows */
	table(headers: string[], rows: unknown[][] | DataArray<unknown[]>): HTMLElement {
		const arr = rows instanceof DataArray ? rows.array() : rows;
		const table = document.createElement('table');
		table.className = 'cm-lp-qjs-table';

		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		for (const h of headers) {
			const th = document.createElement('th');
			th.textContent = String(h);
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');
		for (const row of arr) {
			const tr = document.createElement('tr');
			const cells = Array.isArray(row) ? row : [row];
			for (const cell of cells) {
				const td = document.createElement('td');
				this.renderValue(td, cell);
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);

		this.container.appendChild(table);
		return table;
	}

	/** Renders a task list with checkboxes */
	taskList(tasks: { text: string; completed: boolean }[]): HTMLElement {
		const ul = document.createElement('ul');
		ul.className = 'cm-lp-qjs-tasklist';

		for (const task of tasks) {
			const li = document.createElement('li');
			const cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.checked = task.completed;
			cb.disabled = true;
			li.appendChild(cb);
			const span = document.createElement('span');
			span.textContent = ' ' + task.text;
			li.appendChild(span);
			ul.appendChild(li);
		}

		this.container.appendChild(ul);
		return ul;
	}

	// ── I/O methods ──

	/**
	 * Loads and executes an external .js script from the vault.
	 * Exposes the API as both `kb` (primary) and `dv` (legacy alias).
	 */
	async view(scriptPath: string, input?: unknown): Promise<void> {
		try {
			const fullPath = this.resolveScriptPath(scriptPath);
			const code = await this.loadScript(fullPath);

			// If script contains await, wrap in async IIFE.
			// Must prepend `return` so the promise is returned from the Function body,
			// otherwise it floats unhandled and errors escape try/catch.
			const wrappedCode = code.includes('await')
				? `return (async () => { ${code} })()`
				: code;

			const fn = new Function('kb', 'dv', 'input', wrappedCode);
			await Promise.resolve(fn(this, this, input));
		} catch (err) {
			const errorEl = document.createElement('div');
			errorEl.className = 'cm-lp-qjs-error';
			errorEl.textContent = `QueryJS Error in ${scriptPath}: ${err instanceof Error ? err.message : String(err)}`;
			this.container.appendChild(errorEl);
		}
	}

	// ── Private helpers ──

	/** Builds and caches all KBPages on first access, returns the cache */
	private ensureCache(): { list: KBPage[]; byPath: Map<string, KBPage> } {
		if (!this._pageCache) {
			const allFilePaths = Array.from(this.propertyIndex.keys());
			const reverseIndex = buildReverseIndex(this.noteIndex);
			const list = allFilePaths.map((fp) => {
				const record = this.propertyIndex.get(fp)!;
				return buildKBPage(record, this.noteIndex, this.noteContents, allFilePaths, reverseIndex);
			});
			const byPath = new Map<string, KBPage>();
			for (const page of list) {
				byPath.set(page.file.path, page);
			}
			this._pageCache = { list, byPath };
		}
		return this._pageCache;
	}

	/** Renders a value into an element — KBLink as clickable <a>, HTMLElement appended directly, dates as strings */
	private renderValue(el: HTMLElement, value: unknown): void {
		if (value instanceof HTMLElement) {
			el.appendChild(value);
			return;
		}
		if (
			value &&
			typeof value === 'object' &&
			'path' in value &&
			'display' in value &&
			typeof (value as KBLink).path === 'string' &&
			typeof (value as KBLink).display === 'string'
		) {
			const link = value as KBLink;
			const a = document.createElement('a');
			a.textContent = link.display;
			a.className = 'cm-lp-qjs-link';
			a.href = '#';
			a.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				openFileInEditor(link.path);
			});
			el.appendChild(a);
		} else if (value instanceof KBDateTime) {
			el.textContent = value.toISODate();
		} else if (value instanceof Date) {
			el.textContent = value.toISOString().split('T')[0];
		} else if (Array.isArray(value)) {
			el.textContent = value.map(String).join(', ');
		} else {
			el.textContent = value == null ? '—' : String(value);
		}
	}

	/** Resolves a script path relative to the vault root, with sanitization */
	private resolveScriptPath(scriptPath: string): string {
		const withExt = scriptPath.endsWith('.js') ? scriptPath : `${scriptPath}.js`;
		const joined = withExt.startsWith('/')
			? `${this.vaultPath}${withExt}`
			: `${this.vaultPath}/${withExt}`;

		// Normalize double slashes and reject path traversal
		const normalized = joined.replace(/\/+/g, '/');
		if (normalized.includes('..')) {
			throw new Error(`Script path traversal not allowed: ${scriptPath}`);
		}
		return normalized;
	}
}
