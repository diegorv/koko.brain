import { describe, it, expect, beforeEach } from 'vitest';
import {
	isTypeDefinition,
	extractTypeMetadata,
	buildTypeMetadataMap,
	sameTypeMetadata,
	buildTypeNoteDir,
	getTypeMetadataFallback,
	validateTypeName,
	validateViewName,
	typeNameTakenMessage,
	rewriteTypeInFrontmatter,
} from '#lib/features/type-definitions/type-definitions.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
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
			_folder: 'Projects',
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
		expect(meta.folder).toBe('Projects');
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

	it('reads _hub: true as a hub type', () => {
		expect(extractTypeMetadata(typeDefEntry('Project', { _hub: true })).hub).toBe(true);
	});

	it('defaults hub to false when _hub is absent or not a boolean', () => {
		expect(extractTypeMetadata(typeDefEntry('Project', {})).hub).toBe(false);
		expect(extractTypeMetadata(typeDefEntry('Project', { _hub: 'yes' })).hub).toBe(false);
		expect(extractTypeMetadata(typeDefEntry('Project', { _hub: false })).hub).toBe(false);
	});

	it('defaults folder to null when _folder is absent', () => {
		const meta = extractTypeMetadata(typeDefEntry('Project', {}));
		expect(meta.folder).toBeNull();
	});

	it('reads _folder as the type base folder', () => {
		const meta = extractTypeMetadata(typeDefEntry('Person', { _folder: 'People/Contacts' }));
		expect(meta.folder).toBe('People/Contacts');
	});

	it('names a lowercase definition the way Rust groups its notes', () => {
		const meta = extractTypeMetadata(typeDefEntry('book'));
		expect(meta.name).toBe('Book');
		expect(meta.sidebarLabel).toBe('Books');
		expect(meta.path).toBe('/vault/book.md');
	});

	it('reads the builtin fallback of a lowercase builtin name', () => {
		expect(extractTypeMetadata(typeDefEntry('project')).icon).toBe('rocket');
	});
});

describe('buildTypeMetadataMap', () => {
	it('keys a lowercase definition by its normalized name', () => {
		const map = buildTypeMetadataMap([typeDefEntry('book')]);
		expect([...map.keys()]).toEqual(['Book']);
		expect(map.get('Book')).toMatchObject({ name: 'Book', sidebarLabel: 'Books', path: '/vault/book.md' });
	});

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

	describe('two definitions of one type name', () => {
		beforeEach(() => {
			typeDefinitionsStore.reset();
		});

		it('picks the file the store path index picks when titles differ only in case', () => {
			const entries = [
				entryV2('/vault/a/book.md', { isA: 'Type', frontmatter: { _icon: 'book' } }),
				entryV2('/vault/b/Book.md', { isA: 'Type', frontmatter: { _icon: 'library' } }),
			];
			typeDefinitionsStore.setEntries(entries);

			const meta = buildTypeMetadataMap(entries).get('Book');
			expect(meta?.path).toBe(typeDefinitionsStore.getTypeDefinitionPath('Book'));
			expect(meta).toMatchObject({ path: '/vault/a/book.md', icon: 'book' });
		});

		it('picks the file the store path index picks when titles are identical', () => {
			const entries = [
				entryV2('/vault/a/Book.md', { isA: 'Type', frontmatter: { _icon: 'book' } }),
				entryV2('/vault/b/Book.md', { isA: 'Type', frontmatter: { _icon: 'library' } }),
			];
			typeDefinitionsStore.setEntries(entries);

			const meta = buildTypeMetadataMap(entries).get('Book');
			expect(meta?.path).toBe(typeDefinitionsStore.getTypeDefinitionPath('Book'));
			expect(meta).toMatchObject({ path: '/vault/a/Book.md', icon: 'book' });
		});
	});
});

