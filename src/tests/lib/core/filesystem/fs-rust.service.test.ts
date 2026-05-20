import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
	pathExists,
	pathExistsRaw,
	readText,
	writeText,
	renamePath,
	copyPath,
	deletePath,
	readDir,
	createFolder,
	type FsDirEntry,
} from '$lib/core/filesystem/fs-rust.service';

beforeEach(() => {
	vi.mocked(invoke).mockReset();
});

// ── pathExists ─────────────────────────────────────────────────────────────

describe('pathExists', () => {
	it('invokes path_exists with vaultPath + path and returns the boolean', async () => {
		vi.mocked(invoke).mockResolvedValue(true);

		const result = await pathExists('/vault', '/vault/note.md');

		expect(result).toBe(true);
		expect(invoke).toHaveBeenCalledWith('path_exists', {
			vaultPath: '/vault',
			path: '/vault/note.md',
		});
	});

	it('returns false for missing paths', async () => {
		vi.mocked(invoke).mockResolvedValue(false);
		expect(await pathExists('/vault', '/vault/missing.md')).toBe(false);
	});

	it('propagates Rust errors (out-of-vault rejection)', async () => {
		vi.mocked(invoke).mockRejectedValue('Path is outside vault directory');

		await expect(pathExists('/vault', '/etc/passwd')).rejects.toBe(
			'Path is outside vault directory',
		);
	});
});

// ── pathExistsRaw ──────────────────────────────────────────────────────────

describe('pathExistsRaw', () => {
	it('invokes path_exists_raw with only the path (no vaultPath)', async () => {
		vi.mocked(invoke).mockResolvedValue(true);

		const result = await pathExistsRaw('/Users/me/old-vault');

		expect(result).toBe(true);
		expect(invoke).toHaveBeenCalledWith('path_exists_raw', {
			path: '/Users/me/old-vault',
		});
	});

	it('returns false for missing paths (deleted recent vault)', async () => {
		vi.mocked(invoke).mockResolvedValue(false);
		expect(await pathExistsRaw('/Users/me/deleted-vault')).toBe(false);
	});
});

// ── readText ───────────────────────────────────────────────────────────────

describe('readText', () => {
	it('invokes read_text and returns the file content', async () => {
		vi.mocked(invoke).mockResolvedValue('# hello');

		const content = await readText('/vault', '/vault/note.md');

		expect(content).toBe('# hello');
		expect(invoke).toHaveBeenCalledWith('read_text', {
			vaultPath: '/vault',
			path: '/vault/note.md',
		});
	});

	it('propagates "File not found" from Rust', async () => {
		vi.mocked(invoke).mockRejectedValue('File not found: /vault/missing.md');

		await expect(readText('/vault', '/vault/missing.md')).rejects.toMatch(/not found/);
	});

	it('propagates out-of-vault rejection', async () => {
		vi.mocked(invoke).mockRejectedValue('Path is outside vault directory');

		await expect(readText('/vault', '/etc/passwd')).rejects.toBe(
			'Path is outside vault directory',
		);
	});
});

// ── writeText ──────────────────────────────────────────────────────────────

describe('writeText', () => {
	it('invokes write_text with vaultPath + path + content', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await writeText('/vault', '/vault/note.md', 'new content');

		expect(invoke).toHaveBeenCalledWith('write_text', {
			vaultPath: '/vault',
			path: '/vault/note.md',
			content: 'new content',
		});
	});

	it('resolves to undefined on success', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);
		await expect(writeText('/vault', '/vault/note.md', 'x')).resolves.toBeUndefined();
	});

	it('propagates Rust write errors', async () => {
		vi.mocked(invoke).mockRejectedValue('write failed for /vault/note.md: permission denied');

		await expect(writeText('/vault', '/vault/note.md', 'x')).rejects.toMatch(
			/write failed/,
		);
	});

	it('propagates symlink rejection', async () => {
		vi.mocked(invoke).mockRejectedValue('Path is a symlink: /vault/link.md');

		await expect(writeText('/vault', '/vault/link.md', 'x')).rejects.toMatch(/symlink/);
	});
});

// ── renamePath ─────────────────────────────────────────────────────────────

