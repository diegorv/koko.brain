import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	rename: vi.fn(),
}));

vi.mock('#lib/core/filesystem/path-change.service.js', () => ({
	applyPathChange: vi.fn(async (change: { diskOp: () => Promise<void> }) => {
		await change.diskOp();
	}),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { exists, rename } from '@tauri-apps/plugin-fs';
import { moveItem } from '#lib/core/filesystem/fs.service.js';

/**
 * Auto-move's unarchive rule resolves `{parent}` for a note at
 * `<vault>/_archive/x.md` to '' and then builds the destination directory as
 * `${vaultPath}/${resolved}`, i.e. '/vault/' (auto-move.service.ts:173). moveItem
 * then joins it with `/` (fs.service.ts moveItem). The path the note lands on
 * must be the canonical '/vault/x.md', because the tab, the Rust VaultIndex key
 * and the tree all use that spelling.
 */
describe('moveItem into a vault-root destination', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(rename).mockResolvedValue(undefined);
	});

	it('returns the canonical root path when the target dir carries a trailing slash', async () => {
		const newPath = await moveItem('/vault/_archive/x.md', '/vault/');

		expect(newPath).toBe('/vault/x.md');
	});

	it('renames to the canonical root path when the target dir carries a trailing slash', async () => {
		await moveItem('/vault/_archive/x.md', '/vault/');

		expect(rename).toHaveBeenCalledWith('/vault/_archive/x.md', '/vault/x.md');
	});
});
