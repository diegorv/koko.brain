// @vitest-environment jsdom
// The app shell over the real stores, on the Types rail item: the Types navigator's
// rows follow the vault entries and the tree's `.view` files, and nothing else in
// the tree.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua and the resizable panes observe sizes; jsdom has no ResizeObserver.
globalThis.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ setBadgeCount: vi.fn(async () => {}) }) }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import AppShell from '#lib/app/AppShell.svelte';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { TYPES_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { entryV2 } from '../../fixtures/vault-entries.fixture';

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
const folder = (path: string, children: FileTreeNode[]): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: true, children });

const ENTRIES = [entryV2('/vault/Project.md', { isA: 'Type' }), entryV2('/vault/alpha.md', { isA: 'Project' })];

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

async function mountShell() {
	const children = createRawSnippet(() => ({ render: () => '<div></div>' }));
	component = mount(AppShell, { target, props: { children } });
	await settle();
}

const projectCount = () =>
	target.querySelector('[data-types-navigator-row="Project"] [data-types-navigator-count]')?.textContent?.trim();
const viewPaths = () =>
	[...target.querySelectorAll<HTMLElement>('[data-types-navigator-view]')].map((el) => el.dataset.typesNavigatorView);

beforeEach(() => {
	clearLocalStorage();
	settingsStore.reset();
	typeDefinitionsStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	settingsStore.updateLayout({ railItem: TYPES_RAIL_ITEM });
	typeDefinitionsStore.setEntries(ENTRIES);
	typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(ENTRIES));
	fsStore.setFileTree([file('/vault/Project.md'), file('/vault/alpha.md'), file('/vault/Open.view')]);
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
});

describe('AppShell Types navigator rows', () => {
	it('shows the views from the tree and the types with their counts', async () => {
		await mountShell();
		expect(viewPaths()).toEqual(['/vault/Open.view']);
		expect(projectCount()).toBe('1');
	});

	it('does not rebuild the rows when the tree is replaced with the same view files', async () => {
		const entriesRead = vi.spyOn(typeDefinitionsStore, 'entries', 'get');
		await mountShell();
		entriesRead.mockClear();

		fsStore.setFileTree([folder('/vault/Work', [file('/vault/Work/new.md')]), file('/vault/Project.md'), file('/vault/alpha.md'), file('/vault/Open.view')]);
		await settle();
		expect(entriesRead).not.toHaveBeenCalled();
		expect(viewPaths()).toEqual(['/vault/Open.view']);
		entriesRead.mockRestore();
	});

	it('picks up a new view file in the tree', async () => {
		await mountShell();
		fsStore.setFileTree([file('/vault/Project.md'), file('/vault/alpha.md'), file('/vault/Open.view'), folder('/vault/Work', [file('/vault/Work/Board.view')])]);
		await settle();
		expect(viewPaths()).toEqual(['/vault/Work/Board.view', '/vault/Open.view']);
	});

	it('counts a new note of a type', async () => {
		await mountShell();
		const next = [...ENTRIES, entryV2('/vault/beta.md', { isA: 'Project' })];
		typeDefinitionsStore.setEntries(next);
		await settle();
		expect(projectCount()).toBe('2');
	});
});
