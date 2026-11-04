// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'stable';
(globalThis as Record<string, unknown>).__BUILD_INFO__ = '9.9.9 (test)';
(globalThis as Record<string, unknown>).__CHANGELOG__ = null;

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string) => {
		if (cmd === 'check_for_update_on_channel') return { rid: 1, version: '9.9.10', currentVersion: '9.9.9' };
		return undefined;
	}),
	Channel: class {
		onmessage: ((msg: unknown) => void) | null = null;
	},
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(() => Promise.resolve(false)),
	open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-process', () => ({
	relaunch: vi.fn(() => Promise.resolve()),
}));

import { mount, unmount, flushSync, tick } from 'svelte';
import { relaunch } from '@tauri-apps/plugin-process';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import UpdateSection from '#lib/core/settings/sections/UpdateSection.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

const NOTE = '/vaults/A/note.md';
const EDIT = 'typed just before clicking Restart';

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 20; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
	const btn = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
	if (!btn) throw new Error(`button "${text}" not found in: ${root.textContent}`);
	return btn as HTMLButtonElement;
}

describe('Restart to update with a dirty tab', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(UpdateSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		editorStore.reset();
		settingsStore.reset();
	});

	it('saves the dirty tab before relaunching', async () => {
		// An edit whose 2 s auto-save has not fired yet (or whose save failed).
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent(EDIT);

		let savedAtRelaunch: string | undefined;
		vi.mocked(relaunch).mockImplementationOnce(async () => {
			savedAtRelaunch = editorStore.tabs[0].savedContent;
		});

		buttonByText(target, 'Check').click();
		await settle();
		buttonByText(target, 'Restart to update').click();
		await settle();

		expect(relaunch).toHaveBeenCalledTimes(1);
		// The edit is on disk (tab marked saved) before the process is replaced.
		expect(savedAtRelaunch).toBe(EDIT);
		expect(writeTextFile).toHaveBeenCalledWith(NOTE, EDIT);
	});

	it('does not relaunch when the user cancels the discard prompt', async () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent(EDIT);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValueOnce(false);

		buttonByText(target, 'Check').click();
		await settle();
		buttonByText(target, 'Restart to update').click();
		await settle();

		expect(ask).toHaveBeenCalledWith(
			expect.stringContaining('note.md'),
			expect.objectContaining({ kind: 'warning' }),
		);
		expect(relaunch).not.toHaveBeenCalled();
		expect(editorStore.tabs[0].content).toBe(EDIT);
	});

	it('relaunches when the user confirms discarding a failed save', async () => {
		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent(EDIT);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		vi.mocked(ask).mockResolvedValueOnce(true);

		buttonByText(target, 'Check').click();
		await settle();
		buttonByText(target, 'Restart to update').click();
		await settle();

		expect(relaunch).toHaveBeenCalledTimes(1);
	});

	it('relaunches at once with no tabs open', async () => {
		buttonByText(target, 'Check').click();
		await settle();
		buttonByText(target, 'Restart to update').click();
		await settle();

		expect(ask).not.toHaveBeenCalled();
		expect(relaunch).toHaveBeenCalledTimes(1);
	});
});
