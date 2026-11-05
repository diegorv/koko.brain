import { describe, it, expect } from 'vitest';

import { readSource, settingsFiles } from './settings-files';

/**
 * Source scan of the Settings panel and its pages: every field uses the shadcn
 * `Input` / `Select`, so all of them share one fill, border and focus ring.
 * Native inputs are allowed only where shadcn has no equivalent: the colour
 * picker and the hidden file picker.
 */

const NATIVE_INPUT_TYPES = new Set(['color', 'file']);

/** Raw `<button>` tags per file that are not actions, so the shadcn `Button` does not fit them. */
const RAW_BUTTONS: Record<string, number> = {
	// Navigation row, one tag in an `{#each}`.
	'src/lib/app/SettingsPanel.svelte': 1,
	// Inline text links.
	'src/lib/core/settings/sections/TodoistSection.svelte': 1,
	'src/lib/core/settings/sections/UpdateSection.svelte': 1,
	// Tabs of the colour groups.
	'src/lib/core/settings/sections/ThemeEditor.svelte': 1,
	// The remove mark inside a folder chip.
	'src/lib/features/auto-move/AutoMoveSection.svelte': 1,
	// Colour swatch, one tag in an `{#each}`.
	'src/lib/features/event-calendar/EventColorSwatches.svelte': 1,
};

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

	it('uses the shadcn Button for every action, past the listed exceptions', () => {
		const counts = Object.fromEntries(
			settingsFiles()
				.map((path) => [path, readSource(path).match(/<button\b/g)?.length ?? 0] as const)
				.filter(([, count]) => count > 0),
		);
		expect(counts).toEqual(RAW_BUTTONS);
	});

	it('gives a select the same height as an input', () => {
		const off = settingsFiles().filter((path) => /<Select\.Trigger\b[^>]*\bsize="sm"/.test(readSource(path)));
		expect(off).toEqual([]);
	});

	it('does not shrink the text of a button below the other buttons', () => {
		const off = settingsFiles().filter((path) => /<Button\b[^>]*\bclass="[^"]*\btext-(xs|meta|label)\b/.test(readSource(path)));
		expect(off).toEqual([]);
	});
});
