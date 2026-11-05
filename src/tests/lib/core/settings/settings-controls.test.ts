import { describe, it, expect } from 'vitest';

import { readSource, settingsFiles } from './settings-files';

/**
 * Source scan of the Settings panel and its pages: every field uses the shadcn
 * `Input` / `Select`, so all of them share one fill, border and focus ring.
 * Native inputs are allowed only where shadcn has no equivalent: the colour
 * picker and the hidden file picker.
 */

const NATIVE_INPUT_TYPES = new Set(['color', 'file']);

/** `file:line` of every raw `<input>` whose type is not allowed, and every native `<select>`. */
function rawControls(path: string, source: string): string[] {
	const found: string[] = [];
	const lineOf = (index: number) => source.slice(0, index).split('\n').length;
	for (const m of source.matchAll(/<select\b/g)) found.push(`${path}:${lineOf(m.index)} <select>`);
	for (const m of source.matchAll(/<input\b([^>]*)>/g)) {
		const type = /\btype="([^"]*)"/.exec(m[1])?.[1] ?? 'text';
		if (!NATIVE_INPUT_TYPES.has(type)) found.push(`${path}:${lineOf(m.index)} <input type="${type}">`);
	}
	return found;
}

describe('Settings controls', () => {
	it('flags a native select and a raw text input, not a colour or file input', () => {
		const lt = '<';
		const fixture = [
			`${lt}input type="color" />`,
			`${lt}input type="file" class="hidden" />`,
			`${lt}input type="text" />`,
			`${lt}input value={x} />`,
			`${lt}select value={x}></select>`,
			`${lt}Input type="text" />`,
		].join('\n');
		expect(rawControls('f', fixture)).toEqual(['f:5 <select>', 'f:3 <input type="text">', 'f:4 <input type="text">']);
	});

	it('scans the components the sections import, not only the sections', () => {
		expect(settingsFiles()).toContain('src/lib/core/settings/sections/ThemeColorRow.svelte');
	});

	it('uses the shadcn Input and Select for every field', () => {
		const off = settingsFiles().flatMap((path) => rawControls(path, readSource(path)));
		expect(off).toEqual([]);
	});
});
