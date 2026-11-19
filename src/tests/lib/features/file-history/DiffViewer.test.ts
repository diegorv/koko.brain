// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import DiffViewer from '#lib/features/file-history/DiffViewer.svelte';
import type { DiffLine } from '#lib/features/file-history/file-history.types.js';

// bits-ui ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const LINES: DiffLine[] = [
	{ type: 'equal', content: 'same', oldLineNum: 1, newLineNum: 1 },
	{ type: 'delete', content: 'gone', oldLineNum: 2 },
	{ type: 'insert', content: 'added', newLineNum: 2 },
];

describe('DiffViewer', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function render(diffLines: DiffLine[], isLoading = false): void {
		component = mount(DiffViewer, { target: document.body.appendChild(document.createElement('div')), props: { diffLines, isLoading } });
		flushSync();
	}

	/** The table row whose content cell reads `content`. */
	function row(content: string): HTMLTableRowElement {
		const tr = [...document.querySelectorAll<HTMLTableRowElement>('tbody tr')].find((r) => r.cells[3].textContent === content);
		if (!tr) throw new Error(`row "${content}" not found`);
		return tr;
	}

	const classes = (el: Element) => el.className.split(' ');

	it('draws deleted and inserted lines in the text-on-tint color of their tint, not the raw status color', () => {
		render(LINES);
		expect(classes(row('gone'))).toEqual(expect.arrayContaining(['bg-destructive/15', 'text-destructive-tint-fg']));
		expect(classes(row('gone'))).not.toContain('text-destructive');
		expect(classes(row('added'))).toEqual(expect.arrayContaining(['bg-success/15', 'text-success-tint-fg']));
		expect(classes(row('added'))).not.toContain('text-success');
		expect(row('same').className).toBe('');
	});

	it('line numbers on a changed line take the line color; unchanged lines keep them muted', () => {
		render(LINES);
		for (const content of ['gone', 'added']) {
			expect(classes(row(content).cells[0])).not.toContain('text-muted-foreground');
			expect(classes(row(content).cells[1])).not.toContain('text-muted-foreground');
		}
		expect(classes(row('same').cells[0])).toContain('text-muted-foreground');
		expect(row('gone').cells[0].textContent?.trim()).toBe('2');
		expect(row('added').cells[1].textContent?.trim()).toBe('2');
		expect(row('gone').cells[2].textContent).toBe('-');
		expect(row('added').cells[2].textContent).toBe('+');
	});

	it('shows the empty and loading states instead of a table', () => {
		render([]);
		expect(document.body.textContent).toContain('Select a snapshot to view changes');
		expect(document.querySelector('table')).toBeNull();
		unmount(component!);
		render(LINES, true);
		expect(document.body.textContent).toContain('Loading diff...');
		expect(document.querySelector('table')).toBeNull();
	});
});
