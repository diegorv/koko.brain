// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(() => Promise.resolve(false)),
}));

// The trash service talks to the filesystem; the store it would fill is real.
vi.mock('#lib/core/trash/trash.service.js', () => ({
	loadTrash: vi.fn(() => Promise.resolve()),
	restoreItem: vi.fn(() => Promise.resolve('')),
	deletePermanently: vi.fn(() => Promise.resolve(true)),
	emptyTrash: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { mount, unmount, flushSync, tick } from 'svelte';
import { ask } from '@tauri-apps/plugin-dialog';
import TrashSection from '#lib/core/settings/sections/TrashSection.svelte';
import { deletePermanently, emptyTrash } from '#lib/core/trash/trash.service.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { TrashItem } from '#lib/core/trash/trash.types.js';

// The bits-ui ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const VAULT = '/vault';
const MEETING: TrashItem = {
	id: '1708185600000',
	originalPath: 'notes/meeting.md',
	fileName: 'meeting.md',
	isDirectory: false,
	trashedAt: 1708185600000,
};
const DRAFTS: TrashItem = {
	id: '1708185600001',
	originalPath: 'drafts',
	fileName: 'drafts',
	isDirectory: true,
	trashedAt: 1708185600001,
};

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

describe('TrashSection confirmations', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
		vaultStore.open(VAULT);
		trashStore.setItems([MEETING, DRAFTS]);
		trashStore.setLoading(false);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(TrashSection, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		trashStore.setItems([]);
		vaultStore._reset();
	});

	function deleteButton(): HTMLButtonElement {
		const btn = target.querySelector<HTMLButtonElement>('button[title="Delete permanently"]');
		if (!btn) throw new Error(`Delete permanently button not found in: ${target.textContent}`);
		return btn;
	}

	function emptyTrashButton(): HTMLButtonElement {
		const btn = [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Empty Trash');
		if (!btn) throw new Error(`Empty Trash button not found in: ${target.textContent}`);
		return btn as HTMLButtonElement;
	}

	it('asks Delete Permanently with verb labels and deletes on confirm', async () => {
		vi.mocked(ask).mockResolvedValueOnce(true);

		deleteButton().click();
		await settle();

		expect(ask).toHaveBeenCalledWith('Permanently delete "meeting.md"? This cannot be undone.', {
			title: 'Delete Permanently',
			kind: 'warning',
			okLabel: 'Delete Permanently',
			cancelLabel: 'Cancel',
		});
		expect(deletePermanently).toHaveBeenCalledWith(VAULT, MEETING);
	});

	it('does not delete when the Delete Permanently prompt is declined', async () => {
		vi.mocked(ask).mockResolvedValueOnce(false);

		deleteButton().click();
		await settle();

		expect(ask).toHaveBeenCalledTimes(1);
		expect(deletePermanently).not.toHaveBeenCalled();
	});

	it('asks Empty Trash with verb labels and empties on confirm', async () => {
		vi.mocked(ask).mockResolvedValueOnce(true);

		emptyTrashButton().click();
		await settle();

		expect(ask).toHaveBeenCalledWith('Permanently delete all 2 items in trash? This cannot be undone.', {
			title: 'Empty Trash',
			kind: 'warning',
			okLabel: 'Empty Trash',
			cancelLabel: 'Cancel',
		});
		expect(emptyTrash).toHaveBeenCalledWith(VAULT);
	});

	it('does not empty the trash when the Empty Trash prompt is declined', async () => {
		vi.mocked(ask).mockResolvedValueOnce(false);

		emptyTrashButton().click();
		await settle();

		expect(ask).toHaveBeenCalledTimes(1);
		expect(emptyTrash).not.toHaveBeenCalled();
	});

	it('asks nothing when no vault is open', async () => {
		vaultStore._reset();

		deleteButton().click();
		emptyTrashButton().click();
		await settle();

		expect(ask).not.toHaveBeenCalled();
		expect(deletePermanently).not.toHaveBeenCalled();
		expect(emptyTrash).not.toHaveBeenCalled();
	});
});
