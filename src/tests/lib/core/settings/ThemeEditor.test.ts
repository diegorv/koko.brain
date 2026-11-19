// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ThemeEditor from '#lib/core/settings/sections/ThemeEditor.svelte';
import { KOKOBRAIN_DEFAULT_THEME } from '#lib/core/settings/theme.logic.js';
import { readabilityFailures } from '#lib/core/settings/theme-builder.logic.js';
import { camelCaseToLabel } from '#lib/core/settings/theme-editor.logic.js';
import type { Theme } from '#lib/core/settings/theme.types.js';

describe('ThemeEditor - JSON import', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		document.documentElement.removeAttribute('style');
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ThemeEditor, {
			target,
			props: {
				theme: KOKOBRAIN_DEFAULT_THEME,
				isNew: true,
				existingNames: [],
				onSave: () => {},
				onCancel: () => {},
			},
		});
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		document.documentElement.removeAttribute('style');
	});

	it('names the back button for assistive technology, like its tooltip', () => {
		const back = target.querySelector<HTMLButtonElement>('[title="Back to themes"]');
		expect(back?.getAttribute('aria-label')).toBe('Back to themes');
	});

	/** Picks `json` as the import file, as the hidden file input does. */
	function importFile(json: string) {
		const input = target.querySelector<HTMLInputElement>('input[type="file"]');
		if (!input) throw new Error('file input not rendered');
		const file = new File([json], 'theme.json', { type: 'application/json' });
		Object.defineProperty(input, 'files', { value: [file], configurable: true });
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	function nameInput(): HTMLInputElement {
		const input = target.querySelector<HTMLInputElement>('input[type="text"]');
		if (!input) throw new Error('name input not rendered');
		return input;
	}

	/** Waits for the FileReader to fire and returns the error text shown, or null. */
	async function shownError(): Promise<string | null> {
		await new Promise((resolve) => setTimeout(resolve, 0));
		flushSync();
		return target.querySelector('.text-destructive')?.textContent ?? null;
	}

	it('shows the offending token path and leaves the draft untouched', async () => {
		importFile(JSON.stringify({ name: 'Evil', colors: { preview: { embedBg: 'url(https://example.com/x)' } } }));
		await vi.waitFor(async () => {
			expect(await shownError()).toBe('Invalid theme file: "preview.embedBg" is not a valid color or token');
		});
		expect(nameInput().value).toBe(KOKOBRAIN_DEFAULT_THEME.name);
		expect(document.documentElement.style.getPropertyValue('--lp-embed-bg')).toBe('');
	});

	it('shows the parse error for malformed JSON', async () => {
		importFile('{not json');
		await vi.waitFor(async () => {
			expect(await shownError()).toBe('Invalid theme file: could not parse');
		});
	});

	it('imports a valid partial file and applies it', async () => {
		importFile(JSON.stringify({ name: 'Imported', colors: { preview: { embedBg: '#123456' } } }));
		await vi.waitFor(() => {
			flushSync();
			expect(nameInput().value).toBe('Imported');
		});
		expect(target.querySelector('.text-destructive')).toBeNull();
		expect(document.documentElement.style.getPropertyValue('--lp-embed-bg')).toBe('#123456');
		expect(document.documentElement.style.getPropertyValue('--background')).toBe(
			KOKOBRAIN_DEFAULT_THEME.colors.ui.background,
		);
	});
});

describe('ThemeEditor - readability warnings', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountWith(theme: Theme) {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(ThemeEditor, {
			target,
			props: { theme, isNew: false, existingNames: [], onSave: () => {}, onCancel: () => {} },
		});
		flushSync();
	}

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		document.documentElement.removeAttribute('style');
	});

	/** The warning shown under the color row labelled `label`, or null. */
	function warningOf(label: string): string | null {
		const rows = [...target.querySelectorAll<HTMLElement>('[data-theme-color-row]')];
		const row = rows.find((r) => r.querySelector('span')?.textContent === label);
		if (!row) throw new Error(`no row ${label}`);
		return row.querySelector('[data-contrast-warning]')?.textContent?.trim() ?? null;
	}

	it('marks a failing token with its measured ratio, the minimum, and that the app lifts it', () => {
		const colors = {
			...KOKOBRAIN_DEFAULT_THEME.colors,
			ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, mutedForeground: '#3a3f52' },
		};
		mountWith({ name: 'Mine', colors });
		const { bgKey, ratio } = readabilityFailures(colors).get('ui.mutedForeground')!;
		const shown = (Math.floor(ratio * 100) / 100).toFixed(2);
		expect(warningOf('Muted Foreground')).toBe(
			`${shown}:1 on ${camelCaseToLabel(bgKey)}, needs 4.5:1. The app shows it lifted.`,
		);
		expect(warningOf('Foreground')).toBeNull();
	});

	it('ties the warning to its hex input, so a screen reader on the input hears it', () => {
		const colors = {
			...KOKOBRAIN_DEFAULT_THEME.colors,
			ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, mutedForeground: '#3a3f52' },
		};
		mountWith({ name: 'Mine', colors });
		const rows = [...target.querySelectorAll<HTMLElement>('[data-theme-color-row]')];
		const row = rows.find((r) => r.querySelector('span')?.textContent === 'Muted Foreground')!;
		const input = row.querySelector<HTMLInputElement>('input[type="text"]')!;
		const warning = row.querySelector<HTMLElement>('[data-contrast-warning]')!;
		expect(warning.id).not.toBe('');
		expect(input.getAttribute('aria-describedby')).toBe(warning.id);
		const passing = rows.find((r) => r.querySelector('span')?.textContent === 'Foreground')!;
		expect(passing.querySelector('input[type="text"]')!.hasAttribute('aria-describedby')).toBe(false);
	});

	it('shows no warning for a theme that passes every pair', () => {
		mountWith(KOKOBRAIN_DEFAULT_THEME);
		expect(target.querySelectorAll('[data-theme-color-row]').length).toBeGreaterThan(0);
		expect(target.querySelectorAll('[data-contrast-warning]').length).toBe(0);
	});
});
