import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Only the Tauri boundary and the toast are mocked. The editor service, the
// frontmatter writer, the stores and the .logic.ts modules are real, so each
// assertion reads the tab and the in-memory disk back.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { addAfterSaveObserver, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { propertiesStore } from '#lib/features/properties/properties.store.svelte.js';
import { _resetParseFrontmatterCache } from '#lib/core/frontmatter/properties.logic.js';
import {
	toggleActiveNoteArchived,
	toggleActiveNoteFavorite,
	toggleActiveNoteOrganized,
} from '#lib/features/properties/lifecycle.service.js';

const VAULT = '/vault';
const A = `${VAULT}/a.md`;
const B = `${VAULT}/b.md`;

/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. */
const disk = new Map<string, string>();

function localStorageStub() {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => { store[key] = value; },
		removeItem: (key: string) => { delete store[key]; },
		clear: () => { store = {}; },
	};
}

/** Puts `content` on disk and opens it in a clean tab, which becomes active. */
function openNote(path: string, content: string, fileType?: 'canvas'): void {
	disk.set(path, content);
	editorStore.addTab({ path, name: path.split('/').pop() ?? path, content, savedContent: content, fileType });
}

function tabContent(path: string): string | undefined {
	return editorStore.tabs.find((t) => t.path === path)?.content;
}

function activate(path: string): void {
	editorStore.setActiveIndex(editorStore.tabs.findIndex((t) => t.path === path));
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('localStorage', localStorageStub());
	disk.clear();
	editorStore.reset();
	propertiesStore.reset();
	vaultStore._reset();
	vaultStore.open(VAULT);
	resetHooks();
	clearAllIndexed();
	_resetParseFrontmatterCache();
	vi.mocked(invoke).mockResolvedValue(undefined);
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const path = String(p);
		if (!disk.has(path)) throw new Error(`No such file: ${path}`);
		return disk.get(path)!;
	});
	vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
		disk.set(String(p), String(data));
	});
	vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
});

afterEach(() => {
	resetEditor();
	editorStore.reset();
	vaultStore._reset();
	resetHooks();
	vi.unstubAllGlobals();
});

