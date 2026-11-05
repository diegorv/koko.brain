// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: mockFetch }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from 'svelte-sonner';
import AppearanceSection from '#lib/core/settings/sections/AppearanceSection.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { DEFAULT_THEME_NAME, KOKOBRAIN_DEFAULT_THEME, normalizeAppearance } from '#lib/core/settings/theme.logic.js';
import { coreFromColors } from '#lib/core/settings/theme-builder.logic.js';
import { buildThemeFromPackage, installThemePackage, type ThemePackage } from '#lib/core/settings/theme-package.logic.js';

const ocean: ThemePackage = {
	schemaVersion: 1,
	id: 'ocean-breeze',
	name: 'Ocean Breeze',
	version: '1.2.0',
	author: 'someone',
	palette: { ...coreFromColors(KOKOBRAIN_DEFAULT_THEME.colors), primary: '#1188cc' },
};
const sepia: ThemePackage = { ...ocean, id: 'sepia', name: 'Sepia', version: '1.0.0' };
const future = { schemaVersion: 2, id: 'future', name: 'Future Theme', version: '3.0.0', author: 'someone' };
const broken = { ...ocean, id: 'broken', name: 'Broken Theme', palette: { ...ocean.palette, fg: 'url(https://x.test/a)' } };

function respondWith(themes: unknown[]) {
	mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ schemaVersion: 1, themes })) });
}

