import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan of the app's context and dropdown menu items. The shadcn item
 * (`components/ui`, out of scope) already sets the row: `gap-2` between icon
 * and label, `size-4` icons and the 14px row text. A call site adds nothing on
 * top of it:
 * - no horizontal margin on the item or its content (`mr-2` on an icon
 *   doubles the gap); `ml-auto` and friends, which push a trailing mark to
 *   the edge, stay allowed;
 * - no `text-xs` label, which shrinks the item below the row size;
 * - a shortcut hint is `{formatShortcut(...)}`, never a hand-written string.
 * jsdom does not compute Tailwind, so the classes are held here by source.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ['src/lib', 'src/routes'];
const SKIP_DIR = 'src/lib/components/ui/';

function svelteFiles(): string[] {
	return SCAN_DIRS.flatMap((dir) =>
		readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
			.filter((name) => name.endsWith('.svelte'))
			.map((name) => join(dir, name)),
	).filter((path) => !path.startsWith(SKIP_DIR));
}

/** A menu element's source, from its open tag to its close tag, with its 1-based line. */
interface Element {
	line: number;
	text: string;
}

/** `name` matches both `ContextMenu.Item` and the flat `DropdownMenuItem` import style. */
function elements(source: string, name: RegExp): Element[] {
	const re = new RegExp(`<((?:ContextMenu|DropdownMenu)\\.?(?:${name.source}))(?=[\\s>])[\\s\\S]*?</\\1>`, 'g');
	return [...source.matchAll(re)].map((m) => ({
		line: source.slice(0, m.index).split('\n').length,
		text: m[0],
	}));
}

const ITEM = /Item|SubTrigger|CheckboxItem|RadioItem/;
const SHORTCUT = /Shortcut/;

const MARGIN_RE = /(?<![\w-])m[lrxse]-(?!auto(?![\w-]))[\w.[\]/-]+/;
const TEXT_XS_RE = /(?<![\w-])text-xs(?![\w-])/;

/** The anatomy rules one menu item breaks. */
function itemViolations(text: string): string[] {
	const found: string[] = [];
	const margin = text.match(MARGIN_RE);
	if (margin) found.push(margin[0]);
	if (TEXT_XS_RE.test(text)) found.push('text-xs');
	return found;
}

/** Whether a shortcut element's content is a `formatShortcut` call. */
function isFormattedShortcut(text: string): boolean {
	const content = text.replace(/^<[^>]*>/, '').replace(/<\/[^>]*>$/, '').trim();
	return /^\{formatShortcut\([\s\S]*\)\}$/.test(content);
}

/** `file:line rule` for every menu element in the app that breaks a rule. */
function sites(name: RegExp, check: (text: string) => string[]): string[] {
	const found: string[] = [];
	for (const path of svelteFiles()) {
		for (const el of elements(readFileSync(join(ROOT, path), 'utf8'), name)) {
			for (const rule of check(el.text)) found.push(`${path}:${el.line} ${rule}`);
		}
	}
	return found;
}

describe('menu item anatomy', () => {
	it('sees the app menus (a broken pattern cannot pass)', () => {
		const items = svelteFiles().flatMap((path) => elements(readFileSync(join(ROOT, path), 'utf8'), ITEM));
		expect(items.length).toBeGreaterThan(50);
	});

	it('adds no margin and no text-xs to a menu item', () => {
		expect(sites(ITEM, itemViolations)).toEqual([]);
	});

	it('prints every menu shortcut hint with formatShortcut', () => {
		expect(sites(SHORTCUT, (text) => (isFormattedShortcut(text) ? [] : ['hand-written shortcut']))).toEqual([]);
	});

	it('finds items in both import styles, across lines, with their first line', () => {
		const source = [
			'<div>',
			'<ContextMenu.Item onclick={go}>',
			'\t<Pin class="mr-2 size-4" />',
			'\tPin',
			'</ContextMenu.Item>',
			'<DropdownMenuItem><span class="text-xs">A</span></DropdownMenuItem>',
			'<ContextMenu.SubTrigger>Copy path</ContextMenu.SubTrigger>',
		].join('\n');
		const found = elements(source, ITEM);
		expect(found.map((el) => el.line)).toEqual([2, 6, 7]);
		expect(found.map((el) => itemViolations(el.text))).toEqual([['mr-2'], ['text-xs'], []]);
	});

	it('reports any side margin, but not an auto margin that aligns a trailing mark', () => {
		expect(itemViolations('<X class="ml-1 size-4" />')).toEqual(['ml-1']);
		expect(itemViolations('<X class="me-2" />')).toEqual(['me-2']);
		expect(itemViolations('<span class="ml-auto text-muted-foreground">✓</span>')).toEqual([]);
		expect(itemViolations('<X class="size-4" /> <span class="text-sm">A</span>')).toEqual([]);
	});

	it('accepts only a formatShortcut call as a shortcut hint', () => {
		expect(isFormattedShortcut('<ContextMenu.Shortcut>{formatShortcut(COMBO)}</ContextMenu.Shortcut>')).toBe(true);
		expect(isFormattedShortcut('<DropdownMenuShortcut>\n\t{formatShortcut({ key: "F2" })}\n</DropdownMenuShortcut>')).toBe(true);
		expect(isFormattedShortcut('<ContextMenu.Shortcut>⌘⇧L</ContextMenu.Shortcut>')).toBe(false);
		expect(isFormattedShortcut('<ContextMenu.Shortcut>F2</ContextMenu.Shortcut>')).toBe(false);
	});
});
