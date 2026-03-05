import { describe, it, expect } from 'vitest';
import {
	setFileIcon,
	removeFileIcon,
	getFileIcon,
	updateFileIconPaths,
	filterIcons,
	addRecentIcon,
	extractIconFromFrontmatter,
} from '$lib/features/file-icons/file-icons.logic';
import type { FileIconEntry, NormalizedIcon, RecentIcon } from '$lib/features/file-icons/file-icons.types';

function makeEntry(path: string, pack = 'lucide', name = 'star', color?: string): FileIconEntry {
	return { path, iconPack: pack as FileIconEntry['iconPack'], iconName: name, color };
}

function makeIcon(name: string, pack = 'lucide', keywords: string[] = []): NormalizedIcon {
	return { name, pack: pack as NormalizedIcon['pack'], svgContent: '<path/>', viewBox: '0 0 24 24', keywords };
}

function makeRecent(pack: string, name: string): RecentIcon {
	return { iconPack: pack as RecentIcon['iconPack'], iconName: name };
}

describe('setFileIcon', () => {
	it('adds a new icon entry', () => {
		const result = setFileIcon([], '/vault/a.md', 'lucide', 'star');

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ path: '/vault/a.md', iconPack: 'lucide', iconName: 'star', color: undefined, textColor: undefined });
	});

	it('replaces an existing entry for the same path', () => {
		const entries = [makeEntry('/vault/a.md', 'lucide', 'star')];
		const result = setFileIcon(entries, '/vault/a.md', 'feather', 'heart', '#ff0000');

		expect(result).toHaveLength(1);
		expect(result[0].iconPack).toBe('feather');
		expect(result[0].iconName).toBe('heart');
		expect(result[0].color).toBe('#ff0000');
	});

	it('preserves other entries', () => {
		const entries = [makeEntry('/vault/a.md'), makeEntry('/vault/b.md')];
		const result = setFileIcon(entries, '/vault/a.md', 'emoji', '🎯');

		expect(result).toHaveLength(2);
		expect(result.find((e) => e.path === '/vault/b.md')).toBeDefined();
	});

	it('stores textColor when provided', () => {
		const result = setFileIcon([], '/vault/a.md', 'lucide', 'star', '#ff0000', '#00ff00');

		expect(result).toHaveLength(1);
		expect(result[0].color).toBe('#ff0000');
		expect(result[0].textColor).toBe('#00ff00');
	});

	it('stores textColor as undefined when not provided', () => {
		const result = setFileIcon([], '/vault/a.md', 'lucide', 'star', '#ff0000');

		expect(result[0].textColor).toBeUndefined();
	});
});

describe('removeFileIcon', () => {
	it('removes an entry by path', () => {
		const entries = [makeEntry('/vault/a.md'), makeEntry('/vault/b.md')];
		const result = removeFileIcon(entries, '/vault/a.md');

		expect(result).toHaveLength(1);
		expect(result[0].path).toBe('/vault/b.md');
	});

	it('returns unchanged array if path not found', () => {
		const entries = [makeEntry('/vault/a.md')];
		const result = removeFileIcon(entries, '/vault/missing.md');

		expect(result).toHaveLength(1);
	});
});

describe('getFileIcon', () => {
	it('returns the entry for a matching path', () => {
		const entries = [makeEntry('/vault/a.md', 'lucide', 'star')];
		const result = getFileIcon(entries, '/vault/a.md');

		expect(result).toBeDefined();
		expect(result!.iconName).toBe('star');
	});

	it('returns undefined for a non-matching path', () => {
		const result = getFileIcon([], '/vault/a.md');

		expect(result).toBeUndefined();
	});
});

describe('updateFileIconPaths', () => {
	it('updates an exact path match', () => {
		const entries = [makeEntry('/vault/old.md')];
		const result = updateFileIconPaths(entries, '/vault/old.md', '/vault/new.md');

		expect(result[0].path).toBe('/vault/new.md');
	});

	it('updates child paths under a renamed directory', () => {
		const entries = [makeEntry('/vault/folder/note.md')];
		const result = updateFileIconPaths(entries, '/vault/folder', '/vault/renamed');

		expect(result[0].path).toBe('/vault/renamed/note.md');
	});

	it('leaves unrelated paths unchanged', () => {
		const entries = [makeEntry('/vault/other.md')];
		const result = updateFileIconPaths(entries, '/vault/folder', '/vault/renamed');

		expect(result[0].path).toBe('/vault/other.md');
	});

	it('handles deeply nested child paths', () => {
		const entries = [makeEntry('/vault/a/b/c.md')];
		const result = updateFileIconPaths(entries, '/vault/a', '/vault/x');

		expect(result[0].path).toBe('/vault/x/b/c.md');
	});
});