describe('AppearanceSection - theme catalog', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		settingsStore.updateAppearance(normalizeAppearance({}));
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		document.documentElement.removeAttribute('style');
	});

	function render() {
		component = mount(AppearanceSection, { target });
		flushSync();
	}

	function catalog(): HTMLElement {
		const el = target.querySelector<HTMLElement>('[data-testid="theme-catalog"]');
		if (!el) throw new Error('catalog not rendered');
		return el;
	}

	function catalogRow(name: string): HTMLElement | undefined {
		return [...catalog().querySelectorAll<HTMLElement>('[data-testid="catalog-entry"]')].find((row) =>
			row.textContent?.includes(name),
		);
	}

	/** The theme list row (above the catalog) for `name`. */
	function themeRow(name: string): HTMLElement | undefined {
		return [...target.querySelectorAll<HTMLElement>('[role="button"]')].find(
			(row) => row.querySelector('.font-medium')?.textContent === name,
		);
	}

	async function catalogLoaded() {
		await vi.waitFor(() => {
			flushSync();
			expect(catalog().textContent).not.toContain('Loading the theme catalog');
		});
	}

	it('shows each entry with its name, author, version and state; skips an invalid one', async () => {
		respondWith([ocean, sepia, future, broken]);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		render();
		await catalogLoaded();

		const oceanRow = catalogRow('Ocean Breeze')!;
		expect(oceanRow.textContent).toContain('by someone');
		expect(oceanRow.textContent).toContain('v1.2.0');
		expect(oceanRow.querySelector('button')?.textContent?.trim()).toBe('Install');
		// An ex-built-in is an ordinary catalog entry.
		expect(catalogRow('Sepia')!.querySelector('button')?.textContent?.trim()).toBe('Install');
		expect(catalog().textContent).not.toContain('Built-in');
		expect(catalogRow('Future Theme')!.textContent).toContain('Requires a newer KokoBrain');
		expect(catalogRow('Future Theme')!.querySelector('button')).toBeNull();
		expect(catalogRow('Broken Theme')).toBeUndefined();
	});

	it('skips an entry that repeats an id and still renders the rest', async () => {
		respondWith([ocean, { ...ocean, name: 'Ocean Copy' }, { ...future, id: 'ocean-breeze' }, future]);
		render();
		await catalogLoaded();

		expect(catalog().querySelectorAll('[data-testid="catalog-entry"]')).toHaveLength(2);
		expect(catalogRow('Ocean Breeze')!.querySelector('button')?.textContent?.trim()).toBe('Install');
		expect(catalogRow('Ocean Copy')).toBeUndefined();
		expect(catalogRow('Future Theme')!.textContent).toContain('Requires a newer KokoBrain');
	});

	it('lists the built-ins first, then the other themes by name; the catalog by name', async () => {
		const zest: ThemePackage = { ...ocean, id: 'a-renamed', name: 'Zest' };
		respondWith([zest, sepia, ocean]);
		for (const pkg of [sepia, ocean]) {
			const result = installThemePackage(settingsStore.appearance, pkg);
			if (!result.ok) throw new Error(result.error);
			settingsStore.updateAppearance(result.appearance);
		}
		settingsStore.updateAppearance({
			themes: [...settingsStore.appearance.themes, { name: 'aurora', colors: KOKOBRAIN_DEFAULT_THEME.colors }],
		});
		render();
		await catalogLoaded();

		const listed = [...target.querySelectorAll<HTMLElement>('[role="button"]')]
			.map((row) => row.querySelector('.font-medium')?.textContent)
			.filter(Boolean);
		expect(listed).toEqual([DEFAULT_THEME_NAME, 'Lavender Haze', 'aurora', 'Ocean Breeze', 'Sepia']);
		const catalogNames = [...catalog().querySelectorAll<HTMLElement>('[data-testid="catalog-entry"]')].map(
			(row) => row.querySelector('.font-medium')?.textContent,
		);
		expect(catalogNames).toEqual(['Ocean Breeze', 'Sepia', 'Zest']);
	});

	it('installs a theme: it joins the theme list as non-editable and the entry shows Installed', async () => {
		respondWith([ocean]);
		render();
		await catalogLoaded();

		catalogRow('Ocean Breeze')!.querySelector('button')!.click();
		flushSync();

		expect(settingsStore.appearance.installed).toEqual([ocean]);
		expect(catalogRow('Ocean Breeze')!.textContent).toContain('Installed');
		expect(catalogRow('Ocean Breeze')!.querySelector('button')).toBeNull();
		expect(toast.success).toHaveBeenCalledWith('Installed "Ocean Breeze"');
		const row = themeRow('Ocean Breeze')!;
		expect(row).toBeDefined();
		expect(row.querySelector('[title="Edit theme"]')).toBeNull();
		expect(row.querySelector('[title="Duplicate theme"]')).not.toBeNull();
		expect(row.querySelector('[title="Uninstall theme"]')).not.toBeNull();
	});

	it('activates an installed theme and falls back to the default when it is uninstalled', async () => {
		respondWith([ocean]);
		render();
		await catalogLoaded();
		catalogRow('Ocean Breeze')!.querySelector('button')!.click();
		flushSync();

		themeRow('Ocean Breeze')!.click();
		flushSync();
		expect(settingsStore.appearance.activeTheme).toBe('Ocean Breeze');
		expect(document.documentElement.style.getPropertyValue('--primary')).toBe(buildThemeFromPackage(ocean).colors.ui.primary);

		themeRow('Ocean Breeze')!.querySelector<HTMLElement>('[title="Uninstall theme"]')!.click();
		flushSync();

		expect(settingsStore.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
		expect(settingsStore.appearance.installed).toEqual([]);
		expect(themeRow('Ocean Breeze')).toBeUndefined();
		expect(catalogRow('Ocean Breeze')!.querySelector('button')?.textContent?.trim()).toBe('Install');
	});

	it('refuses to install over a theme with the same name, with a message', async () => {
		settingsStore.updateAppearance({
			themes: [...settingsStore.appearance.themes, { name: 'Ocean Breeze', colors: KOKOBRAIN_DEFAULT_THEME.colors }],
		});
		respondWith([ocean]);
		render();
		await catalogLoaded();

		catalogRow('Ocean Breeze')!.querySelector('button')!.click();
		flushSync();

		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('A theme named "Ocean Breeze" already exists'));
		expect(settingsStore.appearance.installed ?? []).toEqual([]);
		expect(settingsStore.appearance.themes.filter((t) => t.name === 'Ocean Breeze')).toHaveLength(1);
	});

	/** Puts `pkg` in the store as an installed theme, optionally active. */
	function preinstall(pkg: ThemePackage, active = false) {
		const result = installThemePackage(settingsStore.appearance, pkg);
		if (!result.ok) throw new Error(result.error);
		settingsStore.updateAppearance(result.appearance);
		if (active) settingsStore.updateAppearance({ activeTheme: pkg.name });
	}

	const oceanNext: ThemePackage = {
		...ocean,
		version: '1.2.10',
		palette: { ...ocean.palette, primary: '#cc3311' },
	};

	it('offers "Update to x.y.z" for a newer version and applies it to the active theme on click', async () => {
		preinstall({ ...ocean, version: '1.2.9' }, true);
		respondWith([oceanNext]);
		render();
		await catalogLoaded();

		const button = catalogRow('Ocean Breeze')!.querySelector('button')!;
		expect(button.textContent?.trim()).toBe('Update to 1.2.10');
		expect(settingsStore.appearance.installed).toEqual([{ ...ocean, version: '1.2.9' }]);

		button.click();
		flushSync();

		expect(settingsStore.appearance.installed).toEqual([oceanNext]);
		expect(settingsStore.appearance.activeTheme).toBe('Ocean Breeze');
		expect(document.documentElement.style.getPropertyValue('--primary')).toBe(buildThemeFromPackage(oceanNext).colors.ui.primary);
		expect(catalogRow('Ocean Breeze')!.textContent).not.toContain('Update to');
		expect(catalogRow('Ocean Breeze')!.textContent).toContain('Installed');
		expect(catalogRow('Ocean Breeze')!.querySelector('button')).toBeNull();
		expect(toast.success).toHaveBeenCalledWith('Updated "Ocean Breeze" to 1.2.10');
	});

	it('updates an inactive installed theme without changing the active theme or its colors', async () => {
		preinstall({ ...ocean, version: '1.2.9' });
		respondWith([oceanNext]);
		render();
		await catalogLoaded();

		catalogRow('Ocean Breeze')!.querySelector('button')!.click();
		flushSync();

		expect(settingsStore.appearance.installed).toEqual([oceanNext]);
		expect(settingsStore.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
		expect(document.documentElement.style.getPropertyValue('--primary')).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.primary);
		expect(catalogRow('Ocean Breeze')!.textContent).toContain('Installed');
	});

	it('shows Installed, not an update, for an equal or older catalog version', async () => {
		preinstall({ ...ocean, version: '1.3.0' });
		respondWith([ocean]);
		render();
		await catalogLoaded();

		expect(catalogRow('Ocean Breeze')!.textContent).toContain('Installed');
		expect(catalogRow('Ocean Breeze')!.querySelector('button')).toBeNull();
	});

	it('shows "Requires a newer KokoBrain" for a newer version with an unknown schemaVersion', async () => {
		preinstall(ocean);
		respondWith([{ ...future, id: 'ocean-breeze', name: 'Ocean Breeze', version: '2.0.0' }]);
		render();
		await catalogLoaded();

		expect(catalogRow('Ocean Breeze')!.textContent).toContain('Requires a newer KokoBrain');
		expect(catalogRow('Ocean Breeze')!.querySelector('button')).toBeNull();
	});

	it('updates a renamed version: the theme list and the active theme take the new name', async () => {
		preinstall(ocean, true);
		respondWith([{ ...oceanNext, name: 'Ocean Breeze Pro' }]);
		render();
		await catalogLoaded();

		catalogRow('Ocean Breeze Pro')!.querySelector('button')!.click();
		flushSync();

		expect(settingsStore.appearance.activeTheme).toBe('Ocean Breeze Pro');
		expect(themeRow('Ocean Breeze')).toBeUndefined();
		expect(themeRow('Ocean Breeze Pro')).toBeDefined();
	});

	it('refuses an update whose new name is taken by another theme, and keeps the installed version', async () => {
		preinstall(ocean);
		settingsStore.updateAppearance({
			themes: [...settingsStore.appearance.themes, { name: 'Mine', colors: KOKOBRAIN_DEFAULT_THEME.colors }],
		});
		respondWith([{ ...oceanNext, name: 'Mine' }]);
		render();
		await catalogLoaded();

		const row = [...catalog().querySelectorAll<HTMLElement>('[data-testid="catalog-entry"]')][0];
		row.querySelector('button')!.click();
		flushSync();

		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('"Mine"'));
		expect(settingsStore.appearance.installed).toEqual([ocean]);
		expect(themeRow('Ocean Breeze')).toBeDefined();
	});

	it('shows no update state when the catalog cannot be loaded, and the installed theme keeps working', async () => {
		preinstall(ocean, true);
		mockFetch.mockRejectedValue(new Error('error sending request'));
		render();
		await catalogLoaded();

		expect(target.textContent).not.toContain('Update to');
		expect(themeRow('Ocean Breeze')).toBeDefined();
		expect(settingsStore.appearance.installed).toEqual([ocean]);
	});

	it('shows an error state and a toast when the catalog cannot be loaded, and keeps the theme list', async () => {
		mockFetch.mockRejectedValue(new Error('error sending request'));
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		render();
		await catalogLoaded();

		// An offline open is expected: the toast tells the user, error() would also report it to Sentry.
		expect(errorSpy).not.toHaveBeenCalled();

		expect(catalog().querySelector('[data-testid="theme-catalog-error"]')?.textContent).toContain(
			'Could not load the theme catalog',
		);
		expect(toast.error).toHaveBeenCalledWith('Could not load the theme catalog: error sending request');
		expect(themeRow(DEFAULT_THEME_NAME)).toBeDefined();
	});

	it('shows the error state for an index that is not JSON', async () => {
		mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('<html></html>') });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		render();
		await catalogLoaded();

		expect(catalog().querySelector('[data-testid="theme-catalog-error"]')).not.toBeNull();
		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('not valid JSON'));
	});

	it('keeps the section title while the theme editor is open', async () => {
		respondWith([]);
		render();
		await catalogLoaded();
		const title = () => target.querySelector('h2');
		expect(title()?.textContent).toBe('Appearance');
		expect(target.querySelector('p')?.classList).toContain('text-sm');

		[...target.querySelectorAll<HTMLButtonElement>('button')].find((el) => el.textContent?.includes('Create New Theme'))!.click();
		flushSync();

		expect(target.querySelector('input[placeholder="Theme name"]')).not.toBeNull();
		expect(title()?.textContent).toBe('Appearance');
		expect(title()?.classList).toContain('text-lg');
		expect(title()?.classList).toContain('font-semibold');
	});
});

