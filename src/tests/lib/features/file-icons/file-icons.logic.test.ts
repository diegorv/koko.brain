import { describe, it, expect } from 'vitest';
import {
	filterIcons,
	addRecentIcon,
	extractIconFromFrontmatter,
	extractIconColorsFromFrontmatter,
	extractIconFromParsedFrontmatter,
	extractIconColorsFromParsedFrontmatter,
	parseIconValuePermissive,
} from '$lib/features/file-icons/file-icons.logic';
import type { NormalizedIcon, RecentIcon } from '$lib/features/file-icons/file-icons.types';

function makeIcon(name: string, pack = 'lucide', keywords: string[] = []): NormalizedIcon {
	return { name, pack: pack as NormalizedIcon['pack'], svgContent: '<path/>', viewBox: '0 0 24 24', keywords };
}

function makeRecent(pack: string, name: string): RecentIcon {
	return { iconPack: pack as RecentIcon['iconPack'], iconName: name };
}

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

describe('parseIconValuePermissive', () => {
	it('parses pack:name format', () => {
		expect(parseIconValuePermissive('lucide:star')).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('parses bare name as lucide', () => {
		expect(parseIconValuePermissive('rocket')).toEqual({ iconPack: 'lucide', iconName: 'rocket' });
	});

	it('returns null for empty string', () => {
		expect(parseIconValuePermissive('')).toBeNull();
		expect(parseIconValuePermissive('  ')).toBeNull();
	});

	it('returns null for invalid pack with colon', () => {
		expect(parseIconValuePermissive('badpack:star')).toBeNull();
	});

	it('trims whitespace', () => {
		expect(parseIconValuePermissive('  lucide:star  ')).toEqual({ iconPack: 'lucide', iconName: 'star' });
		expect(parseIconValuePermissive('  rocket  ')).toEqual({ iconPack: 'lucide', iconName: 'rocket' });
	});

	it('handles emoji pack', () => {
		expect(parseIconValuePermissive('emoji:🎯')).toEqual({ iconPack: 'emoji', iconName: '🎯' });
	});
});

describe('extractIconFromFrontmatter', () => {
	it('extracts _icon from frontmatter', () => {
		const content = '---\ntitle: My Note\n_icon: lucide:star\n---\n# Hello';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('extracts legacy icon (no underscore) from frontmatter', () => {
		const content = '---\ntitle: My Note\nicon: lucide:star\n---\n# Hello';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('extracts bare icon name as lucide', () => {
		const content = '---\n_icon: rocket\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'rocket' });
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
		const content = '---\n_icon: invalidpack:star\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toBeNull();
	});

	it('returns null for missing icon name after pack', () => {
		const content = '---\n_icon: lucide:\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toBeNull();
	});

	it('handles all valid pack ids', () => {
		const packs = [
			'lucide', 'feather', 'fa-solid', 'fa-regular', 'fa-brands',
			'octicons', 'boxicons', 'coolicons', 'simple-icons', 'tabler', 'remix', 'emoji',
		];
		for (const pack of packs) {
			const content = `---\n_icon: ${pack}:test-icon\n---\nBody`;
			const result = extractIconFromFrontmatter(content);
			expect(result).toEqual({ iconPack: pack, iconName: 'test-icon' });
		}
	});

	it('handles quoted values', () => {
		const content = '---\n_icon: "lucide:star"\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('handles single-quoted values', () => {
		const content = "---\n_icon: 'feather:heart'\n---\nBody";
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'feather', iconName: 'heart' });
	});

	it('handles Windows line endings', () => {
		const content = '---\r\ntitle: Test\r\n_icon: lucide:star\r\n---\r\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('handles emoji pack', () => {
		const content = '---\n_icon: emoji:🎯\n---\nBody';
		const result = extractIconFromFrontmatter(content);

		expect(result).toEqual({ iconPack: 'emoji', iconName: '🎯' });
	});
});

describe('extractIconColorsFromFrontmatter', () => {
	it('extracts _color and _title_color', () => {
		const content = '---\n_color: "#ff0000"\n_title_color: "#00ff00"\n---\nBody';
		const result = extractIconColorsFromFrontmatter(content);

		expect(result).toEqual({ color: '#ff0000', titleColor: '#00ff00' });
	});

	it('extracts only _color when _title_color absent', () => {
		const content = '---\n_color: "#ff0000"\n---\nBody';
		const result = extractIconColorsFromFrontmatter(content);

		expect(result).toEqual({ color: '#ff0000' });
	});

	it('extracts only _title_color when _color absent', () => {
		const content = '---\n_title_color: blue\n---\nBody';
		const result = extractIconColorsFromFrontmatter(content);

		expect(result).toEqual({ titleColor: 'blue' });
	});

	it('returns empty object when no color fields', () => {
		const content = '---\ntitle: test\n---\nBody';
		const result = extractIconColorsFromFrontmatter(content);

		expect(result).toEqual({});
	});

	it('returns empty object when no frontmatter', () => {
		expect(extractIconColorsFromFrontmatter('# No frontmatter')).toEqual({});
	});

	it('handles unquoted color values', () => {
		const content = '---\n_color: red\n---\nBody';
		const result = extractIconColorsFromFrontmatter(content);

		expect(result).toEqual({ color: 'red' });
	});

	it('reads legacy color (no underscore) via alias regex', () => {
		const content = '---\ncolor: "#abc"\n---\nBody';
		const result = extractIconColorsFromFrontmatter(content);

		expect(result).toEqual({ color: '#abc' });
	});
});

describe('extractIconFromParsedFrontmatter', () => {
	it('extracts a valid pack:name from _icon key', () => {
		const result = extractIconFromParsedFrontmatter({ _icon: 'lucide:star' });
		expect(result).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('extracts bare name as lucide from _icon key', () => {
		const result = extractIconFromParsedFrontmatter({ _icon: 'rocket' });
		expect(result).toEqual({ iconPack: 'lucide', iconName: 'rocket' });
	});

	it('returns null when _icon key is missing', () => {
		const result = extractIconFromParsedFrontmatter({ title: 'No icon' });
		expect(result).toBeNull();
	});

	it('returns null when _icon value is not a string', () => {
		const result = extractIconFromParsedFrontmatter({ _icon: ['lucide', 'star'] });
		expect(result).toBeNull();
	});

	it('returns null when pack is invalid', () => {
		const result = extractIconFromParsedFrontmatter({ _icon: 'unknown-pack:star' });
		expect(result).toBeNull();
	});

	it('handles emoji pack', () => {
		const result = extractIconFromParsedFrontmatter({ _icon: 'emoji:🎯' });
		expect(result).toEqual({ iconPack: 'emoji', iconName: '🎯' });
	});

	it('returns null for empty frontmatter', () => {
		expect(extractIconFromParsedFrontmatter({})).toBeNull();
	});
});

describe('extractIconColorsFromParsedFrontmatter', () => {
	it('extracts _color and _title_color', () => {
		const result = extractIconColorsFromParsedFrontmatter({ _color: '#ff0000', _title_color: '#00ff00' });
		expect(result).toEqual({ color: '#ff0000', titleColor: '#00ff00' });
	});

	it('extracts only _color when _title_color absent', () => {
		const result = extractIconColorsFromParsedFrontmatter({ _color: 'red' });
		expect(result).toEqual({ color: 'red' });
	});

	it('extracts only _title_color when _color absent', () => {
		const result = extractIconColorsFromParsedFrontmatter({ _title_color: 'blue' });
		expect(result).toEqual({ titleColor: 'blue' });
	});

	it('returns empty object when no color fields', () => {
		expect(extractIconColorsFromParsedFrontmatter({ title: 'test' })).toEqual({});
	});

	it('returns empty object for empty frontmatter', () => {
		expect(extractIconColorsFromParsedFrontmatter({})).toEqual({});
	});

	it('ignores empty string values', () => {
		const result = extractIconColorsFromParsedFrontmatter({ _color: '', _title_color: '  ' });
		expect(result).toEqual({});
	});

	it('trims whitespace from color values', () => {
		const result = extractIconColorsFromParsedFrontmatter({ _color: '  #ff0000  ' });
		expect(result).toEqual({ color: '#ff0000' });
	});

	it('ignores non-string values', () => {
		const result = extractIconColorsFromParsedFrontmatter({ _color: 42, _title_color: null });
		expect(result).toEqual({});
	});
});
