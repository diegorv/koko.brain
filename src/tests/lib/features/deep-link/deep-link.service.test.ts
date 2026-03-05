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
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	openOrCreateDailyNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.logic', async (importOriginal) => {
	const original = await importOriginal<Record<string, unknown>>();
	return {
		...original,
		buildPeriodicNotePath: vi.fn(
			(vaultPath: string, folder: string, _format: string, _date: unknown) =>
				folder ? `${vaultPath}/${folder}/daily-note.md` : `${vaultPath}/daily-note.md`,
		),
	};
});

vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/utils/template', () => ({
	processTemplate: vi.fn((_template: string, _title: string, _vars?: Record<string, string>) => 'processed-template'),
}));

import { toast } from 'svelte-sonner';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { processTemplate } from '$lib/utils/template';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { openOrCreateDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { refreshTree } from '$lib/core/filesystem/fs.service';
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
		clearLocalStorage();
		vaultStore._reset();
		searchStore.reset();
		deepLinkStore.reset();
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
				expect(vi.mocked(refreshTree)).toHaveBeenCalled();
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

		describe('capture', () => {
			it('creates quick note with content using configured settings', async () => {
				const action: DeepLinkAction = { type: 'capture', vault: 'V', content: 'My captured text' };
				await executeAction(action, vaultPath);

				expect(vi.mocked(mkdir)).toHaveBeenCalledWith(
					expect.stringContaining(vaultPath),
					{ recursive: true },
				);
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/capture-note-.*\.md$/),
					expect.stringContaining('My captured text'),
				);
				expect(vi.mocked(refreshTree)).toHaveBeenCalled();
			});

			it('applies template and appends content when template is configured', async () => {
				vi.mocked(readTextFile).mockResolvedValue('---\ntitle: template\n---');

				const action: DeepLinkAction = { type: 'capture', vault: 'V', content: 'Captured' };
				await executeAction(action, vaultPath);

				expect(vi.mocked(processTemplate)).toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'processed-template\nCaptured',
				);
			});

			it('saves raw content when template file is not found', async () => {
				vi.mocked(readTextFile).mockRejectedValue(new Error('File not found'));

				const action: DeepLinkAction = { type: 'capture', vault: 'V', content: 'Raw content' };
				await executeAction(action, vaultPath);

				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'Raw content',
				);
			});

			it('saves raw content when no template is configured', async () => {
				settingsStore.updateQuickNote({ templatePath: '' });

				const action: DeepLinkAction = { type: 'capture', vault: 'V', content: 'No template' };
				await executeAction(action, vaultPath);

				expect(vi.mocked(readTextFile)).not.toHaveBeenCalled();
				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'No template',
				);
			});

			it('injects tags into frontmatter when tags are provided', async () => {
				settingsStore.updateQuickNote({ templatePath: '' });

				const action: DeepLinkAction = {
					type: 'capture',
					vault: 'V',
					content: 'Tagged content',
					tags: ['source/raycast'],
				};
				await executeAction(action, vaultPath);

				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'---\ntags: [source/raycast]\n---\nTagged content',
				);
			});

			it('injects multiple tags into frontmatter', async () => {
				settingsStore.updateQuickNote({ templatePath: '' });

				const action: DeepLinkAction = {
					type: 'capture',
					vault: 'V',
					content: 'Multi-tag',
					tags: ['source/raycast', 'project/work'],
				};
				await executeAction(action, vaultPath);

				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'---\ntags: [source/raycast, project/work]\n---\nMulti-tag',
				);
			});

			it('merges tags with template frontmatter tags', async () => {
				settingsStore.updateQuickNote({ templatePath: 'templates/Quick Note.md' });
				vi.mocked(readTextFile).mockResolvedValue('---\ntags: [template-tag]\n---\nTemplate body');
				vi.mocked(processTemplate).mockReturnValue('---\ntags: [template-tag]\n---\nTemplate body');

				const action: DeepLinkAction = {
					type: 'capture',
					vault: 'V',
					content: 'Captured',
					tags: ['source/raycast'],
				};
				await executeAction(action, vaultPath);

				const writeCall = vi.mocked(writeTextFile).mock.calls[0];
				const writtenContent = writeCall[1] as string;
				expect(writtenContent).toContain('template-tag');
				expect(writtenContent).toContain('source/raycast');
			});

			it('does not add frontmatter when no tags are provided', async () => {
				settingsStore.updateQuickNote({ templatePath: '' });

				const action: DeepLinkAction = {
					type: 'capture',
					vault: 'V',
					content: 'No tags here',
				};
				await executeAction(action, vaultPath);

				expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(
					expect.stringMatching(/\.md$/),
					'No tags here',
				);
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
