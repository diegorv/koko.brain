import { describe, it, expect, beforeEach } from 'vitest';
import { propertiesStore } from '$lib/features/properties/properties.store.svelte';

describe('propertiesStore', () => {
	beforeEach(() => {
		propertiesStore.reset();
	});

	it('starts with empty properties', () => {
		expect(propertiesStore.properties).toEqual([]);
	});

	it('setProperties replaces properties list', () => {
		const props = [{ key: 'title', value: 'Test', type: 'text' }] as any;
		propertiesStore.setProperties(props);
		expect(propertiesStore.properties).toBe(props);
	});

	it('reset clears properties', () => {
		propertiesStore.setProperties([{ key: 'a' }] as any);
		propertiesStore.reset();
		expect(propertiesStore.properties).toEqual([]);
	});
});
