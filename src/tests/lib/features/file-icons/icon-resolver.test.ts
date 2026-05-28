import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/features/file-icons/file-icons.icon-data', () => ({
	getIconSync: vi.fn(),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { resolveIconForPath, resolveIconForType } from '$lib/features/file-icons/icon-resolver';
import type { NormalizedIcon } from '$lib/features/file-icons/file-icons.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

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
		expect(result?.icon.name).toBe('star');
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
});
