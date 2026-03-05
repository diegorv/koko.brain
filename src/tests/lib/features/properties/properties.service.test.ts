import { describe, it, expect, beforeEach } from 'vitest';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { propertiesStore } from '$lib/features/properties/properties.store.svelte';
import {
	updateProperty,
	renameProperty,
	removePropertyByKey,
	addNewProperty,
	parseAndSetProperties,
	consumeSkipNextParse,
	resetProperties,
} from '$lib/features/properties/properties.service';

/** Opens a tab with frontmatter content for testing */
function openTabWithContent(content: string) {
	editorStore.addTab({
		path: '/vault/test.md',
		name: 'test.md',
		content,
		savedContent: content,
	});
}

describe('updateProperty', () => {
	beforeEach(() => {
		editorStore.reset();
		propertiesStore.reset();
	});

	it('updates a property value and syncs to editor content', () => {
		openTabWithContent('---\ntitle: Old\n---\nBody');
		propertiesStore.setProperties([{ key: 'title', value: 'Old', type: 'text' }]);

		updateProperty('title', 'New');

		expect(propertiesStore.properties[0].value).toBe('New');
		expect(editorStore.activeTab?.content).toContain('title: New');
		expect(editorStore.activeTab?.content).toContain('Body');
	});

	it('updates property type when provided', () => {
		openTabWithContent('---\ncount: 5\n---\n');
		propertiesStore.setProperties([{ key: 'count', value: 5, type: 'number' }]);

		updateProperty('count', 'five', 'text');

		expect(propertiesStore.properties[0].type).toBe('text');
		expect(propertiesStore.properties[0].value).toBe('five');
	});

	it('sets skipNextParse flag after commit', () => {
		openTabWithContent('---\ntitle: Old\n---\n');
		propertiesStore.setProperties([{ key: 'title', value: 'Old', type: 'text' }]);

		updateProperty('title', 'New');

		expect(consumeSkipNextParse()).toBe(true);
		// Second call should return false (consumed)
		expect(consumeSkipNextParse()).toBe(false);
	});
});

describe('renameProperty', () => {
	beforeEach(() => {
		editorStore.reset();
		propertiesStore.reset();
	});

	it('renames a property key', () => {
		openTabWithContent('---\nold_key: value\n---\n');
		propertiesStore.setProperties([{ key: 'old_key', value: 'value', type: 'text' }]);

		const result = renameProperty('old_key', 'new_key');

		expect(result).toBe(true);
		expect(propertiesStore.properties[0].key).toBe('new_key');
		expect(editorStore.activeTab?.content).toContain('new_key: value');
	});

	it('returns false when new key already exists', () => {
		openTabWithContent('---\na: 1\nb: 2\n---\n');
		propertiesStore.setProperties([
			{ key: 'a', value: '1', type: 'text' },
			{ key: 'b', value: '2', type: 'text' },
		]);

		const result = renameProperty('a', 'b');

		expect(result).toBe(false);
		// Properties unchanged
		expect(propertiesStore.properties[0].key).toBe('a');
	});

	it('allows renaming to same key (no-op)', () => {
		openTabWithContent('---\ntitle: value\n---\n');
		propertiesStore.setProperties([{ key: 'title', value: 'value', type: 'text' }]);

		const result = renameProperty('title', 'title');

		expect(result).toBe(true);
		expect(propertiesStore.properties[0].key).toBe('title');
	});
});

describe('removePropertyByKey', () => {
	beforeEach(() => {
		editorStore.reset();
		propertiesStore.reset();
	});

	it('removes a property and updates content', () => {
		openTabWithContent('---\ntitle: Hello\ntags: [a]\n---\nBody');
		propertiesStore.setProperties([
			{ key: 'title', value: 'Hello', type: 'text' },
			{ key: 'tags', value: ['a'], type: 'list' },
		]);

		removePropertyByKey('title');

		expect(propertiesStore.properties).toHaveLength(1);
		expect(propertiesStore.properties[0].key).toBe('tags');
		expect(editorStore.activeTab?.content).not.toContain('title');
		expect(editorStore.activeTab?.content).toContain('Body');
	});

	it('removes last property and preserves body', () => {
		openTabWithContent('---\ntitle: Hello\n---\nBody text');
		propertiesStore.setProperties([{ key: 'title', value: 'Hello', type: 'text' }]);

		removePropertyByKey('title');

		expect(propertiesStore.properties).toHaveLength(0);
		expect(editorStore.activeTab?.content).toBe('Body text');
	});
});