describe('prompt sidebar refresh', () => {
	it.each([
		['Favorite', toggleActiveNoteFavorite],
		['Organized', toggleActiveNoteOrganized],
		['Archive', toggleActiveNoteArchived],
	])('%s asks for the index refresh to skip its throttle', async (_label, action) => {
		openNote(A, '---\ntitle: A\n---\nBody\n');

		await action();

		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('asks for nothing without an active markdown note', async () => {
		await toggleActiveNoteFavorite();

		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});
});

describe('toggleActiveNoteFavorite', () => {
	it('adds _favorite: true to the active note, in the tab and on disk', async () => {
		openNote(A, '---\ntitle: A\n---\nBody\n');

		await toggleActiveNoteFavorite();

		const expected = '---\ntitle: A\n_favorite: true\n---\nBody\n';
		expect(tabContent(A)).toBe(expected);
		expect(disk.get(A)).toBe(expected);
	});

	it('turns an existing favorite off', async () => {
		openNote(A, '---\n_favorite: true\n---\nBody\n');

		await toggleActiveNoteFavorite();

		expect(disk.get(A)).toBe('---\n_favorite: false\n---\nBody\n');
	});

	it('creates the frontmatter block on a note without one', async () => {
		openNote(A, 'Just a body\n');

		await toggleActiveNoteFavorite();

		expect(disk.get(A)).toBe('---\n_favorite: true\n---\nJust a body\n');
	});

	it('favorites the new active note right after a tab switch, with the Properties panel never filled', async () => {
		openNote(A, '---\ntitle: A\n---\nA body\n');
		openNote(B, '---\ntitle: B\n---\nB body\n');
		activate(A);
		activate(B);
		// The right sidebar is hidden: nothing ever parsed a note into the panel's store.
		expect(propertiesStore.sourcePath).toBeNull();

		await toggleActiveNoteFavorite();

		expect(disk.get(B)).toBe('---\ntitle: B\n_favorite: true\n---\nB body\n');
		expect(tabContent(A)).toBe('---\ntitle: A\n---\nA body\n');
		expect(disk.get(A)).toBe('---\ntitle: A\n---\nA body\n');
	});

	it('ignores the Properties panel store when it holds another note', async () => {
		openNote(A, '---\ntitle: A\n---\nA body\n');
		openNote(B, '---\ntitle: B\n---\nB body\n');
		propertiesStore.setProperties([{ key: 'title', value: 'A', type: 'text' }], A);
		activate(B);

		await toggleActiveNoteFavorite();

		expect(disk.get(B)).toBe('---\ntitle: B\n_favorite: true\n---\nB body\n');
	});

	it('does nothing when no tab is open', async () => {
		await toggleActiveNoteFavorite();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('does nothing on a tab that is not a markdown note', async () => {
		const canvas = '{"nodes":[],"edges":[]}';
		openNote(`${VAULT}/board.canvas`, canvas, 'canvas');

		await toggleActiveNoteFavorite();

		expect(tabContent(`${VAULT}/board.canvas`)).toBe(canvas);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('shows the frontmatter error toast and writes nothing when the frontmatter cannot be rewritten', async () => {
		const lossy = '---\ntitle: A # a comment\n---\nBody\n';
		openNote(A, lossy);

		await toggleActiveNoteFavorite();

		expect(toast.error).toHaveBeenCalledWith(
			"a.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
		expect(tabContent(A)).toBe(lossy);
		expect(disk.get(A)).toBe(lossy);
	});
});

describe('toggleActiveNoteOrganized', () => {
	it('sets _organized: false and keeps an archived note archived', async () => {
		openNote(A, '---\n_archived: true\n---\nBody\n');

		await toggleActiveNoteOrganized();

		// A missing _organized reads as organized, as in the Rust index, so the toggle turns it off.
		expect(disk.get(A)).toBe('---\n_archived: true\n_organized: false\n---\nBody\n');
	});

	it('sets _organized: false on an organized note', async () => {
		openNote(A, '---\n_organized: true\n---\nBody\n');

		await toggleActiveNoteOrganized();

		expect(disk.get(A)).toBe('---\n_organized: false\n---\nBody\n');
	});

	it('keeps a frontmatter edit typed in the editor just before the toggle', async () => {
		openNote(A, '---\nstatus: todo\n---\nBody\n');
		// The Properties panel parsed the note before the edit and still holds the stale value.
		propertiesStore.setProperties([{ key: 'status', value: 'todo', type: 'text' }], A);
		// A keystroke in the editor: the tab holds it, the debounced save has not run.
		onContentChange('---\nstatus: doing\n---\nBody\n', true);

		await toggleActiveNoteOrganized();

		// A missing _organized reads as organized, as in the Rust index, so the toggle turns it off.
		const expected = '---\nstatus: doing\n_organized: false\n---\nBody\n';
		expect(tabContent(A)).toBe(expected);
		expect(disk.get(A)).toBe(expected);
	});

	it('shows the frontmatter error toast when the frontmatter is unparseable', async () => {
		const broken = '---\ntitle: [unclosed\n---\nBody\n';
		openNote(A, broken);

		await toggleActiveNoteOrganized();

		expect(toast.error).toHaveBeenCalledWith(
			"a.md: The note's frontmatter could not be parsed; fix it in the note",
		);
		expect(disk.get(A)).toBe(broken);
	});
});

describe('toggleActiveNoteArchived', () => {
	it('archives the note, keeping _organized, and runs the after-save hooks that auto-organize uses', async () => {
		const saved: string[] = [];
		addAfterSaveObserver((path, content) => saved.push(`${path}\n${content}`));
		openNote(A, '---\n_organized: true\n---\nBody\n');

		await toggleActiveNoteArchived();

		const expected = '---\n_organized: true\n_archived: true\n---\nBody\n';
		expect(disk.get(A)).toBe(expected);
		expect(saved).toEqual([`${A}\n${expected}`]);
	});

	it('restores an archived note', async () => {
		openNote(A, '---\n_archived: true\n---\nBody\n');

		await toggleActiveNoteArchived();

		expect(disk.get(A)).toBe('---\n_archived: false\n---\nBody\n');
	});

	it('does nothing when no tab is open', async () => {
		await toggleActiveNoteArchived();

		expect(writeTextFile).not.toHaveBeenCalled();
	});
});
