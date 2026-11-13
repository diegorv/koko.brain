import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { registerAppPorts, unregisterAppPorts } from '#lib/app/boot.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { resolveIconForPath, resolveIconForType } from '#lib/features/file-icons/icon-resolver.js';
import type { NormalizedIcon } from '#lib/features/file-icons/file-icons.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

const mockIcon = (name: string): NormalizedIcon => ({
	name,
	pack: 'lucide',
	svgContent: '<path/>',
	viewBox: '0 0 24 24',
	keywords: [name],
});

const makeEntry = (overrides: Partial<NoteEntryV2>): NoteEntryV2 => ({
	path: '/vault/test.md',
	title: 'test',
	frontmatter: {},
	outgoingLinks: [],
	tags: [],
	modifiedAt: 0,
	createdAt: 0,
	size: 0,
	wordCount: 0,
	snippet: '',
	tasks: [],
	isA: null,
	organized: false,
	archived: false,
	favorite: false,
	belongsTo: [],
	relatedTo: [],
	hasMany: [],
	relationships: {},
	...overrides,
});

// The type lookup is the app's real wiring over the real typeDefinitionsStore.
beforeAll(() => registerAppPorts());
afterAll(() => unregisterAppPorts());

describe('resolveIconForPath', () => {
	beforeEach(() => {
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReset();
	});

	it('returns undefined when no icon found', () => {
		expect(resolveIconForPath('/vault/note.md')).toBeUndefined();
	});

	it('priority 1: returns frontmatter icon', () => {
		const icon = mockIcon('star');
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/note.md', { iconPack: 'lucide', iconName: 'star', color: '#ff0000' }]]),
		);
		vi.mocked(getIconSync).mockReturnValue(icon);

		const result = resolveIconForPath('/vault/note.md');
		expect(result).toEqual({ icon, color: '#ff0000', titleColor: undefined });
	});

	it('priority 2: returns type definition icon when no frontmatter icon', () => {
		const icon = mockIcon('rocket');
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/my-project.md', title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', color: 'blue' }]]),
		);
		vi.mocked(getIconSync).mockReturnValue(icon);

		const result = resolveIconForPath('/vault/my-project.md');
		expect(result).toEqual({ icon, color: 'blue', titleColor: undefined });
	});

	it('follows typeDefinitionsStore entry changes', () => {
		const rocket = mockIcon('rocket');
		const book = mockIcon('book');
		fileIconsStore.setFrontmatterIcons(
			new Map([
				['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket' }],
				['/vault/Book.md', { iconPack: 'lucide', iconName: 'book' }],
			]),
		);
		vi.mocked(getIconSync).mockImplementation((_pack, name) => (name === 'rocket' ? rocket : name === 'book' ? book : undefined));
		const types = [
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/Book.md', title: 'Book', isA: 'Type' }),
		];

		expect(resolveIconForPath('/vault/note.md')).toBeUndefined();

		typeDefinitionsStore.setEntries([...types, makeEntry({ path: '/vault/note.md', title: 'note', isA: 'Project' })]);
		expect(resolveIconForPath('/vault/note.md')?.icon?.name).toBe('rocket');

		typeDefinitionsStore.setEntries([...types, makeEntry({ path: '/vault/note.md', title: 'note', isA: 'Book' })]);
		expect(resolveIconForPath('/vault/note.md')?.icon?.name).toBe('book');

		typeDefinitionsStore.setEntries(types);
		expect(resolveIconForPath('/vault/note.md')).toBeUndefined();
	});

	it('frontmatter takes priority over type definition icon', () => {
		const starIcon = mockIcon('star');
		const rocketIcon = mockIcon('rocket');
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/my-project.md', title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([
				['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket' }],
				['/vault/my-project.md', { iconPack: 'lucide', iconName: 'star' }],
			]),
		);
		vi.mocked(getIconSync).mockImplementation((_pack, name) => {
			if (name === 'star') return starIcon;
			if (name === 'rocket') return rocketIcon;
			return undefined;
		});

		const result = resolveIconForPath('/vault/my-project.md');
		expect(result?.icon?.name).toBe('star');
	});

	it('returns undefined when getIconSync returns undefined (pack not loaded)', () => {
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/note.md', { iconPack: 'tabler', iconName: 'star' }]]),
		);
		vi.mocked(getIconSync).mockReturnValue(undefined);

		expect(resolveIconForPath('/vault/note.md')).toBeUndefined();
	});

	it('skips type resolution for Type definition entries', () => {
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
		]);
		vi.mocked(getIconSync).mockReturnValue(undefined);

		const result = resolveIconForPath('/vault/Project.md');
		expect(result).toBeUndefined();
		expect(getIconSync).not.toHaveBeenCalled();
	});

	it('skips type resolution for untyped files', () => {
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/note.md', title: 'note', isA: null }),
		]);
		vi.mocked(getIconSync).mockReturnValue(undefined);

		const result = resolveIconForPath('/vault/note.md');
		expect(result).toBeUndefined();
	});

	it('includes titleColor from frontmatter ref', () => {
		const icon = mockIcon('star');
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/note.md', { iconPack: 'lucide', iconName: 'star', color: '#aaa', titleColor: '#bbb' }]]),
		);
		vi.mocked(getIconSync).mockReturnValue(icon);

		const result = resolveIconForPath('/vault/note.md');
		expect(result?.color).toBe('#aaa');
		expect(result?.titleColor).toBe('#bbb');
	});

	it('returns the colors with no icon when the file only sets colors', () => {
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/note.md', { titleColor: '#bbb' }]]));

		const result = resolveIconForPath('/vault/note.md');
		expect(result?.icon).toBeUndefined();
		expect(result?.titleColor).toBe('#bbb');
		expect(getIconSync).not.toHaveBeenCalled();
	});

	it('keeps the colors when the icon name is not in its pack', () => {
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Meeting.md', { iconPack: 'lucide', iconName: 'calendar-blank', color: 'yellow', titleColor: '#3b82f6' }]]),
		);
		vi.mocked(getIconSync).mockReturnValue(undefined);

		expect(resolveIconForPath('/vault/Meeting.md')).toEqual({ icon: undefined, color: 'yellow', titleColor: '#3b82f6' });
	});

	it('inherits a text color from a type definition that has no icon', () => {
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/my-project.md', title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/Project.md', { titleColor: '#bbb' }]]));

		const result = resolveIconForPath('/vault/my-project.md');
		expect(result?.icon).toBeUndefined();
		expect(result?.titleColor).toBe('#bbb');
	});

	it('lays a file\'s own colors over the icon it inherits from its type', () => {
		const rocket = mockIcon('rocket');
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/my-project.md', title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([
				['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', color: 'blue', titleColor: '#aaa' }],
				['/vault/my-project.md', { titleColor: '#bbb' }],
			]),
		);
		vi.mocked(getIconSync).mockReturnValue(rocket);

		expect(resolveIconForPath('/vault/my-project.md')).toEqual({ icon: rocket, color: 'blue', titleColor: '#bbb' });
	});

	it('does not inherit a type\'s text color over a file\'s own icon', () => {
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/my-project.md', title: 'my-project', isA: 'Project' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([
				['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', titleColor: '#aaa' }],
				['/vault/my-project.md', { iconPack: 'lucide', iconName: 'star' }],
			]),
		);
		vi.mocked(getIconSync).mockReturnValue(mockIcon('star'));

		expect(resolveIconForPath('/vault/my-project.md')?.titleColor).toBeUndefined();
	});
});

