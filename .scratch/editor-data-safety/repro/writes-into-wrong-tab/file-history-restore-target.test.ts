// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();
Element.prototype.scrollTo = () => {};

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: (p: string) => p }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(async () => {}),
	exists: vi.fn(async () => false),
	mkdir: vi.fn(async () => {}),
	readDir: vi.fn(async () => []),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { switchToNextTab } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fileHistoryStore } from '#lib/features/file-history/file-history.store.svelte.js';
import { openFileHistory, restoreSnapshot } from '#lib/features/file-history/file-history.service.js';

const A = '/vault/A.md';
const B = '/vault/B.md';
const A_NOW = '# A\n\ncurrent A\n';
const A_OLD = '# A\n\nold A from the snapshot\n';
const B_NOW = '# B\n\nB is a different note the user cares about\n';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

async function settle(): Promise<void> {
	for (let i = 0; i < 10; i++) await Promise.resolve();
	flushSync();
}

describe('F67: file-history restore targets the inspected file', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		editorStore.reset();
		fileHistoryStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(readTextFile).mockImplementation(async (p) => (String(p) === A ? A_NOW : B_NOW));
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_file_history') return [{ id: 7, timestamp: 1000, size: A_OLD.length }];
			if (cmd === 'get_snapshot_content') return A_OLD;
			if (cmd === 'compute_diff') return [];
			return null;
		});
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	it('does not overwrite note B when the active tab changed while A\'s history dialog was open', async () => {
		editorStore.addTab({ path: A, name: 'A.md', content: A_NOW, savedContent: A_NOW });
		editorStore.addTab({ path: B, name: 'B.md', content: B_NOW, savedContent: B_NOW });
		editorStore.setActiveIndex(0);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(MarkdownEditor, { target, props: { host: NOOP_HOST, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks } });
		flushSync();

		// Cmd+Shift+H on A
		await openFileHistory(A);
		await settle();
		expect(fileHistoryStore.filePath).toBe(A);

		// Cmd+Shift+] while the dialog is open (global binding, no dialog guard)
		switchToNextTab();
		flushSync();
		expect(editorStore.activeTabPath).toBe(B);
		expect(fileHistoryStore.isOpen).toBe(true);

		// "Restore This Version" + confirm
		await restoreSnapshot(7);
		await settle();

		const bWrites = vi.mocked(writeTextFile).mock.calls.filter(([p]) => String(p) === B);
		expect(bWrites).toEqual([]);
		expect(editorStore.tabs.find((t) => t.path === B)!.content).toBe(B_NOW);
	});
});
