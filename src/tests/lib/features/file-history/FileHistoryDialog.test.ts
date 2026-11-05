// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(() => Promise.resolve(false)),
}));

// The service reads snapshots over IPC; the store it would fill is real.
vi.mock('#lib/features/file-history/file-history.service.js', () => ({
	selectSnapshot: vi.fn(() => Promise.resolve()),
	restoreSnapshot: vi.fn(() => Promise.resolve()),
	closeFileHistory: vi.fn(),
}));

import { mount, unmount, flushSync, tick } from 'svelte';
import { ask } from '@tauri-apps/plugin-dialog';
import FileHistoryDialog from '#lib/features/file-history/FileHistoryDialog.svelte';
import { closeFileHistory, restoreSnapshot } from '#lib/features/file-history/file-history.service.js';
import { fileHistoryStore } from '#lib/features/file-history/file-history.store.svelte.js';
import { formatSnapshotTime } from '#lib/features/file-history/file-history.logic.js';
import type { SnapshotInfo } from '#lib/features/file-history/file-history.types.js';

// The snapshot list's bits-ui ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const SNAPSHOT: SnapshotInfo = { id: 7, timestamp: 1708185600000, size: 42 };

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

describe('FileHistoryDialog', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(async () => {
		vi.clearAllMocks();
		fileHistoryStore.reset();
		fileHistoryStore.setFilePath('/vault/note.md');
		fileHistoryStore.setSnapshots([SNAPSHOT]);
		fileHistoryStore.setSelectedSnapshot(SNAPSHOT);
		fileHistoryStore.setOpen(true);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(FileHistoryDialog, { target });
		await settle();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		fileHistoryStore.reset();
	});

	/** The dialog content portals to document.body, so search there. */
	function restoreButton(): HTMLButtonElement {
		const btn = [...document.body.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Restore This Version',
		);
		if (!btn) throw new Error(`Restore This Version button not found in: ${document.body.textContent}`);
		return btn as HTMLButtonElement;
	}

	it('shows its title once, as the visible dialog title', () => {
		const title = 'File History: note.md';
		const matches = [...document.body.querySelectorAll('*')].filter(
			(el) => el.textContent?.trim() === title && ![...el.children].some((c) => c.textContent?.trim() === title),
		);
		expect(matches).toHaveLength(1);
		expect(matches[0].getAttribute('data-slot')).toBe('dialog-title');
		expect(matches[0].classList.contains('sr-only')).toBe(false);
	});

	it('has the built-in close button, which closes File History', async () => {
		const close = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Close');
		expect(close).toBeDefined();

		close!.click();
		await settle();

		expect(closeFileHistory).toHaveBeenCalledTimes(1);
	});

	it('asks Restore Version with verb labels and restores on confirm', async () => {
		vi.mocked(ask).mockResolvedValueOnce(true);

		restoreButton().click();
		await settle();

		expect(ask).toHaveBeenCalledWith(
			`Restore this file to the version from ${formatSnapshotTime(SNAPSHOT.timestamp)}? Current content will be replaced.`,
			{ title: 'Restore Version', kind: 'warning', okLabel: 'Restore Version', cancelLabel: 'Cancel' },
		);
		expect(restoreSnapshot).toHaveBeenCalledWith(SNAPSHOT.id);
	});

	it('does not restore when the prompt is declined', async () => {
		vi.mocked(ask).mockResolvedValueOnce(false);

		restoreButton().click();
		await settle();

		expect(ask).toHaveBeenCalledTimes(1);
		expect(restoreSnapshot).not.toHaveBeenCalled();
	});
});
