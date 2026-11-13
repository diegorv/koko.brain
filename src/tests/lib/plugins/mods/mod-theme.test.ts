// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Real stores and the real host; only the Tauri file system, the toast and debug() are mocked.
const fsFiles = vi.hoisted(() => new Map<string, string>());

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...fsFiles.keys()].some((k) => k === path || k.startsWith(`${path}/`))),
	readDir: vi.fn(async () =>
		[...new Set([...fsFiles.keys()].map((k) => k.split('/_system/mods/')[1]?.split('/')[0]).filter(Boolean))].map((name) => ({
			name,
			isDirectory: true,
			isFile: false,
			isSymlink: false,
		})),
	),
	readTextFile: vi.fn(async (path: string) => {
		const text = fsFiles.get(path);
		if (text === undefined) throw new Error(`No such file: ${path}`);
		return text;
	}),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));

import { flushSync } from 'svelte';
import { toast } from 'svelte-sonner';

import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
import { LAVENDER_HAZE_THEME, themeColorsToCssVars } from '#lib/core/settings/theme.logic.js';
import { applyTheme } from '#lib/core/settings/theme.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import type { ModThemeStateV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { modDialogsStore } from '#lib/plugins/mods/mod-dialogs.store.svelte.js';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { MOD_THEME_TOKENS } from '#lib/plugins/mods/mod-theme.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';

const VAULT = '/vaults/main';
const globals = globalThis as unknown as { __modCtx: Record<string, ModContext> };

/** The contract, pinned: renaming or dropping a token is a breaking change for mods */
const CONTRACT_TOKENS = [
	['background', '--background'],
	['foreground', '--foreground'],
	['card', '--card'],
	['cardForeground', '--card-foreground'],
	['popover', '--popover'],
	['popoverForeground', '--popover-foreground'],
	['primary', '--primary'],
	['primaryForeground', '--primary-foreground'],
	['secondary', '--secondary'],
	['secondaryForeground', '--secondary-foreground'],
	['muted', '--muted'],
	['mutedForeground', '--muted-foreground'],
	['accent', '--accent'],
	['accentForeground', '--accent-foreground'],
	['destructive', '--destructive'],
	['destructiveForeground', '--destructive-foreground'],
	['border', '--border'],
	['input', '--input'],
	['ring', '--ring'],
	['divider', '--divider'],
];

/** The declarations of the first `<selector> {` block of `app.css` */
function cssBlock(css: string, selector: string): string {
	const start = css.indexOf(`\n${selector} {`);
	expect(start, `${selector} block in app.css`).toBeGreaterThanOrEqual(0);
	return css.slice(start, css.indexOf('\n}', start));
}

function writeMod(id: string): void {
	const base = `${VAULT}/_system/mods/${id}`;
	fsFiles.set(`${base}/manifest.json`, JSON.stringify({ id, name: `Mod ${id}`, version: '1.0.0' }));
	fsFiles.set(`${base}/main.js`, `export default { onload(ctx) { globalThis.__modCtx['${id}'] = ctx; } };`);
}