describe('AppearanceSection - theme row actions', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	const MINE = 'My theme';

	beforeEach(async () => {
		vi.clearAllMocks();
		settingsStore.reset();
		settingsStore.updateAppearance(normalizeAppearance({}));
		const installed = installThemePackage(settingsStore.appearance, ocean);
		if (!installed.ok) throw new Error(installed.error);
		settingsStore.updateAppearance({
			...installed.appearance,
			themes: [...installed.appearance.themes, { name: MINE, colors: structuredClone(KOKOBRAIN_DEFAULT_THEME.colors) }],
			activeTheme: DEFAULT_THEME_NAME,
		});
		respondWith([]);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(AppearanceSection, { target });
		flushSync();
		await vi.waitFor(() => {
			flushSync();
			expect(target.textContent).not.toContain('Loading the theme catalog');
		});
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		document.documentElement.removeAttribute('style');
	});

	function row(name: string): HTMLElement {
		const found = [...target.querySelectorAll<HTMLElement>('[role="button"]')].find(
			(el) => el.querySelector('.font-medium')?.textContent === name,
		);
		if (!found) throw new Error(`no theme row "${name}"`);
		return found;
	}

	function action(name: string, title: string): HTMLButtonElement {
		const found = row(name).querySelector<HTMLButtonElement>(`button[title="${title}"]`);
		if (!found) throw new Error(`no "${title}" on "${name}"`);
		return found;
	}

	const ACTIONS: [string, string][] = [
		[MINE, 'Edit theme'],
		[MINE, 'Duplicate theme'],
		[MINE, 'Delete theme'],
		[ocean.name, 'Uninstall theme'],
	];

	it.each(ACTIONS)('%s > %s has an aria-label equal to its title', (name, title) => {
		expect(action(name, title).getAttribute('aria-label')).toBe(title);
	});

	it.each(ACTIONS)('%s > %s uses the small icon button size', (name, title) => {
		const classes = action(name, title).classList;
		expect(classes).toContain('size-8');
		expect(classes).not.toContain('size-7');
	});

	it('reveals the Edit and Duplicate actions when the row has keyboard focus', () => {
		expect(action(MINE, 'Edit theme').parentElement?.classList).toContain('group-focus-within:opacity-100');
		expect(action(MINE, 'Duplicate theme').parentElement?.classList).toContain('group-focus-within:opacity-100');
	});

	it('does not select the theme when Duplicate is clicked on its row', () => {
		action(MINE, 'Duplicate theme').click();
		flushSync();

		expect(settingsStore.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
		expect(target.querySelector('input[placeholder="Theme name"]')).not.toBeNull();
	});

	it('does not select the theme when Delete is clicked on its row, and removes it', () => {
		action(MINE, 'Delete theme').click();
		flushSync();

		expect(settingsStore.appearance.activeTheme).toBe(DEFAULT_THEME_NAME);
		expect(settingsStore.appearance.themes.map((t) => t.name)).not.toContain(MINE);
	});

	it('still selects the theme when the row itself is clicked', () => {
		row(MINE).click();
		flushSync();

		expect(settingsStore.appearance.activeTheme).toBe(MINE);
	});
});