describe('addNewProperty', () => {
	beforeEach(() => {
		editorStore.reset();
		propertiesStore.reset();
	});

	it('adds a new empty text property', () => {
		openTabWithContent('---\ntitle: Hello\n---\nBody');
		propertiesStore.setProperties([{ key: 'title', value: 'Hello', type: 'text' }]);

		const result = addNewProperty('author');

		expect(result).toBe(true);
		expect(propertiesStore.properties).toHaveLength(2);
		const added = propertiesStore.properties.find((p) => p.key === 'author');
		expect(added?.value).toBe('');
		expect(added?.type).toBe('text');
		expect(editorStore.activeTab?.content).toContain('author:');
	});

	it('returns false for empty key', () => {
		openTabWithContent('---\ntitle: Hello\n---\n');
		propertiesStore.setProperties([{ key: 'title', value: 'Hello', type: 'text' }]);

		expect(addNewProperty('')).toBe(false);
		expect(addNewProperty('   ')).toBe(false);
		expect(propertiesStore.properties).toHaveLength(1);
	});

	it('returns false for duplicate key', () => {
		openTabWithContent('---\ntitle: Hello\n---\n');
		propertiesStore.setProperties([{ key: 'title', value: 'Hello', type: 'text' }]);

		const result = addNewProperty('title');

		expect(result).toBe(false);
		expect(propertiesStore.properties).toHaveLength(1);
	});

	it('trims key before adding', () => {
		openTabWithContent('---\ntitle: Hello\n---\n');
		propertiesStore.setProperties([{ key: 'title', value: 'Hello', type: 'text' }]);

		const result = addNewProperty('  author  ');

		expect(result).toBe(true);
		expect(propertiesStore.properties.find((p) => p.key === 'author')).toBeDefined();
	});
});

describe('parseAndSetProperties', () => {
	beforeEach(() => {
		propertiesStore.reset();
	});

	it('parses frontmatter and sets properties in store', () => {
		parseAndSetProperties('---\ntitle: Hello\ntags: [a, b]\n---\nBody');

		expect(propertiesStore.properties).toHaveLength(2);
		expect(propertiesStore.properties[0].key).toBe('title');
		expect(propertiesStore.properties[1].key).toBe('tags');
	});

	it('sets empty array when no frontmatter', () => {
		parseAndSetProperties('No frontmatter here');

		expect(propertiesStore.properties).toEqual([]);
	});
});

describe('consumeSkipNextParse', () => {
	beforeEach(() => {
		editorStore.reset();
		propertiesStore.reset();
		// Reset the flag by calling resetProperties
		resetProperties();
	});

	it('returns false when no edit was made', () => {
		expect(consumeSkipNextParse()).toBe(false);
	});

	it('returns true after a property edit then false on second call', () => {
		openTabWithContent('---\ntitle: Old\n---\n');
		propertiesStore.setProperties([{ key: 'title', value: 'Old', type: 'text' }]);

		updateProperty('title', 'New');

		expect(consumeSkipNextParse()).toBe(true);
		expect(consumeSkipNextParse()).toBe(false);
	});
});

describe('resetProperties', () => {
	beforeEach(() => {
		editorStore.reset();
	});

	it('clears properties store and skip flag', () => {
		propertiesStore.setProperties([{ key: 'title', value: 'Hello', type: 'text' }]);
		// Set the skip flag by doing an edit
		openTabWithContent('---\ntitle: Hello\n---\n');
		updateProperty('title', 'New');

		resetProperties();

		expect(propertiesStore.properties).toEqual([]);
		expect(consumeSkipNextParse()).toBe(false);
	});
});
