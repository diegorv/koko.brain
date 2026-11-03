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
import { buildThemeFromPackage, type ThemePackage } from '#lib/core/settings/theme-package.logic.js';

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
		expect(catalogRow('Sepia')!.textContent).toContain('Built-in');
		expect(catalogRow('Sepia')!.querySelector('button')).toBeNull();
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
});
