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

import { mount, unmount, flushSync } from 'svelte';
import NoteRowMenuHarness from '../../../fixtures/NoteRowMenuHarness.svelte';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';

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
});