describe('ctx.theme', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		fsFiles.clear();
		localStorage.clear();
		document.documentElement.style.cssText = '';
		appliedThemeStore._reset();
		vaultStore._reset();
		modsEnabledStore._reset();
		modsStore.reset();
		railRegistryStore.reset();
		modPickerStore.reset();
		modsRunsStore.reset();
		modDialogsStore.reset();
		globals.__modCtx = {};
		vaultStore.open(VAULT);
		modsEnabledStore.setEnabled(true);
		writeMod('alpha');
		writeMod('beta');
		await startModsHost(VAULT);
	});

	afterEach(() => {
		stopModsHost();
	});

	it('the color contract is the pinned token list', () => {
		expect(Object.entries(MOD_THEME_TOKENS)).toEqual(CONTRACT_TOKENS);
	});

	it('every contract CSS variable is defined in app.css, for light and for dark', () => {
		const css = readFileSync('src/app.css', 'utf8');
		for (const selector of [':root', '.dark']) {
			const block = cssBlock(css, selector);
			for (const [, cssVar] of CONTRACT_TOKENS) expect(block, `${cssVar} in ${selector}`).toMatch(new RegExp(`\\n\\s*${cssVar}:`));
		}
	});

	it('current returns every contract token with the value set on the document and the mode', () => {
		const expected: Record<string, string> = {};
		CONTRACT_TOKENS.forEach(([key, cssVar], i) => {
			expected[key] = `#0000${i.toString(16).padStart(2, '0')}`;
			document.documentElement.style.setProperty(cssVar, expected[key]);
		});
		appliedThemeStore.setDark(false);

		expect(globals.__modCtx.alpha.theme.current).toEqual({ mode: 'light', colors: expected });
	});

	it('current reports dark while the applied theme is dark', () => {
		appliedThemeStore.setDark(true);
		expect(globals.__modCtx.alpha.theme.current.mode).toBe('dark');
	});

	it('onChange fires after a theme change with the new mode and colors, not at subscription', () => {
		const seen: ModThemeStateV1[] = [];
		globals.__modCtx.alpha.theme.onChange((theme) => seen.push(theme));
		flushSync();
		expect(seen).toEqual([]);

		applyTheme(LAVENDER_HAZE_THEME);
		flushSync();

		const vars = themeColorsToCssVars(LAVENDER_HAZE_THEME.colors);
		expect(seen).toHaveLength(1);
		expect(seen[0].mode).toBe('light');
		expect(seen[0].colors.popover).toBe(vars['--popover']);
		expect(seen[0].colors.primary).toBe(vars['--primary']);
	});

	it('onChange reports a theme change made after subscribing but before the next flush', () => {
		const seen: string[] = [];
		globals.__modCtx.alpha.theme.onChange((theme) => seen.push(theme.mode));

		appliedThemeStore.setDark(!appliedThemeStore.isDark);
		const mode = appliedThemeStore.isDark ? 'dark' : 'light';
		flushSync();

		expect(seen).toEqual([mode]);
	});

	it('its disposer stops it', () => {
		const seen: string[] = [];
		const dispose = globals.__modCtx.alpha.theme.onChange((theme) => seen.push(theme.mode));
		flushSync();

		dispose();
		applyTheme(LAVENDER_HAZE_THEME);
		flushSync();

		expect(seen).toEqual([]);
	});

	it("unloading the mod stops it, and the other mod's keeps firing", () => {
		const seen: string[] = [];
		globals.__modCtx.alpha.theme.onChange(() => seen.push('alpha'));
		globals.__modCtx.beta.theme.onChange(() => seen.push('beta'));
		flushSync();

		disableMod('alpha');
		appliedThemeStore.bumpRevision();
		flushSync();

		expect(seen).toEqual(['beta']);
	});

	it("a throwing callback goes to the mod's debug log and does not stop another mod's", () => {
		const seen: string[] = [];
		globals.__modCtx.alpha.theme.onChange(() => {
			throw new Error('bad repaint');
		});
		globals.__modCtx.beta.theme.onChange(() => seen.push('beta'));
		flushSync();

		appliedThemeStore.bumpRevision();
		flushSync();
		appliedThemeStore.bumpRevision();
		flushSync();

		expect(seen).toEqual(['beta', 'beta']);
		expect(debug).toHaveBeenCalledWith('MOD:alpha', 'theme.onChange callback failed:', expect.stringContaining('bad repaint'));
	});

	it('records a sync throw and an async rejection under theme.onChange, and another mod still runs', async () => {
		const seen: string[] = [];
		globals.__modCtx.alpha.theme.onChange(() => {
			throw new Error('sync repaint');
		});
		globals.__modCtx.beta.theme.onChange(async () => {
			seen.push('beta');
			throw new Error('async repaint');
		});
		flushSync();

		appliedThemeStore.bumpRevision();
		flushSync();

		expect(modsStore.callbackErrorFor('alpha')).toMatchObject({ callback: 'theme.onChange', message: 'sync repaint' });
		await vi.waitFor(() => expect(modsStore.callbackErrorFor('beta')).toMatchObject({ callback: 'theme.onChange', message: 'async repaint' }));
		expect(seen).toEqual(['beta']);
		expect(debug).toHaveBeenCalledWith('MOD:beta', 'theme.onChange callback failed:', expect.stringContaining('async repaint'));
		expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Mod alpha: theme\.onChange callback failed: sync repaint/));
		expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Mod beta: theme\.onChange callback failed: async repaint/));
		expect(error).not.toHaveBeenCalled();
	});

	it('onChange needs a function', () => {
		expect(() => globals.__modCtx.alpha.theme.onChange(42 as never)).toThrow('Mod "alpha": theme.onChange needs a callback function');
	});

	it('current and onChange throw after the host stops', () => {
		const { alpha } = globals.__modCtx;
		stopModsHost();

		expect(() => alpha.theme.current).toThrow('Mod "alpha" is unloaded');
		expect(() => alpha.theme.onChange(() => {})).toThrow('Mod "alpha" is unloaded');
	});
});
