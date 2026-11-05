import { describe, it, expect } from 'vitest';
import {
	filterIcons,
	addRecentIcon,
	extractIconFromFrontmatter,
	extractIconColorsFromFrontmatter,
	extractIconFromParsedFrontmatter,
	extractIconColorsFromParsedFrontmatter,
	extractViewIcon,
	parseIconValuePermissive,
	iconColorCss,
} from '#lib/features/file-icons/file-icons.logic.js';
import type { NormalizedIcon, RecentIcon } from '#lib/features/file-icons/file-icons.types.js';

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

	it.each([
		['a list item', '---\nicon:\n  - rocket\n---\nBody'],
		['a list item, CRLF', '---\r\nicon:\r\n  - rocket\r\n---\r\nBody'],
		['the next key, named like a pack', '---\n_icon:\nlucide: done\n---\nBody'],
		['the next key', '---\nicon:\nstatus: done\n---\nBody'],
	])('does not read %s as the value of an empty icon', (_label, content) => {
		expect(extractIconFromFrontmatter(content)).toBeNull();
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
	it.each([
		['the next key', '---\ncolor:\nstatus: done\n---\nBody'],
		['a list item', '---\n_color:\n  - red\n---\nBody'],
		['the next key, with spaces after the colon', '---\ncolor:   \nstatus: done\n---\nBody'],
		['the next key, CRLF', '---\r\ncolor:\r\nstatus: done\r\n---\r\nBody'],
		['the next key of a title color', '---\ntitle_color:\nstatus: done\n---\nBody'],
		['a list item of a title color', '---\n_title_color:\n  - red\n---\nBody'],
	])('does not read %s as the value of an empty color', (_label, content) => {
		expect(extractIconColorsFromFrontmatter(content)).toEqual({});
	});

	it('still reads a color on the next line of an empty title color', () => {
		const content = '---\n_title_color:\n_color: red\n---\nBody';

		expect(extractIconColorsFromFrontmatter(content)).toEqual({ color: 'red' });
	});

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

describe('extractViewIcon', () => {
	it('reads _icon, _color and _title_color from a bare YAML body', () => {
		const yaml = '_sidebar_label: Projects\n_icon: lucide:rocket\n_color: red\n_title_color: "#fff"\nviews:\n  - type: table\n';
		expect(extractViewIcon(yaml)).toEqual({ iconPack: 'lucide', iconName: 'rocket', color: 'red', titleColor: '#fff' });
	});

	it('treats a bare icon name as lucide and leaves absent colors out', () => {
		expect(extractViewIcon('_icon: star\n')).toEqual({ iconPack: 'lucide', iconName: 'star' });
	});

	it('reads the unprefixed icon, color and title_color aliases', () => {
		expect(extractViewIcon('icon: lucide:rocket\ncolor: red\ntitle_color: blue\n')).toEqual({
			iconPack: 'lucide',
			iconName: 'rocket',
			color: 'red',
			titleColor: 'blue',
		});
	});

	it('mixes a canonical _icon with an unprefixed color', () => {
		expect(extractViewIcon('_icon: lucide:star\ncolor: green\n')).toEqual({
			iconPack: 'lucide',
			iconName: 'star',
			color: 'green',
		});
	});

	it('lets the later key win when a key and its alias both appear, as Rust does', () => {
		expect(extractViewIcon('_icon: lucide:star\nicon: lucide:rocket\ncolor: green\n')).toEqual({
			iconPack: 'lucide',
			iconName: 'rocket',
			color: 'green',
		});
	});

	it('returns null when the body has no _icon and no colors', () => {
		expect(extractViewIcon('_sidebar_label: Projects\n')).toBeNull();
	});

	it('returns the colors when the body has no _icon', () => {
		expect(extractViewIcon('_sidebar_label: Projects\n_color: red\n_title_color: blue\n')).toEqual({
			color: 'red',
			titleColor: 'blue',
		});
	});

	it('returns null for an empty body', () => {
		expect(extractViewIcon('')).toBeNull();
	});

	it('returns null without throwing when the body does not parse', () => {
		expect(() => extractViewIcon('_icon: [unclosed\n  - : :\n')).not.toThrow();
		expect(extractViewIcon('_icon: [unclosed\n  - : :\n')).toBeNull();
	});

	it('returns null when the body is not a mapping', () => {
		expect(extractViewIcon('- lucide:star\n')).toBeNull();
		expect(extractViewIcon('just a scalar\n')).toBeNull();
	});
});

describe('iconColorCss', () => {
	it('maps a palette name to its theme token', () => {
		expect(iconColorCss('green')).toBe('var(--type-green)');
		expect(iconColorCss('gray')).toBe('var(--type-gray)');
		expect(iconColorCss('Teal')).toBe('var(--type-teal)');
	});

	it('passes a hex or any other CSS value through unchanged', () => {
		expect(iconColorCss('#4ade80')).toBe('#4ade80');
		expect(iconColorCss('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
		expect(iconColorCss('crimson')).toBe('crimson');
	});

	it('leaves the icon uncolored when there is no color', () => {
		expect(iconColorCss(undefined)).toBeUndefined();
		expect(iconColorCss('')).toBeUndefined();
	});
});
