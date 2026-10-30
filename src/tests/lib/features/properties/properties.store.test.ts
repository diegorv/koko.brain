import { describe, it, expect, beforeEach } from 'vitest';
import { propertiesStore } from '#lib/features/properties/properties.store.svelte.js';

describe('propertiesStore', () => {
	beforeEach(() => {
		propertiesStore.reset();
	});

	it('starts with empty properties and no source path', () => {
		expect(propertiesStore.properties).toEqual([]);
		expect(propertiesStore.sourcePath).toBeNull();
	});

	it('setProperties replaces properties list and records the source path', () => {
		const props = [{ key: 'title', value: 'Test', type: 'text' }] as any;
		propertiesStore.setProperties(props, '/vault/a.md');
		expect(propertiesStore.properties).toBe(props);
		expect(propertiesStore.sourcePath).toBe('/vault/a.md');

		propertiesStore.setProperties([], null);
		expect(propertiesStore.sourcePath).toBeNull();
	});

	it('reset clears properties and source path', () => {
		propertiesStore.setProperties([{ key: 'a' }] as any, '/vault/a.md');
		propertiesStore.reset();
		expect(propertiesStore.properties).toEqual([]);
		expect(propertiesStore.sourcePath).toBeNull();
	});
});
