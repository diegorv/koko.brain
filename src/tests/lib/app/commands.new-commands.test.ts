// @vitest-environment jsdom
// The palette's "New ..." commands over the real editor service and stores: a
// created file opens in the editor, a created folder is picked in the Files
// navigator. Only the create calls and the Tauri boundary are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	createFolder: vi.fn(),
}));
vi.mock('#lib/features/canvas/canvas.service.js', () => ({
	createCanvasFile: vi.fn(),
}));
vi.mock('#lib/plugins/kanban/kanban.service.js', () => ({
	createKanbanFile: vi.fn(),
}));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('svelte-sonner', () => ({
	toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

import { mount, unmount, flushSync } from 'svelte';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { createFile, createFolder } from '#lib/core/filesystem/fs.service.js';
import { createCanvasFile } from '#lib/features/canvas/canvas.service.js';
import { createKanbanFile } from '#lib/plugins/kanban/kanban.service.js';
import { getBuiltInCommands } from '#lib/app/commands.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import FilesNavigator from '#lib/features/rail-shell/FilesNavigator.svelte';
import { FILES_RAIL_ITEM, pickedFolderLens } from '#lib/features/rail-shell/lens.logic.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';

const VAULT = '/vault';

function run(id: string) {
	return getBuiltInCommands()
		.find((c) => c.id === id)!
		.action();
}

describe('palette "New ..." commands', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open(VAULT);
		editorStore.reset();
		fsStore.reset();
		settingsStore.reset();
		vi.mocked(readTextFile).mockResolvedValue('');
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it.each([
		['file-explorer:new-file', createFile, `${VAULT}/Untitled.md`, undefined],
		['canvas:new', createCanvasFile, `${VAULT}/Untitled.canvas`, 'canvas'],
		['kanban:new', createKanbanFile, `${VAULT}/Untitled.kanban`, 'kanban'],
	] as const)('%s opens the created file in the editor', async (id, create, path, fileType) => {
		vi.mocked(create).mockResolvedValueOnce(path);

		await run(id);

		expect(editorStore.activeTabPath).toBe(path);
		expect(editorStore.activeTab?.fileType).toBe(fileType);
		expect(fsStore.renamingPath).toBeNull();
	});

	it('new folder picks the created folder in the Files navigator', async () => {
		const folderPath = `${VAULT}/Untitled`;
		vi.mocked(createFolder).mockResolvedValueOnce(folderPath);
		settingsStore.updateLayout({ railItem: 'today', railPanelsVisible: false });

		await run('file-explorer:new-folder');

		expect(settingsStore.layout.railItem).toBe(FILES_RAIL_ITEM);
		expect(settingsStore.layout.railFolder).toBe(folderPath);
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(fsStore.renamingPath).toBeNull();
		expect(editorStore.tabs).toHaveLength(0);

		fsStore.setFileTree([{ name: 'Untitled', path: folderPath, isDirectory: true, children: [] }]);
		component = mount(FilesNavigator, {
			target,
			props: { picked: pickedFolderLens(settingsStore.layout.railFolder), expanded: [], onPick: vi.fn(), onToggle: vi.fn(), onPickView: vi.fn() },
		});
		flushSync();
		const row = target.querySelector<HTMLElement>(`[data-files-navigator-folder="${folderPath}"]`);
		expect(row?.textContent).toContain('Untitled');
		expect(row?.getAttribute('aria-current')).toBe('true');
	});

	it.each([
		['file-explorer:new-file', createFile],
		['file-explorer:new-folder', createFolder],
		['canvas:new', createCanvasFile],
		['kanban:new', createKanbanFile],
	] as const)('a failed %s opens nothing and leaves the navigator alone', async (id, create) => {
		vi.mocked(create).mockRejectedValueOnce(new Error('disk full'));
		const layoutBefore = { ...settingsStore.layout };

		await expect(run(id)).rejects.toThrow('disk full');

		expect(editorStore.tabs).toHaveLength(0);
		expect(settingsStore.layout).toEqual(layoutBefore);
		expect(fsStore.renamingPath).toBeNull();
	});

	it('does nothing without an open vault', async () => {
		vaultStore._reset();

		await run('file-explorer:new-file');
		await run('file-explorer:new-folder');

		expect(createFile).not.toHaveBeenCalled();
		expect(createFolder).not.toHaveBeenCalled();
		expect(editorStore.tabs).toHaveLength(0);
		expect(settingsStore.layout.railFolder).toBeNull();
	});
});

describe('palette Tasks status filter command', () => {
	const statusCommand = () => getBuiltInCommands().find((c) => c.id === 'tasks:status-filter')!;

	beforeEach(() => {
		tasksStore.reset();
		editorStore.reset();
	});

	it('offers all statuses while the filter is Open with no chosen statuses', () => {
		expect(tasksStore.quick.show).toBe('open');
		expect(tasksStore.quick.statuses).toBeUndefined();
		expect(statusCommand()).toMatchObject({ label: 'Tasks: Show all statuses', category: 'Navigation' });
	});

	it.each([
		['show all', { show: 'all' as const }],
		['show closed', { show: 'closed' as const }],
		['chosen statuses', { show: 'open' as const, statuses: ['done' as const] }],
	])('offers Open only with %s', (_name, quick) => {
		tasksStore.setQuick(quick);
		expect(statusCommand().label).toBe('Tasks: Show open only');
	});

	it('shows all statuses and opens the Tasks tab', async () => {
		await statusCommand().action();

		expect(tasksStore.quick.show).toBe('all');
		expect(tasksStore.quick.statuses).toBeUndefined();
		expect(editorStore.activeTabPath).toBe(TASKS_VIRTUAL_PATH);
	});

	it('goes back to Open only, clearing chosen statuses, and opens the Tasks tab', async () => {
		tasksStore.setQuick({ show: 'all', statuses: ['done', 'cancelled'] });

		await statusCommand().action();

		expect(tasksStore.quick.show).toBe('open');
		expect(tasksStore.quick.statuses).toBeUndefined();
		expect(editorStore.activeTabPath).toBe(TASKS_VIRTUAL_PATH);
	});
});
