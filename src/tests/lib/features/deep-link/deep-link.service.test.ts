import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(() => Promise.resolve('')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(() => Promise.resolve()),
	syncExternalContentToEditor: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	openOrCreateDailyNote: vi.fn(() => Promise.resolve()),
}));

// periodic-notes.logic is pure logic (CLAUDE.md: never mock .logic). The daily
// tests assert the written path only by its .md suffix, so the real
// buildPeriodicNotePath (which always yields a `<...>.md` path) is used directly.

vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	markRecentSave: vi.fn(),
	notifyAfterSave: vi.fn(),
}));

vi.mock('$lib/utils/template', () => ({
	processTemplate: vi.fn((_template: string, _title: string, _vars?: Record<string, string>) => 'processed-template'),
}));

import { toast } from 'svelte-sonner';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { processTemplate } from '$lib/utils/template';
import { error } from '$lib/utils/debug';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { openOrCreateDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { deepLinkStore } from '$lib/features/deep-link/deep-link.store.svelte';
import {
	handleDeepLinkUrl,
	resolveVaultPath,
	resolveAndDispatch,
	executeAction,
	resolveContent,
	executePendingAction,
	resetDeepLink,
} from '$lib/features/deep-link/deep-link.service';
import type { DeepLinkAction } from '$lib/features/deep-link/deep-link.types';

describe('deep-link.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// clearAllMocks wipes call history but NOT mockResolvedValue
		// implementations, so reset exists() to a clean default — otherwise a
		// prior test's `exists -> true` leaks in, and the capture-path
		// uniqueness guard (resolveUniqueCapturePath) would loop forever.
		vi.mocked(exists).mockResolvedValue(false);
		clearLocalStorage();
		vaultStore._reset();
		searchStore.reset();
		deepLinkStore.reset();
		// Capture-template resolution now lives on settingsStore.quickCapture.templates
		// (per kind). Default to empty strings so each capture test sees the
		// "no template" path and opts in by writing the kind it exercises.
		settingsStore.updateQuickCapture({
			templates: { note: '', clip: '', link: '', shot: '', file: '' },
		});
	});

	// ── resolveVaultPath ────────────────────────────────────────────

	describe('resolveVaultPath', () => {
		it('finds vault by exact name match', () => {
			vaultStore.open('/Users/me/MyVault');
			expect(resolveVaultPath('MyVault')).toBe('/Users/me/MyVault');
		});

		it('finds vault by case-insensitive name match', () => {
			vaultStore.open('/Users/me/MyVault');
			expect(resolveVaultPath('myvault')).toBe('/Users/me/MyVault');
			expect(resolveVaultPath('MYVAULT')).toBe('/Users/me/MyVault');
		});

		it('returns null when vault is not in recent list', () => {
			expect(resolveVaultPath('NonExistent')).toBeNull();
		});

		it('matches among multiple recent vaults', () => {
			vaultStore.open('/Users/me/VaultA');
			vaultStore.open('/Users/me/VaultB');
			expect(resolveVaultPath('VaultA')).toBe('/Users/me/VaultA');
			expect(resolveVaultPath('VaultB')).toBe('/Users/me/VaultB');
		});
	});

	// ── handleDeepLinkUrl ───────────────────────────────────────────

	describe('handleDeepLinkUrl', () => {
		it('shows toast on invalid URL', async () => {
			await handleDeepLinkUrl('not a valid url');
			expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
				expect.stringContaining('Invalid deep link'),
			);
		});

		it('shows toast on unknown action', async () => {
			await handleDeepLinkUrl('kokobrain://unknown?vault=V');
			expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
				expect.stringContaining('Invalid deep link'),
			);
		});

		it('shows toast when vault not found', async () => {
			await handleDeepLinkUrl('kokobrain://open?vault=NonExistent');
			expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
				expect.stringContaining('not found'),
			);
		});
	});

	// ── resolveAndDispatch ──────────────────────────────────────────

	describe('resolveAndDispatch', () => {
		it('executes immediately when vault is already open', async () => {
			vaultStore.open('/Users/me/TestVault');

			const action: DeepLinkAction = {
				type: 'open',
				vault: 'TestVault',
				file: 'notes/test.md',
			};
			await resolveAndDispatch(action);

			expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith(
				'/Users/me/TestVault/notes/test.md',
			);
		});

		it('sets pending action and opens vault when different vault needed', async () => {
			vaultStore.open('/Users/me/VaultA');
			vaultStore.open('/Users/me/VaultB');
			// Currently VaultB is open. Send action for VaultA.
			vaultStore.close();
			vaultStore.open('/Users/me/VaultB');

			const action: DeepLinkAction = {
				type: 'search',
				vault: 'VaultA',
				query: 'hello',
			};
			await resolveAndDispatch(action);

			// Should have stored pending action
			// Note: vaultStore.open was called, switching to VaultA
			expect(vaultStore.path).toBe('/Users/me/VaultA');
		});

		it('shows toast when vault name not found', async () => {
			const action: DeepLinkAction = {
				type: 'open',
				vault: 'NonExistent',
			};
			await resolveAndDispatch(action);

			expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
				expect.stringContaining('not found'),
			);
			expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
		});
	});

	// ── executeAction ───────────────────────────────────────────────

	describe('executeAction', () => {
		const vaultPath = '/Users/me/TestVault';

		describe('open', () => {
			it('opens file when file param is provided', async () => {
				const action: DeepLinkAction = { type: 'open', vault: 'V', file: 'notes/test.md' };
				await executeAction(action, vaultPath);
				expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith(
					'/Users/me/TestVault/notes/test.md',
				);
			});

			it('opens file when path param is provided (alias)', async () => {
				const action: DeepLinkAction = { type: 'open', vault: 'V', path: 'docs/readme.md' };
				await executeAction(action, vaultPath);
				expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith(
					'/Users/me/TestVault/docs/readme.md',
				);
			});

			it('does nothing when no file specified (vault-only open)', async () => {
				const action: DeepLinkAction = { type: 'open', vault: 'V' };
				await executeAction(action, vaultPath);
				expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
			});
		});

		describe('new', () => {
			it('creates note via openOrCreateNote when not silent', async () => {
				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Hello World',
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(openOrCreateNote)).toHaveBeenCalledWith({
					filePath: '/Users/me/TestVault/test.md',
					title: 'test',
					inlineTemplate: 'Hello World',
				});
			});

			it('writes file silently without opening in editor', async () => {
				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Silent content',
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(mkdir)).toHaveBeenCalledWith('/Users/me/TestVault', { recursive: true });
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Silent content',
				);
				expect(vi.mocked(refreshTree)).toHaveBeenCalled();
				expect(vi.mocked(openOrCreateNote)).not.toHaveBeenCalled();
				expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
			});

			it('logs instead of silently swallowing a failed background tree refresh', async () => {
				vi.mocked(refreshTree).mockRejectedValueOnce(new Error('tree refresh failed'));
				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Silent content',
					silent: true,
				};

				// executeAction returns without awaiting refreshTree (fire-and-forget);
				// the rejection is handled on a later microtask.
				await executeAction(action, vaultPath);

				await vi.waitFor(() =>
					expect(vi.mocked(error)).toHaveBeenCalledWith(
						'DEEP_LINK',
						'Failed to refresh tree after deep-link write:',
						expect.any(Error),
					),
				);
			});

			it('appends content to existing file', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Existing content');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Appended',
					append: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Existing content\nAppended',
				);
				expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith('/Users/me/TestVault/test.md');
			});

			it('appends silently without opening', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Existing');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'More',
					append: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Existing\nMore',
				);
				expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
			});

			it('creates new file when append is true but file does not exist', async () => {
				vi.mocked(exists).mockResolvedValue(false);

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'New content',
					append: true,
				};
				await executeAction(action, vaultPath);
				// Falls through to openOrCreateNote since file doesn't exist
				expect(vi.mocked(openOrCreateNote)).toHaveBeenCalled();
			});

			it('reads content from clipboard when clipboard=true', async () => {
				vi.mocked(readText).mockResolvedValue('Clipboard markdown content');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'clip.md',
					content: 'fallback',
					clipboard: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(readText)).toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/clip.md',
					'Clipboard markdown content',
				);
			});

			it('falls back to content param when clipboard read fails', async () => {
				vi.mocked(readText).mockRejectedValue(new Error('Clipboard unavailable'));

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'clip.md',
					content: 'Fallback content',
					clipboard: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/clip.md',
					'Fallback content',
				);
			});

			it('falls back to content param when clipboard returns empty', async () => {
				vi.mocked(readText).mockResolvedValue('');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'clip.md',
					content: 'URI content',
					clipboard: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/clip.md',
					'URI content',
				);
			});

			it('prepends content to existing file', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Existing content');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Prepended',
					prepend: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Prepended\nExisting content',
				);
				expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith('/Users/me/TestVault/test.md');
			});

			it('prepends silently without opening', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Existing');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Top',
					prepend: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Top\nExisting',
				);
				expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
			});

			it('creates new file when prepend is true but file does not exist', async () => {
				vi.mocked(exists).mockResolvedValue(false);

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'New content',
					prepend: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(openOrCreateNote)).toHaveBeenCalled();
			});

			it('overwrites existing file with overwrite=true', async () => {
				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Overwritten',
					overwrite: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(mkdir)).toHaveBeenCalledWith('/Users/me/TestVault', { recursive: true });
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Overwritten',
				);
				expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith('/Users/me/TestVault/test.md');
			});

			it('overwrites silently without opening', async () => {
				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					content: 'Silent overwrite',
					overwrite: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'Silent overwrite',
				);
				expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
			});

			it('resolves name from file param when name is absent (Clipper compat)', async () => {
				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					file: 'Clippings/Article Title',
					content: 'Clipped content',
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/Clippings/Article Title.md',
					'Clipped content',
				);
			});

			it('uses clipboard content with prepend on existing file', async () => {
				vi.mocked(readText).mockResolvedValue('From clipboard');
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Old content');

				const action: DeepLinkAction = {
					type: 'new',
					vault: 'V',
					name: 'test.md',
					clipboard: true,
					prepend: true,
					silent: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					'/Users/me/TestVault/test.md',
					'From clipboard\nOld content',
				);
			});
		});

		// ── resolveContent ─────────────────────────────────────────────

		describe('resolveContent', () => {
			it('returns content param when clipboard is false', async () => {
				const result = await resolveContent({ content: 'Hello', clipboard: false });
				expect(result).toBe('Hello');
				expect(vi.mocked(readText)).not.toHaveBeenCalled();
			});

			it('returns content param when clipboard is undefined', async () => {
				const result = await resolveContent({ content: 'Hello' });
				expect(result).toBe('Hello');
			});

			it('returns empty string when no content and no clipboard', async () => {
				const result = await resolveContent({});
				expect(result).toBe('');
			});

			it('reads from clipboard when clipboard is true', async () => {
				vi.mocked(readText).mockResolvedValue('Clipboard text');
				const result = await resolveContent({ clipboard: true });
				expect(result).toBe('Clipboard text');
			});

			it('falls back to content when clipboard returns empty', async () => {
				vi.mocked(readText).mockResolvedValue('');
				const result = await resolveContent({ content: 'Fallback', clipboard: true });
				expect(result).toBe('Fallback');
			});

			it('falls back to content when clipboard read throws', async () => {
				vi.mocked(readText).mockRejectedValue(new Error('Failed'));
				const result = await resolveContent({ content: 'Fallback', clipboard: true });
				expect(result).toBe('Fallback');
			});
		});

		describe('search', () => {
			it('sets search query and opens search panel', async () => {
				const action: DeepLinkAction = { type: 'search', vault: 'V', query: 'hello world' };
				await executeAction(action, vaultPath);
				expect(searchStore.query).toBe('hello world');
				expect(searchStore.isOpen).toBe(true);
			});
		});

		describe('daily', () => {
			it('calls openOrCreateDailyNote with no content params', async () => {
				const action: DeepLinkAction = { type: 'daily', vault: 'V' };
				await executeAction(action, vaultPath);
				expect(vi.mocked(openOrCreateDailyNote)).toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled();
			});

			it('appends content to existing daily note', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Today journal');

				const action: DeepLinkAction = {
					type: 'daily',
					vault: 'V',
					content: 'Clipped text',
					append: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(openOrCreateDailyNote)).toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'Today journal\nClipped text',
				);
				// File already existed (the append branch is guarded by exists), so
				// tree structure is unchanged and refreshTree must NOT be called —
				// it would trigger a full scan_vault for nothing.
				expect(vi.mocked(refreshTree)).not.toHaveBeenCalled();
			});

			it('prepends content to existing daily note', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Today journal');

				const action: DeepLinkAction = {
					type: 'daily',
					vault: 'V',
					content: 'Top text',
					prepend: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'Top text\nToday journal',
				);
			});

			it('reads content from clipboard for daily note', async () => {
				vi.mocked(readText).mockResolvedValue('Clipboard daily content');
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Existing daily');

				const action: DeepLinkAction = {
					type: 'daily',
					vault: 'V',
					clipboard: true,
					append: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(readText)).toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'Existing daily\nClipboard daily content',
				);
			});

			it('does not write when daily note file does not exist after creation', async () => {
				vi.mocked(exists).mockResolvedValue(false);

				const action: DeepLinkAction = {
					type: 'daily',
					vault: 'V',
					content: 'Some text',
					append: true,
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(openOrCreateDailyNote)).toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).not.toHaveBeenCalled();
			});

			it('defaults to append when neither append nor prepend is set', async () => {
				vi.mocked(exists).mockResolvedValue(true);
				vi.mocked(readTextFile).mockResolvedValue('Existing');

				const action: DeepLinkAction = {
					type: 'daily',
					vault: 'V',
					content: 'Added text',
				};
				await executeAction(action, vaultPath);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'Existing\nAdded text',
				);
			});
		});

		describe('capture (v2)', () => {
			// ── note kind ───────────────────────────────────────────
			describe('kind=note', () => {
				it('writes the raw text body when no template is configured', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'My captured text',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(mkdir)).toHaveBeenCalledWith(
						expect.stringContaining(vaultPath),
						{ recursive: true },
					);
					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/capture-note-.*\.md$/),
						'My captured text',
					);
					expect(vi.mocked(refreshTree)).toHaveBeenCalled();
				});

				it('appends a numeric suffix when the target path already exists', async () => {
					// resolveUniqueCapturePath: exists(base) -> true, exists(base-1) -> false.
					vi.mocked(exists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Dup capture',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/capture-note-.*-1\.md$/),
						'Dup capture',
					);
					// The marked path must match the suffixed path actually written.
					const [markedPath] = vi.mocked(markRecentSave).mock.calls[0];
					const [writtenPath] = vi.mocked(writeTextFile).mock.calls[0];
					expect(markedPath).toBe(writtenPath);
				});

				it('appends a source footer when sourceUrl is present', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'My note',
						sourceTitle: 'Some Page',
						sourceUrl: 'https://example.com',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'My note\n\n> Source: [Some Page](https://example.com)',
					);
				});

				it('applies the configured template and appends the rendered body', async () => {
					settingsStore.updateQuickCapture({ templates: { note: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('---\ntitle: template\n---');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Captured',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(processTemplate)).toHaveBeenCalled();
					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'processed-template\nCaptured',
					);
				});

				it('falls back to the raw body when the template file is not found', async () => {
					settingsStore.updateQuickCapture({ templates: { note: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockRejectedValue(new Error('File not found'));

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Raw content',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'Raw content',
					);
				});

				it('injects multiple tags into frontmatter when tags are provided', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Multi-tag',
						tags: ['source/raycast', 'project/work'],
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'---\ntags: [source/raycast, project/work]\n---\nMulti-tag',
					);
				});

				it('merges deep-link tags with template frontmatter tags', async () => {
					settingsStore.updateQuickCapture({ templates: { note: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('---\ntags: [template-tag]\n---\nTemplate body');
					vi.mocked(processTemplate).mockReturnValue('---\ntags: [template-tag]\n---\nTemplate body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Captured',
						tags: ['source/raycast'],
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).toContain('template-tag');
					expect(written).toContain('source/raycast');
				});

				it('does NOT inject a YAML title for the note kind even with sourceTitle present', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Body',
						sourceTitle: 'Browser Title',
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).not.toContain('title:');
				});

				it('exposes filename-derived title to the template (no deep-link title for note kind)', async () => {
					settingsStore.updateQuickCapture({ templates: { note: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('template body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Body',
					};
					await executeAction(action, vaultPath);

					const call = vi.mocked(processTemplate).mock.calls[0];
					const passedFileTitle = call[1] as string;
					const passedVars = call[2] as Record<string, string>;
					expect(passedVars.title).toBe(passedFileTitle);
					expect(passedVars.title.length).toBeGreaterThan(0);
				});
			});

			// ── clip kind ───────────────────────────────────────────
			describe('kind=clip', () => {
				it('writes the highlighted text verbatim when no source is provided', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'clip',
						text: 'Highlighted text',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'Highlighted text',
					);
				});

				it('appends a source footer when sourceUrl is present', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'clip',
						text: 'Whether I will remain open-minded...',
						sourceTitle: 'Four Notes to My Future Self',
						sourceUrl: 'https://medium.com/post',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'Whether I will remain open-minded...\n\n> Source: [Four Notes to My Future Self](https://medium.com/post)',
					);
				});
			});

			// ── link kind ───────────────────────────────────────────
			describe('kind=link', () => {
				it('writes a markdown link as the body when no template is configured', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: 'Example',
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).toContain('title: Example');
					expect(written).toContain('[Example](https://example.com)');
				});

				it('falls back to the URL as the link label when no title is provided', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'[https://example.com](https://example.com)',
					);
				});

				it('injects the link title into frontmatter as `title:`', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: 'Page Title',
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).toContain('title: Page Title');
				});

				it('replaces the template title when a deep-link title is provided', async () => {
					settingsStore.updateQuickCapture({ templates: { link: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('---\ntitle: template-title\n---\nTemplate body');
					vi.mocked(processTemplate).mockReturnValue('---\ntitle: template-title\n---\nTemplate body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: 'Override Title',
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).toContain('title: Override Title');
					expect(written).not.toContain('template-title');
					expect(written).toContain('[Override Title](https://example.com)');
				});

				it('exposes the deep-link title to the template as `title` var', async () => {
					settingsStore.updateQuickCapture({ templates: { link: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('template body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: 'Deep Link Title',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(processTemplate)).toHaveBeenCalledWith(
						'template body',
						expect.any(String),
						expect.objectContaining({ title: 'Deep Link Title' }),
					);
				});

				it('falls back to the filename-derived title when no deep-link title is provided', async () => {
					settingsStore.updateQuickCapture({ templates: { link: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('template body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
					};
					await executeAction(action, vaultPath);

					const call = vi.mocked(processTemplate).mock.calls[0];
					const passedFileTitle = call[1] as string;
					const passedVars = call[2] as Record<string, string>;
					expect(passedVars.title).toBe(passedFileTitle);
					expect(passedVars.title.length).toBeGreaterThan(0);
				});

				it('omits source footer when sourceUrl equals the canonical url', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: 'Example',
						sourceUrl: 'https://example.com',
						sourceTitle: 'Browser Title',
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).not.toContain('> Source:');
				});

				it('appends source footer when sourceUrl differs from canonical url', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://canonical.example.com',
						title: 'Canonical',
						sourceUrl: 'https://share.example.com/redirect',
						sourceTitle: 'Share Page',
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).toContain('[Canonical](https://canonical.example.com)');
					expect(written).toContain('> Source: [Share Page](https://share.example.com/redirect)');
				});

				it('injects both title and tags into frontmatter', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com',
						title: 'My Title',
						tags: ['source/quick-capture'],
					};
					await executeAction(action, vaultPath);

					const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
					expect(written).toContain('title: My Title');
					expect(written).toContain('tags: [source/quick-capture]');
					expect(written).toContain('[My Title](https://example.com)');
				});
			});

			// ── template variables (v2 provenance) ─────────────────
			describe('template variables', () => {
				it('exposes kind and empty provenance defaults for a note without source fields', async () => {
					settingsStore.updateQuickCapture({ templates: { note: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('template body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'Body',
					};
					await executeAction(action, vaultPath);

					const vars = vi.mocked(processTemplate).mock.calls[0][2] as Record<string, string>;
					expect(vars.kind).toBe('note');
					expect(vars.sourceApp).toBe('');
					expect(vars.sourceTitle).toBe('');
					expect(vars.sourceUrl).toBe('');
					expect(vars.capturedAt).toBe('');
					expect(vars.url).toBe('');
				});

				it('forwards provenance fields for a clip capture', async () => {
					settingsStore.updateQuickCapture({ templates: { clip: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('template body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'clip',
						text: 'Highlighted',
						sourceApp: 'com.google.Chrome',
						sourceTitle: 'Some Page',
						sourceUrl: 'https://example.com',
						capturedAt: '2026-05-19T15:30:00Z',
					};
					await executeAction(action, vaultPath);

					const vars = vi.mocked(processTemplate).mock.calls[0][2] as Record<string, string>;
					expect(vars.kind).toBe('clip');
					expect(vars.sourceApp).toBe('com.google.Chrome');
					expect(vars.sourceTitle).toBe('Some Page');
					expect(vars.sourceUrl).toBe('https://example.com');
					expect(vars.capturedAt).toBe('2026-05-19T15:30:00Z');
					expect(vars.url).toBe('');
				});

				it('exposes the canonical url for a link capture', async () => {
					settingsStore.updateQuickCapture({ templates: { link: 'templates/Quick Note.md' } });
					vi.mocked(readTextFile).mockResolvedValue('template body');

					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'link',
						url: 'https://example.com/post',
						title: 'Post Title',
					};
					await executeAction(action, vaultPath);

					const vars = vi.mocked(processTemplate).mock.calls[0][2] as Record<string, string>;
					expect(vars.kind).toBe('link');
					expect(vars.url).toBe('https://example.com/post');
					expect(vars.sourceUrl).toBe('');
				});
			});

			// ── shot / file kinds ──────────────────────────────────────────────────────
			describe('kind=shot / kind=file', () => {
				it('writes a file:// image embed for kind=shot', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'shot',
						path: '/Users/me/Desktop/shot.png',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'![shot.png](file:///Users/me/Desktop/shot.png)',
					);
					expect(vi.mocked(refreshTree)).toHaveBeenCalled();
				});

				it('writes a file:// link for kind=file using originalName as the label', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'file',
						path: '/var/koko/blobs/01HFILE.pdf',
						originalName: 'meeting notes.pdf',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
						expect.stringMatching(/\.md$/),
						'[meeting notes.pdf](file:///var/koko/blobs/01HFILE.pdf)',
					);
				});
			});

			// ── watcher-skip invariant ────────────────────────────────────
			describe('markRecentSave', () => {
				it('marks the captured note path before writeTextFile so the watcher skips rebuild', async () => {
					const action: DeepLinkAction = {
						type: 'capture',
						vault: 'V',
						kind: 'note',
						text: 'capture body',
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(markRecentSave)).toHaveBeenCalledTimes(1);
					const [markedPath] = vi.mocked(markRecentSave).mock.calls[0];
					const [writtenPath] = vi.mocked(writeTextFile).mock.calls[0];
					expect(markedPath).toBe(writtenPath);
					// Ordering: markRecentSave must fire BEFORE writeTextFile so the
					// watcher's areAllRecentSaves check sees the entry when the
					// debounced rebuildAllIndexes runs ~500 ms later.
					const markOrder = vi.mocked(markRecentSave).mock.invocationCallOrder[0];
					const writeOrder = vi.mocked(writeTextFile).mock.invocationCallOrder[0];
					expect(markOrder).toBeLessThan(writeOrder);
				});

				it('marks the daily note path before appending', async () => {
					vi.mocked(exists).mockResolvedValue(true);
					vi.mocked(readTextFile).mockResolvedValue('Existing');

					const action: DeepLinkAction = {
						type: 'daily',
						vault: 'V',
						content: 'Added',
						append: true,
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(markRecentSave)).toHaveBeenCalledTimes(1);
					const [markedPath] = vi.mocked(markRecentSave).mock.calls[0];
					expect(markedPath).toMatch(/\.md$/);
				});

				it('marks the path on new-action silent create', async () => {
					const action: DeepLinkAction = {
						type: 'new',
						vault: 'V',
						name: 'silent.md',
						content: 'Silent',
						silent: true,
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(markRecentSave)).toHaveBeenCalledWith(
						'/Users/me/TestVault/silent.md',
					);
				});

				it('marks the path on new-action append branch', async () => {
					vi.mocked(exists).mockResolvedValue(true);
					vi.mocked(readTextFile).mockResolvedValue('Old');

					const action: DeepLinkAction = {
						type: 'new',
						vault: 'V',
						name: 'append.md',
						content: 'New',
						append: true,
						silent: true,
					};
					await executeAction(action, vaultPath);

					expect(vi.mocked(markRecentSave)).toHaveBeenCalledWith(
						'/Users/me/TestVault/append.md',
					);
					// File pre-existed → tree unchanged → no scan_vault.
					expect(vi.mocked(refreshTree)).not.toHaveBeenCalled();
				});
			});
		});
	});

	// ── executePendingAction ─────────────────────────────────────────

	describe('executePendingAction', () => {
		it('executes and clears pending action', async () => {
			vaultStore.open('/Users/me/TestVault');
			deepLinkStore.setPendingAction({
				type: 'open',
				vault: 'TestVault',
				file: 'notes/pending.md',
			});

			await executePendingAction();

			expect(vi.mocked(openFileInEditor)).toHaveBeenCalledWith(
				'/Users/me/TestVault/notes/pending.md',
			);
			expect(deepLinkStore.hasPending).toBe(false);
		});

		it('does nothing when no pending action', async () => {
			vaultStore.open('/Users/me/TestVault');
			await executePendingAction();
			expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
		});

		it('does nothing when no vault is open', async () => {
			deepLinkStore.setPendingAction({
				type: 'open',
				vault: 'V',
				file: 'test.md',
			});
			await executePendingAction();
			expect(vi.mocked(openFileInEditor)).not.toHaveBeenCalled();
		});
	});

	// ── resetDeepLink ───────────────────────────────────────────────

	describe('resetDeepLink', () => {
		it('clears pending action', () => {
			deepLinkStore.setPendingAction({ type: 'daily', vault: 'V' });
			resetDeepLink();
			expect(deepLinkStore.hasPending).toBe(false);
		});
	});
});
