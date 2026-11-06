// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import ThemePreview from '#lib/core/settings/sections/ThemePreview.svelte';
import { KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME } from '#lib/core/settings/theme.logic.js';
import type { ThemeColors } from '#lib/core/settings/theme.types.js';

describe('ThemePreview', () => {
	let target: HTMLElement;
	let component: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
	});

	function mountPreview(colors: ThemeColors): HTMLElement {
		component = mount(ThemePreview, { target, props: { colors } });
		flushSync();
		return target.querySelector<HTMLElement>('[data-theme-preview]')!;
	}

	it('draws the rail and the list in order, like the Inbox, each with its column tone', () => {
		mountPreview(LAVENDER_HAZE_THEME.colors);
		const columns = [...target.querySelectorAll<HTMLElement>('[data-theme-preview-column]')];
		expect(columns.map((c) => c.dataset.themePreviewColumn)).toEqual(['rail', 'list']);
		expect(columns[0].classList).toContain('bg-rail-bg');
		expect(columns[1].classList).toContain('bg-list-bg');
	});

	it('scopes the previewed theme, not the active one, for the tones to derive from', () => {
		const root = mountPreview(LAVENDER_HAZE_THEME.colors);
		const { ui } = LAVENDER_HAZE_THEME.colors;
		expect(root.classList).toContain('column-tones');
		expect(root.style.getPropertyValue('--file-explorer-bg')).toBe(ui.fileExplorerBg);
		expect(root.style.getPropertyValue('--file-explorer-fg')).toBe(ui.fileExplorerFg);
		expect(root.style.getPropertyValue('--file-explorer-muted-fg')).toBe(ui.fileExplorerMutedFg);
		expect(root.style.getPropertyValue('--editor-bg')).toBe(ui.editorBg);
	});

	it('paints the editor with the editor background', () => {
		mountPreview(LAVENDER_HAZE_THEME.colors);
		const editor = target.querySelector<HTMLElement>('[data-theme-preview-editor]')!;
		const probe = document.createElement('div');
		probe.style.backgroundColor = LAVENDER_HAZE_THEME.colors.ui.editorBg;
		expect(editor.style.backgroundColor).toBe(probe.style.backgroundColor);
	});

	it('uses the light rules for a light editor', () => {
		const root = mountPreview(LAVENDER_HAZE_THEME.colors);
		expect(root.classList).not.toContain('column-tones-dark');
	});

	it('uses the dark rules for a dark editor', () => {
		const root = mountPreview(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(root.classList).toContain('column-tones-dark');
	});

	it('counts an editor color it cannot read as dark, like the applied theme', () => {
		const { colors } = LAVENDER_HAZE_THEME;
		const root = mountPreview({ ...colors, ui: { ...colors.ui, editorBg: 'not-a-color' } });
		expect(root.classList).toContain('column-tones-dark');
	});
});
