import { describe, it, expect } from 'vitest';
import {
	isTypeDefinition,
	extractTypeMetadata,
	buildTypeMetadataMap,
	getTypeMetadataFallback,
	validateTypeName,
	rewriteTypeInFrontmatter,
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
		expect(meta.path).toBe('/vault/Project.md');
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

	it('captures the source entry path so callers can locate the on-disk definition', () => {
		const entry = entryV2('/vault/_system/types/Person.md', {
			title: 'Person',
			isA: 'Type',
			frontmatter: { _sidebar_label: 'People' } as NoteEntryV2['frontmatter'],
		});
		const meta = extractTypeMetadata(entry);
		expect(meta.name).toBe('Person');
		expect(meta.path).toBe('/vault/_system/types/Person.md');
		expect(meta.sidebarLabel).toBe('People');
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
		expect(meta.path).toBe('/vault/Project.md');
	});

	it('falls back to builtin for known types', () => {
		const meta = getTypeMetadataFallback('Project', new Map());
		expect(meta.icon).toBe('rocket');
		expect(meta.color).toBe('red');
		expect(meta.path).toBeNull();
	});

	it('falls back to defaults for unknown types', () => {
		const meta = getTypeMetadataFallback('Widget', new Map());
		expect(meta.icon).toBe('file-text');
		expect(meta.name).toBe('Widget');
		expect(meta.sidebarLabel).toBe('Widgets');
		expect(meta.path).toBeNull();
	});
});

describe('validateTypeName', () => {
	const existing = ['Project', 'Task'];

	it('returns null for a valid, non-colliding name', () => {
		expect(validateTypeName('Sprint', existing)).toBeNull();
	});

	it('rejects empty and whitespace-only names', () => {
		expect(validateTypeName('', existing)).toBe('Type name is required');
		expect(validateTypeName('   ', existing)).toBe('Type name is required');
	});

	it('rejects names that are not legal file names', () => {
		expect(validateTypeName('a/b', existing)).toBe('Invalid type name');
		expect(validateTypeName('.hidden', existing)).toBe('Invalid type name');
	});

	it('rejects collisions with existing type names', () => {
		expect(validateTypeName('Project', existing)).toBe('A type with this name already exists');
	});

	it('rejects collisions case-insensitively', () => {
		expect(validateTypeName('project', existing)).toBe('A type with this name already exists');
	});

	it('trims surrounding whitespace before validating', () => {
		expect(validateTypeName('  Sprint  ', existing)).toBeNull();
		expect(validateTypeName('  Project  ', existing)).toBe('A type with this name already exists');
	});

	it('accepts any name when no types exist yet', () => {
		expect(validateTypeName('Sprint', [])).toBeNull();
	});
});

describe('rewriteTypeInFrontmatter', () => {
	it('rewrites a bare _type value only inside the frontmatter', () => {
		const content = '---\n_type: Project\ntitle: x\n---\n\n# Body\n_type: Project\n';
		expect(rewriteTypeInFrontmatter(content, 'Project', 'Initiative')).toBe(
			'---\n_type: Initiative\ntitle: x\n---\n\n# Body\n_type: Project\n',
		);
	});

	it('rewrites the bare type alias key', () => {
		expect(rewriteTypeInFrontmatter('---\ntype: Project\n---\nbody\n', 'Project', 'Initiative')).toBe(
			'---\ntype: Initiative\n---\nbody\n',
		);
	});

	it('preserves quote style', () => {
		expect(rewriteTypeInFrontmatter('---\n_type: "Project"\n---\n', 'Project', 'Initiative')).toBe(
			'---\n_type: "Initiative"\n---\n',
		);
		expect(rewriteTypeInFrontmatter("---\n_type: 'Project'\n---\n", 'Project', 'Initiative')).toBe(
			"---\n_type: 'Initiative'\n---\n",
		);
	});

	it('matches values with the is_a casing rule (first letter uppercased)', () => {
		expect(rewriteTypeInFrontmatter('---\n_type: project\n---\n', 'Project', 'Initiative')).toBe(
			'---\n_type: Initiative\n---\n',
		);
	});

	it('returns null without frontmatter', () => {
		expect(rewriteTypeInFrontmatter('# body\n_type: Project\n', 'Project', 'X')).toBeNull();
	});

	it('returns null when the value differs', () => {
		expect(rewriteTypeInFrontmatter('---\n_type: Task\n---\n', 'Project', 'X')).toBeNull();
	});

	it('ignores indented nested keys', () => {
		expect(rewriteTypeInFrontmatter('---\nmeta:\n  type: Project\n---\n', 'Project', 'X')).toBeNull();
	});

	it('preserves CRLF line endings', () => {
		expect(rewriteTypeInFrontmatter('---\r\n_type: Project\r\n---\r\nbody', 'Project', 'Initiative')).toBe(
			'---\r\n_type: Initiative\r\n---\r\nbody',
		);
	});
});
