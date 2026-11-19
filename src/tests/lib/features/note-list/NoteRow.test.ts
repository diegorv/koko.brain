// @vitest-environment jsdom
// The note row's Mark organized check, which the Inbox lens passes in.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';
import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
import { LAVENDER_HAZE_THEME } from '#lib/core/settings/theme.logic.js';
import { applyTheme } from '#lib/core/settings/theme.service.js';
import { rowSurfaces, themeSurface } from '#lib/core/settings/theme-surfaces.logic.js';
import { contrastRatio } from '#lib/utils/color.js';

const ALPHA = '/vault/notes/alpha.md';

const note: NoteRowNote = {
	path: ALPHA,
	title: 'Alpha',
	favorite: false,
	organized: false,
	archived: false,
	modifiedAt: 0,
	frontmatter: {},
};

describe('NoteRow organize check', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountRow(props: Record<string, unknown> = {}) {
		component = mount(NoteRowMenuHarness, { target, props: { notes: [note], ...props } });
		flushSync();
	}

	function check(): HTMLButtonElement | null {
		return target.querySelector<HTMLButtonElement>('[data-note-row-organize]');
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		vi.clearAllMocks();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	it('renders a check beside the row, outside it, out of the tab order and named, with no shortcut in its tooltip', () => {
		mountRow({ onOrganize: vi.fn() });

		const button = check()!;
		expect(button).not.toBeNull();
		expect(button.closest('[data-note-row]')).toBeNull();
		expect(button.parentElement!.querySelector(':scope > [data-note-row]')).not.toBeNull();
		expect(button.getAttribute('tabindex')).toBe('-1');
		expect(button.getAttribute('aria-label')).toBe('Mark organized');
		expect(button.getAttribute('title')).toBe('Mark organized');
	});

	it('marks the note organized on click without opening it', () => {
		const onOrganize = vi.fn();
		mountRow({ onOrganize });

		check()!.click();

		expect(onOrganize).toHaveBeenCalledTimes(1);
		expect(onOrganize).toHaveBeenCalledWith(note);
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('shows the check on the active row without a hover', () => {
		mountRow({ onOrganize: vi.fn(), activePath: ALPHA });

		expect(check()!.classList).toContain('opacity-100');
	});

	it('renders no check without onOrganize', () => {
		mountRow();

		expect(check()).toBeNull();
		expect(target.querySelectorAll('[data-note-row]')).toHaveLength(1);
	});

	it('leaves the row in the native Tab order when no tabindex is passed', () => {
		mountRow({ onOrganize: vi.fn() });

		expect(target.querySelector('[data-note-row]')!.hasAttribute('tabindex')).toBe(false);
	});
});

describe('NoteRow archived mark and pills', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountRow(props: Record<string, unknown> = {}) {
		component = mount(NoteRowMenuHarness, { target, props: { notes: [note], ...props } });
		flushSync();
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	it('marks an archived row with the attribute and the icon, without fading it', () => {
		mountRow({ archived: true });

		const row = target.querySelector<HTMLElement>('[data-note-row]')!;
		expect(row.hasAttribute('data-note-row-archived')).toBe(true);
		expect(row.querySelector('[data-note-row-archived-icon]')).not.toBeNull();
		expect(row.className).not.toMatch(/opacity-/);
	});

	it('renders an active row with no archive mark', () => {
		mountRow();

		const row = target.querySelector<HTMLElement>('[data-note-row]')!;
		expect(row.hasAttribute('data-note-row-archived')).toBe(false);
		expect(row.querySelector('[data-note-row-archived-icon]')).toBeNull();
	});

	const PILL_PROPS = {
		notes: [{ ...note, frontmatter: { status: 'draft', owner: '[[beta]]' } }],
		typeName: 'Project',
		listProperties: ['status', 'owner'],
		allPaths: ['/vault/notes/beta.md'],
	};

	it('draws the type and property pills in the text-on-tint primary on their tint', () => {
		mountRow(PILL_PROPS);

		const typePill = target.querySelector<HTMLElement>('[data-note-row-type]')!;
		expect(typePill.textContent?.trim()).toBe('Project');
		const pills = [...target.querySelectorAll<HTMLElement>('[data-note-row-pill]')];
		expect(pills.map((p) => p.textContent?.trim())).toEqual(['Project', 'draft', 'beta']);
		for (const pill of pills) {
			expect(pill.classList).toContain('bg-primary/10');
			expect(pill.classList).toContain('text-primary-tint-fg');
			expect(pill.classList).not.toContain('text-primary');
		}
	});

	it('draws the selected row title, subtitle and pills in the text-on-tint primary, pills off the row tint', () => {
		mountRow({ ...PILL_PROPS, activePath: ALPHA, subtitle: 'notes' });

		const row = target.querySelector<HTMLElement>('[data-note-row]')!;
		expect(row.classList).toContain('bg-primary/25');
		const title = row.querySelector<HTMLElement>('[data-note-row-title]')!;
		expect(title.classList).toContain('text-primary-tint-fg');
		expect(title.classList).not.toContain('text-primary');
		const sub = row.querySelector<HTMLElement>('[data-note-row-subtitle]')!;
		expect(sub.textContent).toBe('notes');
		expect(sub.classList).toContain('text-primary-tint-fg');
		expect(sub.classList).not.toContain('text-muted-foreground');
		const pills = [...row.querySelectorAll<HTMLElement>('[data-note-row-pill]')];
		expect(pills).toHaveLength(3);
		for (const pill of pills) {
			// A pill tint stacked on the row tint fails 4.5:1 even in pure foreground: the chip takes the list surface.
			expect(pill.classList).toContain('bg-list-bg');
			expect(pill.classList).not.toContain('bg-primary/10');
			expect(pill.classList).toContain('text-primary-tint-fg');
		}
	});

	it('keeps an idle row subtitle muted', () => {
		mountRow({ subtitle: 'notes' });

		const sub = target.querySelector<HTMLElement>('[data-note-row-subtitle]')!;
		expect(sub.classList).toContain('text-muted-foreground');
		expect(sub.classList).not.toContain('text-primary-tint-fg');
	});
});

describe('NoteRow rename input', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		vi.clearAllMocks();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(NoteRowMenuHarness, { target, props: { notes: [note] } });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	async function pressInRename(key: string) {
		fsStore.setRenamingPath(ALPHA);
		flushSync();
		const input = target.querySelector<HTMLInputElement>('input')!;
		input.focus();
		input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		await tick();
		flushSync();
	}

	// Enter with the title unchanged is a cancel, so no file service runs.
	it.each(['Escape', 'Enter'])('%s returns focus to the row', async (key) => {
		await pressInRename(key);

		expect(fsStore.renamingPath).toBeNull();
		expect(document.activeElement).toBe(target.querySelector('[data-note-row]'));
	});

});

describe('NoteRow colors on a light theme', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	const ICON = { name: 'rocket', pack: 'lucide' as const, svgContent: '<path d="M1 1"/>', viewBox: '0 0 24 24', keywords: [] };

	function mountRow(props: Record<string, unknown> = {}) {
		component = mount(NoteRowMenuHarness, { target, props: { notes: [note], ...props } });
		flushSync();
	}

	beforeEach(() => {
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		applyTheme(LAVENDER_HAZE_THEME);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		appliedThemeStore._reset();
		document.documentElement.removeAttribute('style');
		document.documentElement.classList.remove('dark');
	});

	it('lifts an IconPicker preset icon to 3:1 and title to 4.5:1 on the list, keeping the stored values', () => {
		const icon = { icon: ICON, color: '#eab308', titleColor: '#eab308' };
		mountRow({ icons: { [ALPHA]: icon } });
		const list = themeSurface(appliedThemeStore, 'list-bg')!;
		expect(contrastRatio('#eab308', list)!).toBeLessThan(3);
		const svg = target.querySelector<SVGElement>('[data-note-row] svg')!;
		expect(contrastRatio(svg.style.color, list)!).toBeGreaterThanOrEqual(3);
		expect(contrastRatio(target.querySelector<HTMLElement>('[data-note-row-title]')!.style.color, list)!).toBeGreaterThanOrEqual(4.5);
		expect(icon).toMatchObject({ color: '#eab308', titleColor: '#eab308' });
	});

	it('keeps a type palette icon at 3:1 on the active row and drops the title color there', () => {
		mountRow({ icons: { [ALPHA]: { icon: ICON, color: 'yellow', titleColor: '#eab308' } }, activePath: ALPHA });
		const active = rowSurfaces(appliedThemeStore, 'list-bg', 'primary')[2]!;
		const svg = target.querySelector<SVGElement>('[data-note-row] svg')!;
		expect(contrastRatio(svg.style.color, active)!).toBeGreaterThanOrEqual(3);
		expect(target.querySelector<HTMLElement>('[data-note-row-title]')!.style.color).toBe('');
	});
});