describe('buildTypeNoteDir', () => {
	it('returns the vault root when both folders are empty', () => {
		expect(buildTypeNoteDir('/vault', '', null)).toBe('/vault');
		expect(buildTypeNoteDir('/vault', null, '')).toBe('/vault');
	});

	it('appends only the type folder when no base folder is set', () => {
		expect(buildTypeNoteDir('/vault', '', 'Project')).toBe('/vault/Project');
	});

	it('appends only the base folder when the type has no folder', () => {
		expect(buildTypeNoteDir('/vault', 'Notes', null)).toBe('/vault/Notes');
	});

	it('nests type folder under base folder', () => {
		expect(buildTypeNoteDir('/vault', 'Notes', 'Project')).toBe('/vault/Notes/Project');
	});

	it('strips surrounding slashes and whitespace from both segments', () => {
		expect(buildTypeNoteDir('/vault', ' /Notes/ ', '/People/Contacts/')).toBe(
			'/vault/Notes/People/Contacts',
		);
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

describe('validateViewName', () => {
	const existing = ['All projects', 'Reading'];

	it('returns null for a valid name no view shows', () => {
		expect(validateViewName('Open tasks', existing)).toBeNull();
	});

	it('gives the file-name messages for a blank name, a leading dot, control and forbidden characters', () => {
		expect(validateViewName('', existing)).toBe('Name cannot be empty');
		expect(validateViewName('   ', existing)).toBe('Name cannot be empty');
		expect(validateViewName('.hidden', existing)).toBe('Name cannot start with "."');
		expect(validateViewName(' .x', existing)).toBe('Name cannot start with "."');
		expect(validateViewName('a\u0007b', existing)).toBe('Name cannot contain control characters');
		expect(validateViewName('a/b', existing)).toBe('Name cannot contain "/"');
		expect(validateViewName('say "hi"', existing)).toBe('Name cannot contain """');
	});

	it('refuses a name a view already shows, trimmed and case-insensitive', () => {
		expect(validateViewName('All projects', existing)).toBe('A view with this name already exists');
		expect(validateViewName('  all PROJECTS  ', existing)).toBe('A view with this name already exists');
		expect(validateViewName('Reading', ['  reading  '])).toBe('A view with this name already exists');
	});

	it('accepts any valid name when there are no views', () => {
		expect(validateViewName('Reading', [])).toBeNull();
	});

	it('skips the file-name rules for a label that never becomes a file name, and keeps the others', () => {
		expect(validateViewName('Q1: plan', existing, false)).toBeNull();
		expect(validateViewName('.hidden "a/b"', existing, false)).toBeNull();
		expect(validateViewName('Q1: plan', existing)).toBe('Name cannot contain ":"');
		expect(validateViewName('   ', existing, false)).toBe('Name cannot be empty');
		expect(validateViewName(' reading ', existing, false)).toBe('A view with this name already exists');
	});
});

describe('typeNameTakenMessage', () => {
	it('names the taken root entry and the type', () => {
		expect(typeNameTakenMessage('event.md', 'Event')).toBe(
			'"event.md" already exists in the vault root and is not the "Event" type yet. If it is a note that should be, add "_type: Type" to its frontmatter; otherwise rename it.',
		);
	});

	it('keeps an empty entry name quoted', () => {
		expect(typeNameTakenMessage('', 'Event')).toContain('"" already exists');
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

describe('sameTypeMetadata', () => {
	it('is true for two empty maps', () => {
		expect(sameTypeMetadata(new Map(), new Map())).toBe(true);
	});

	it('is true for separately built maps with equal metadata', () => {
		const a = buildTypeMetadataMap([typeDefEntry('Project', { _icon: 'folder' })]);
		const b = buildTypeMetadataMap([typeDefEntry('Project', { _icon: 'folder' })]);
		expect(sameTypeMetadata(a, b)).toBe(true);
	});

	it('is false when a field differs', () => {
		const a = buildTypeMetadataMap([typeDefEntry('Project', { _icon: 'folder' })]);
		const b = buildTypeMetadataMap([typeDefEntry('Project', { _icon: 'star' })]);
		expect(sameTypeMetadata(a, b)).toBe(false);
	});

	it('is false when a type was added or removed', () => {
		const one = buildTypeMetadataMap([typeDefEntry('Project')]);
		const two = buildTypeMetadataMap([typeDefEntry('Project'), typeDefEntry('Person')]);
		expect(sameTypeMetadata(one, two)).toBe(false);
		expect(sameTypeMetadata(two, one)).toBe(false);
	});

	it('is false when a type was renamed with the same size', () => {
		const a = buildTypeMetadataMap([typeDefEntry('Project')]);
		const b = buildTypeMetadataMap([typeDefEntry('Topic')]);
		expect(sameTypeMetadata(a, b)).toBe(false);
	});
});
