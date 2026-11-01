import { describe, it, expect, beforeEach } from 'vitest';
import type { Component } from 'svelte';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { RailLensProvider, RailNavigator, RailTodaySection } from '#lib/features/rail-shell/rail-shell.types.js';

const Dummy = (() => {}) as unknown as Component;

const navigator = (id: string, label = id): RailNavigator => ({ id, label, icon: Dummy, component: Dummy });
const section = (id: string, label = id): RailTodaySection => ({ id, label, component: Dummy });
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
		expect(railRegistryStore.lensProviders[0].resolve({ kind: 'day' }, { entries: [], vaultPath: null, systemFolder: '' })?.label).toBe('New');

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
});