describe('resolveIconForType', () => {
	beforeEach(() => {
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReset();
	});

	it('returns icon for defined type', () => {
		const icon = mockIcon('rocket');
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
		]);
		fileIconsStore.setFrontmatterIcons(
			new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket', color: 'blue' }]]),
		);
		vi.mocked(getIconSync).mockReturnValue(icon);

		const result = resolveIconForType('Project');
		expect(result).toEqual({ icon, color: 'blue', titleColor: undefined });
	});

	it('returns undefined for undefined type', () => {
		expect(resolveIconForType('NonExistent')).toBeUndefined();
	});

	it('returns undefined when type def has no frontmatter icon', () => {
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
		]);

		expect(resolveIconForType('Project')).toBeUndefined();
	});

	it('returns the colors of a type definition with no icon', () => {
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
		]);
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/Project.md', { color: 'blue', titleColor: '#bbb' }]]));

		expect(resolveIconForType('Project')).toEqual({ icon: undefined, color: 'blue', titleColor: '#bbb' });
	});
});

describe('without the type icon lookup', () => {
	beforeEach(() => {
		unregisterAppPorts();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		vi.mocked(getIconSync).mockReset();
		typeDefinitionsStore.setEntries([
			makeEntry({ path: '/vault/Project.md', title: 'Project', isA: 'Type' }),
			makeEntry({ path: '/vault/my-project.md', title: 'my-project', isA: 'Project' }),
		]);
	});

	afterEach(() => registerAppPorts());

	it('resolveIconForPath still returns the frontmatter icon', () => {
		const star = mockIcon('star');
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/my-project.md', { iconPack: 'lucide', iconName: 'star' }]]));
		vi.mocked(getIconSync).mockReturnValue(star);

		expect(resolveIconForPath('/vault/my-project.md')?.icon?.name).toBe('star');
	});

	it('resolveIconForPath returns undefined for a typed note, without throwing', () => {
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket' }]]));
		vi.mocked(getIconSync).mockReturnValue(mockIcon('rocket'));

		expect(() => resolveIconForPath('/vault/my-project.md')).not.toThrow();
		expect(resolveIconForPath('/vault/my-project.md')).toBeUndefined();
	});

	it('resolveIconForType returns undefined', () => {
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/Project.md', { iconPack: 'lucide', iconName: 'rocket' }]]));
		vi.mocked(getIconSync).mockReturnValue(mockIcon('rocket'));

		expect(resolveIconForType('Project')).toBeUndefined();
	});
});
