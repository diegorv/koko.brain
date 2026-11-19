import { describe, it, expect, vi, beforeEach } from 'vitest';

// The dialog, the trash move and the toast are side-effect boundaries; the
// trash move itself is covered by the fs.service and path-change tests.
vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	deleteItem: vi.fn(() => Promise.resolve()),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';
import { PreDeleteSaveError } from '#lib/core/filesystem/fs.logic.js';
import { deleteNoteWithConfirm } from '#lib/core/filesystem/delete-note.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

const PATH = '/vault/Projects/Launch plan.md';

describe('deleteNoteWithConfirm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
	});

	it('asks the file explorer\'s "Move to Trash" question naming the file, then trashes the note', async () => {
		vi.mocked(ask).mockResolvedValue(true);

		await deleteNoteWithConfirm(PATH);

		expect(ask).toHaveBeenCalledWith('Move "Launch plan.md" to trash?', {
			title: 'Move to Trash',
			kind: 'warning',
			okLabel: 'Move to Trash',
			cancelLabel: 'Cancel',
		});
		expect(deleteItem).toHaveBeenCalledWith(PATH, false);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('leaves the note alone when the user declines, and asks for no index refresh', async () => {
		vi.mocked(ask).mockResolvedValue(false);

		await deleteNoteWithConfirm(PATH);

		expect(deleteItem).not.toHaveBeenCalled();
		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
	});

	// Lens lists read the index snapshot, which refreshes after a 2 to 10 s
	// throttle unless a prompt refresh was asked before the delete's index event.
	it('asks for the prompt index refresh before the trash move', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		let requestedAtCall: boolean | undefined;
		vi.mocked(deleteItem).mockImplementationOnce(async () => {
			requestedAtCall = vaultStore.takePromptIndexRefresh();
		});

		await deleteNoteWithConfirm(PATH);

		expect(requestedAtCall).toBe(true);
	});

	it('shows the file-operation error toast when the trash move fails', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		vi.mocked(deleteItem).mockRejectedValueOnce(new Error('permission denied'));

		await deleteNoteWithConfirm(PATH);

		expect(toast.error).toHaveBeenCalledWith('Could not move "Launch plan.md" to the Trash: permission denied');
	});

	it('adds no toast of its own when the pre-delete save failed (the editor already showed one)', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		vi.mocked(deleteItem).mockRejectedValueOnce(new PreDeleteSaveError(PATH));

		await deleteNoteWithConfirm(PATH);

		expect(toast.error).not.toHaveBeenCalled();
	});
});
