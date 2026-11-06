// @vitest-environment jsdom
// jsdom makes vitest compile the store for the client, the runtime the app uses: `$state`
// proxies there, so an unregister that compared entries by identity would silently do nothing.
import { describe, it, expect, beforeEach } from 'vitest';
import type { Component } from 'svelte';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { RailAction, RailFolderCreator, RailLensProvider, RailNavigator, RailTodaySection } from '#lib/features/rail-shell/rail-shell.types.js';

const Dummy = (() => {}) as unknown as Component;

const navigator = (id: string, label = id): RailNavigator => ({ id, label, icon: Dummy, component: Dummy, lens: () => ({ kind: id }) });
const section = (id: string, label = id): RailTodaySection => ({ id, label, component: Dummy });
const creator = (id: string, label = id): RailFolderCreator => ({
	id,
	label,
	icon: Dummy,
	fileName: `Untitled.${id}`,
	create: async (dir) => `${dir}/Untitled.${id}`,
});
const action = (key: string, label = key): RailAction => ({ key, label, icon: 'lucide:sparkles', run: () => {} });
const provider = (kind: string, label = kind): RailLensProvider => ({
	kind,
	resolve: () => ({ label, rule: '', notes: [] }),
});

describe('railRegistryStore', () => {
	beforeEach(() => {
		railRegistryStore.reset();
	});

	it('starts empty', () => {
		expect(railRegistryStore.navigators).toEqual([]);
		expect(railRegistryStore.lensProviders).toEqual([]);
		expect(railRegistryStore.todaySections).toEqual([]);
		expect(railRegistryStore.folderCreators).toEqual([]);
		expect(railRegistryStore.actions).toEqual([]);
	});

	it('lists registered navigators in registration order and unregisters them', () => {
		const offCalendar = railRegistryStore.registerNavigator(navigator('calendar'));
		railRegistryStore.registerNavigator(navigator('files'));
		expect(railRegistryStore.navigators.map((n) => n.id)).toEqual(['calendar', 'files']);

		offCalendar();
		expect(railRegistryStore.navigators.map((n) => n.id)).toEqual(['files']);
	});

	it('replaces a navigator registered again under the same id', () => {
		railRegistryStore.registerNavigator(navigator('calendar', 'Old'));
		railRegistryStore.registerNavigator(navigator('calendar', 'New'));
		expect(railRegistryStore.navigators.map((n) => n.label)).toEqual(['New']);
	});

	it('registers and unregisters lens providers by kind', () => {
		railRegistryStore.registerLensProvider(provider('day', 'Old'));
		const off = railRegistryStore.registerLensProvider(provider('day', 'New'));
		expect(railRegistryStore.lensProviders).toHaveLength(1);
		expect(railRegistryStore.lensProviders[0].resolve({ kind: 'day' }, { entries: [], vaultPath: null, systemFolder: '', typeMetadataMap: new Map(), fileTree: [] })?.label).toBe('New');

		off();
		expect(railRegistryStore.lensProviders).toEqual([]);
	});

	it('registers and unregisters Today sections', () => {
		const off = railRegistryStore.registerTodaySection(section('my-people'));
		expect(railRegistryStore.todaySections.map((s) => s.id)).toEqual(['my-people']);

		off();
		expect(railRegistryStore.todaySections).toEqual([]);
	});

	it('an unregister handed out before a replacement does not remove the replacement', () => {
		const offOld = railRegistryStore.registerTodaySection(section('my-people', 'Old'));
		railRegistryStore.registerTodaySection(section('my-people', 'New'));

		offOld();
		expect(railRegistryStore.todaySections.map((s) => s.label)).toEqual(['New']);
	});

	it('an unregister called twice is a no-op', () => {
		const off = railRegistryStore.registerNavigator(navigator('calendar'));
		off();
		off();
		expect(railRegistryStore.navigators).toEqual([]);
	});

	it('registers folder creators in order, replaces one by id and unregisters it', async () => {
		const offKanban = railRegistryStore.registerFolderCreator(creator('kanban', 'Old'));
		railRegistryStore.registerFolderCreator(creator('board'));
		railRegistryStore.registerFolderCreator(creator('kanban', 'New Kanban Board'));
		expect(railRegistryStore.folderCreators.map((c) => c.label)).toEqual(['board', 'New Kanban Board']);
		expect(await railRegistryStore.folderCreators[1].create('/vault/Work')).toBe('/vault/Work/Untitled.kanban');

		offKanban();
		expect(railRegistryStore.folderCreators.map((c) => c.id)).toEqual(['board', 'kanban']);
		railRegistryStore.reset();
		expect(railRegistryStore.folderCreators).toEqual([]);
	});

	it('unregisters the current folder creator', () => {
		const off = railRegistryStore.registerFolderCreator(creator('kanban'));
		off();
		expect(railRegistryStore.folderCreators).toEqual([]);
	});

	it('registers actions in order, replaces one by key, and unregisters only that entry by identity', () => {
		const offOld = railRegistryStore.registerAction(action('mod:hello:main', 'Old'));
		const offOther = railRegistryStore.registerAction(action('mod:other:main'));
		railRegistryStore.registerAction(action('mod:hello:main', 'Hello mod'));
		expect(railRegistryStore.actions.map((a) => [a.key, a.label])).toEqual([
			['mod:other:main', 'mod:other:main'],
			['mod:hello:main', 'Hello mod'],
		]);

		offOld();
		expect(railRegistryStore.actions.map((a) => a.label)).toEqual(['mod:other:main', 'Hello mod']);
		offOther();
		expect(railRegistryStore.actions.map((a) => a.key)).toEqual(['mod:hello:main']);
	});

	it('reset() also clears the actions', () => {
		railRegistryStore.registerAction(action('mod:hello:main'));
		railRegistryStore.reset();
		expect(railRegistryStore.actions).toEqual([]);
	});
});