describe('renamePath', () => {
	it('invokes rename_path with from + to', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await renamePath('/vault', '/vault/a.md', '/vault/b.md');

		expect(invoke).toHaveBeenCalledWith('rename_path', {
			vaultPath: '/vault',
			from: '/vault/a.md',
			to: '/vault/b.md',
		});
	});

	it('propagates "Source not found"', async () => {
		vi.mocked(invoke).mockRejectedValue('Source not found: /vault/missing.md');

		await expect(
			renamePath('/vault', '/vault/missing.md', '/vault/b.md'),
		).rejects.toMatch(/Source not found/);
	});

	it('propagates "Destination already exists"', async () => {
		vi.mocked(invoke).mockRejectedValue('Destination already exists: /vault/b.md');

		await expect(renamePath('/vault', '/vault/a.md', '/vault/b.md')).rejects.toMatch(
			/already exists/,
		);
	});
});

// ── copyPath ───────────────────────────────────────────────────────────────

describe('copyPath', () => {
	it('invokes copy_path with from + to', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await copyPath('/vault', '/vault/a.md', '/vault/b.md');

		expect(invoke).toHaveBeenCalledWith('copy_path', {
			vaultPath: '/vault',
			from: '/vault/a.md',
			to: '/vault/b.md',
		});
	});

	it('propagates the directory-source rejection', async () => {
		vi.mocked(invoke).mockRejectedValue('Source is a directory (use a separate recursive command): /vault/sub');

		await expect(copyPath('/vault', '/vault/sub', '/vault/dup')).rejects.toMatch(
			/Source is a directory/,
		);
	});
});

// ── deletePath ─────────────────────────────────────────────────────────────

describe('deletePath', () => {
	it('invokes delete_path with the recursive flag (default usage)', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await deletePath('/vault', '/vault/note.md', false);

		expect(invoke).toHaveBeenCalledWith('delete_path', {
			vaultPath: '/vault',
			path: '/vault/note.md',
			recursive: false,
		});
	});

	it('passes recursive: true through to Rust', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await deletePath('/vault', '/vault/sub', true);

		expect(invoke).toHaveBeenCalledWith('delete_path', {
			vaultPath: '/vault',
			path: '/vault/sub',
			recursive: true,
		});
	});

	it('propagates "Path not found"', async () => {
		vi.mocked(invoke).mockRejectedValue('Path not found: /vault/missing.md');

		await expect(deletePath('/vault', '/vault/missing.md', false)).rejects.toMatch(
			/not found/,
		);
	});

	it('propagates non-empty-directory rejection on non-recursive delete', async () => {
		vi.mocked(invoke).mockRejectedValue('rmdir failed: Directory not empty (os error 66)');

		await expect(deletePath('/vault', '/vault/sub', false)).rejects.toMatch(
			/rmdir failed/,
		);
	});
});

// ── readDir ────────────────────────────────────────────────────────────────

describe('readDir', () => {
	it('invokes read_dir and returns the entry list', async () => {
		const entries: FsDirEntry[] = [
			{ name: 'a.md', path: '/vault/a.md', isDirectory: false },
			{ name: 'sub', path: '/vault/sub', isDirectory: true },
		];
		vi.mocked(invoke).mockResolvedValue(entries);

		const result = await readDir('/vault', '/vault');

		expect(result).toEqual(entries);
		expect(invoke).toHaveBeenCalledWith('read_dir', {
			vaultPath: '/vault',
			path: '/vault',
		});
	});

	it('returns an empty array for an empty directory', async () => {
		vi.mocked(invoke).mockResolvedValue([]);
		expect(await readDir('/vault', '/vault/empty')).toEqual([]);
	});

	it('propagates "Not a directory" when the target is a file', async () => {
		vi.mocked(invoke).mockRejectedValue('Not a directory: /vault/note.md');

		await expect(readDir('/vault', '/vault/note.md')).rejects.toMatch(/Not a directory/);
	});

	it('propagates out-of-vault rejection', async () => {
		vi.mocked(invoke).mockRejectedValue('Path is outside vault directory');

		await expect(readDir('/vault', '/etc')).rejects.toBe(
			'Path is outside vault directory',
		);
	});
});

// -- createFolder ------------------------------------------------------------

describe('createFolder', () => {
	it('invokes create_folder with a single path arg (no vaultPath)', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		await createFolder('/vault/.kokobrain');

		expect(invoke).toHaveBeenCalledWith('create_folder', {
			path: '/vault/.kokobrain',
		});
	});

	it('resolves to undefined on success (idempotent mkdir)', async () => {
		vi.mocked(invoke).mockResolvedValue(undefined);
		await expect(createFolder('/vault/sub')).resolves.toBeUndefined();
	});

	it('propagates Rust mkdir failures', async () => {
		vi.mocked(invoke).mockRejectedValue('mkdir failed for /vault/sub: permission denied');

		await expect(createFolder('/vault/sub')).rejects.toMatch(/mkdir failed/);
	});
});
