import { describe, it, expect } from 'vitest';
import {
	isTypeDefinition,
	extractTypeMetadata,
	buildTypeMetadataMap,
	getTypeMetadataFallback,
} from '$lib/features/type-definitions/type-definitions.logic';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function typeDefEntry(title: string, fm: Record<string, unknown> = {}): NoteEntryV2 {
	return entryV2(`/vault/${title}.md`, {
		title,
		isA: 'Type',
		frontmatter: fm as NoteEntryV2['frontmatter'],
	});
}

describe('isTypeDefinition', () => {
	it('returns true for is_a Type', () => {
		expect(isTypeDefinition(entryV2('/v/x.md', { isA: 'Type' }))).toBe(true);
	});

	it('returns false for other types', () => {
		expect(isTypeDefinition(entryV2('/v/x.md', { isA: 'Project' }))).toBe(false);
	});

	it('returns false for null is_a', () => {
		expect(isTypeDefinition(entryV2('/v/x.md'))).toBe(false);
	});
});

describe('extractTypeMetadata', () => {
	it('extracts all fields from frontmatter', () => {
		const entry = typeDefEntry('Project', {
			_icon: 'rocket',
			_color: 'red',
			_order: 1,
			_sidebar_label: 'Projects',
			_template: 'templates/project.md',
			_sort: 'status',
			_view: 'board',
			_visible: true,
			_list_properties_display: ['status', 'due'],
		});
		const meta = extractTypeMetadata(entry);
		expect(meta.name).toBe('Project');
		expect(meta.icon).toBe('rocket');
		expect(meta.color).toBe('red');
		expect(meta.order).toBe(1);
		expect(meta.sidebarLabel).toBe('Projects');
		expect(meta.template).toBe('templates/project.md');
		expect(meta.sort).toBe('status');
		expect(meta.view).toBe('board');
		expect(meta.visible).toBe(true);
		expect(meta.listPropertiesDisplay).toEqual(['status', 'due']);
	});

	it('falls back to builtin metadata for known types', () => {
		const entry = typeDefEntry('Project', {});
		const meta = extractTypeMetadata(entry);
		expect(meta.icon).toBe('rocket');
		expect(meta.color).toBe('red');
		expect(meta.order).toBe(1);
	});

	it('falls back to defaults for unknown types', () => {
		const entry = typeDefEntry('CustomType', {});
		const meta = extractTypeMetadata(entry);
		expect(meta.icon).toBe('file-text');
		expect(meta.color).toBe('gray');
		expect(meta.order).toBe(50);
		expect(meta.sidebarLabel).toBe('CustomTypes');
	});

	it('uses explicit frontmatter over builtins', () => {
		const entry = typeDefEntry('Project', { _icon: 'star', _order: 99 });
		const meta = extractTypeMetadata(entry);
		expect(meta.icon).toBe('star');
		expect(meta.order).toBe(99);
	});
});

describe('buildTypeMetadataMap', () => {
	it('builds map from type definition entries only', () => {
		const entries = [
			typeDefEntry('Project', { _icon: 'rocket' }),
			entryV2('/vault/task.md', { isA: 'Project', title: 'My Task' }),
			typeDefEntry('Person', { _icon: 'users' }),
		];
		const map = buildTypeMetadataMap(entries);
		expect(map.size).toBe(2);
		expect(map.get('Project')?.icon).toBe('rocket');
		expect(map.get('Person')?.icon).toBe('users');
	});

	it('returns empty map when no type definitions', () => {
		const entries = [
			entryV2('/v/a.md', { isA: 'Project' }),
			entryV2('/v/b.md'),
		];
		expect(buildTypeMetadataMap(entries).size).toBe(0);
	});
});

describe('getTypeMetadataFallback', () => {
	it('returns from map when present', () => {
		const map = new Map([['Project', extractTypeMetadata(typeDefEntry('Project', { _icon: 'star' }))]]);
		const meta = getTypeMetadataFallback('Project', map);
		expect(meta.icon).toBe('star');
	});

	it('falls back to builtin for known types', () => {
		const meta = getTypeMetadataFallback('Project', new Map());
		expect(meta.icon).toBe('rocket');
		expect(meta.color).toBe('red');
	});

	it('falls back to defaults for unknown types', () => {
		const meta = getTypeMetadataFallback('Widget', new Map());
		expect(meta.icon).toBe('file-text');
		expect(meta.name).toBe('Widget');
		expect(meta.sidebarLabel).toBe('Widgets');
	});
});