describe('filterIcons', () => {
	const icons = [
		makeIcon('star', 'lucide', ['favorite']),
		makeIcon('heart', 'lucide', ['love', 'like']),
		makeIcon('arrow-right', 'feather', ['direction']),
	];

	it('returns all icons for empty query', () => {
		expect(filterIcons(icons, '')).toHaveLength(3);
		expect(filterIcons(icons, '  ')).toHaveLength(3);
	});

	it('filters by name', () => {
		const result = filterIcons(icons, 'star');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('star');
	});

	it('filters by keyword', () => {
		const result = filterIcons(icons, 'love');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('heart');
	});

	it('is case-insensitive', () => {
		const result = filterIcons(icons, 'STAR');
		expect(result).toHaveLength(1);
	});

	it('matches partial name', () => {
		const result = filterIcons(icons, 'arrow');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('arrow-right');
	});

	it('returns empty for no matches', () => {
		expect(filterIcons(icons, 'zzz')).toHaveLength(0);
	});
});

describe('addRecentIcon', () => {
	it('adds an icon to an empty list', () => {
		const result = addRecentIcon([], 'lucide', 'star');

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('adds to the front of the list', () => {
		const recent = [makeRecent('lucide', 'star')];
		const result = addRecentIcon(recent, 'feather', 'heart');

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ iconPack: 'feather', iconName: 'heart' });
		expect(result[1]).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('moves an existing icon to the front (deduplicates)', () => {
		const recent = [makeRecent('lucide', 'star'), makeRecent('feather', 'heart')];
		const result = addRecentIcon(recent, 'feather', 'heart');

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ iconPack: 'feather', iconName: 'heart' });
		expect(result[1]).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('caps at 20 items', () => {
		const recent: RecentIcon[] = Array.from({ length: 20 }, (_, i) => makeRecent('lucide', `icon-${i}`));
		const result = addRecentIcon(recent, 'feather', 'new-icon');

		expect(result).toHaveLength(20);
		expect(result[0]).toEqual({ iconPack: 'feather', iconName: 'new-icon' });
		expect(result[19]).toEqual({ iconPack: 'lucide', iconName: 'icon-18' });
	});

	it('distinguishes same name in different packs', () => {
		const recent = [makeRecent('lucide', 'star')];
		const result = addRecentIcon(recent, 'feather', 'star');

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ iconPack: 'feather', iconName: 'star' });
	});
});

describe('extractIconFromFrontmatter', () => {
	it('extracts icon from frontmatter', () => {
		const content = '---\ntitle: My Note\nicon: lucide:star\n---\n# Hello';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('returns null for no frontmatter', () => {
		const result = extractIconFromFrontmatter('# Just a heading');

		expect(result).toBeNull();
	});

	it('returns null for frontmatter without icon property', () => {
		const content = '---\ntitle: My Note\ntags: [a, b]\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toBeNull();
	});

	it('returns null for invalid pack name', () => {
		const content = '---\nicon: invalidpack:star\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toBeNull();
	});

	it('returns null for missing icon name', () => {
		const content = '---\nicon: lucide:\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toBeNull();
	});

	it('returns null for missing colon separator', () => {
		const content = '---\nicon: star\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toBeNull();
	});

	it('handles all valid pack ids', () => {
		const packs = [
			'lucide', 'feather', 'fa-solid', 'fa-regular', 'fa-brands',
			'octicons', 'boxicons', 'coolicons', 'simple-icons', 'tabler', 'remix', 'emoji',
		];
		for (const pack of packs) {
			const content = `---\nicon: ${pack}:test-icon\n---\nBody`;
			const result = extractIconFromFrontmatter(content);
			expect(result).toEqual({ iconPack: pack, iconName: 'test-icon' });
		}
	});

	it('handles quoted values', () => {
		const content = '---\nicon: "lucide:star"\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('handles single-quoted values', () => {
		const content = "---\nicon: 'feather:heart'\n---\nBody";
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'feather', iconName: 'heart' });
	});

	it('handles Windows line endings', () => {
		const content = '---\r\ntitle: Test\r\nicon: lucide:star\r\n---\r\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('handles emoji pack', () => {
		const content = '---\nicon: emoji:🎯\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'emoji', iconName: '🎯' });
	});
});
