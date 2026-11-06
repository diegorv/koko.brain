import { describe, it, expect, vi } from 'vitest';
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
import type { FrontmatterValue } from '#lib/types/vault-v2.types.js';

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

/**
 * Each row: a frontmatter block and the map Rust's `parse_frontmatter` projects
 * from it (keys canonical, last key wins, `null` for an empty value or a nested
 * map), which is what the bulk index hands the parsed extractors.
 */
const FRONTMATTER_SHAPES: [string, string, Record<string, FrontmatterValue>][] = [
	['a value on the next line', 'color:\n  blue', { _color: 'blue' }],
	['a title color on the next line', '_title_color:\n  blue', { _title_color: 'blue' }],
	['an icon on the next line', '_icon:\n  lucide:home', { _icon: 'lucide:home' }],
	['a bare icon on the next line', 'icon:\n  rocket', { _icon: 'rocket' }],
	['a flow list of colors', 'color: [red, blue]', { _color: ['red', 'blue'] }],
	['an empty flow list', 'color: []', { _color: [] }],
	['a flow list as icon', 'icon: [a]', { _icon: ['a'] }],
	['a block list as icon', 'icon:\n  - rocket', { _icon: ['rocket'] }],
	['a block list as color', '_color:\n  - red', { _color: ['red'] }],
	['a nested map as color', 'color:\n  a: b', { _color: null }],
	['an empty color', 'color:', { _color: null }],
	['an empty color before the next key', 'color:\nstatus: done', { _color: null, status: 'done' }],
	['an empty icon before a key named like a pack', '_icon:\nlucide: done', { _icon: null, lucide: 'done' }],
	['a comment as color', 'color: # c', { _color: null }],
	['a comment as icon', 'icon: # c', { _icon: null }],
	['a null color', 'color: ~', { _color: null }],
	['a spelled null color', 'color: null', { _color: null }],
	['a null icon', 'icon: ~', { _icon: null }],
	['an empty quoted color', 'color: ""', { _color: '' }],
	['a blank quoted title color', "title_color: '  '", { _title_color: '  ' }],
	['an empty quoted icon', '_icon: ""', { _icon: '' }],
	['only a comment', '# nothing here', {}],
	['a root that is a list', '- a\n- b', {}],
	['a root that is a scalar', 'color', {}],
	['a double-quoted color', '_color: "#ff0000"', { _color: '#ff0000' }],
	['a single-quoted title color', "_title_color: 'blue'", { _title_color: 'blue' }],
	['a color with padding inside its quotes', 'color: " red "', { _color: ' red ' }],
	['a quote inside a color', `color: "it's"`, { _color: "it's" }],
	['a quoted icon', '_icon: "lucide:star"', { _icon: 'lucide:star' }],
	['a single-quoted icon', "icon: 'feather:heart'", { _icon: 'feather:heart' }],
	['a color with a trailing comment', 'color: red # note', { _color: 'red' }],
	['a folded color', 'color: >-\n  red', { _color: 'red' }],
	['a number as color', 'color: 123', { _color: 123 }],
	['a float as title color', 'title_color: 1.5', { _title_color: 1.5 }],
	['a number as icon', 'icon: 5', { _icon: 5 }],
	['a boolean as color', 'color: true', { _color: true }],
	['a boolean as icon', '_icon: false', { _icon: false }],
	['a date as color', 'color: 2026-01-01', { _color: '2026-01-01' }],
	['a quoted number as color', 'color: "123"', { _color: '123' }],
	['CRLF line endings', 'title: x\r\n_icon: lucide:star\r\n_color: red\r\n_title_color: blue', { title: 'x', _icon: 'lucide:star', _color: 'red', _title_color: 'blue' }],
	['a CRLF value on the next line', 'color:\r\n  blue', { _color: 'blue' }],
	['a CRLF empty color before the next key', 'color:\r\nstatus: done', { _color: null, status: 'done' }],
	['both color spellings, alias last', '_color: red\ncolor: blue', { _color: 'blue' }],
	['both color spellings, alias first', 'color: blue\n_color: red', { _color: 'red' }],
	['both color spellings, the last one empty', '_color: red\ncolor:', { _color: null }],
	['both title color spellings', 'title_color: red\n_title_color: blue', { _title_color: 'blue' }],
	['both icon spellings, alias last', '_icon: lucide:star\nicon: rocket', { _icon: 'rocket' }],
	['both icon spellings, the last one rejected', 'icon: rocket\n_icon: mdi:home', { _icon: 'mdi:home' }],
	['one key twice', 'color: red\ncolor: blue', { _color: 'blue' }],
	['a rejected pack', '_icon: mdi:home', { _icon: 'mdi:home' }],
	['a quoted key', '"icon": rocket\n\'_color\': red', { _icon: 'rocket', _color: 'red' }],
	['a space before the colon', 'icon : rocket', { _icon: 'rocket' }],
	['an indented root', '  color: red\n  title: x', { _color: 'red', title: 'x' }],
	['a flow root', '{icon: rocket, color: red}', { _icon: 'rocket', _color: 'red' }],
	['an explicit key', '? color\n: red', { _color: 'red' }],
	['none of the keys', 'title: x\ntags: [a, b]', { title: 'x', tags: ['a', 'b'] }],
	['the keys inside a nested map only', 'meta:\n  icon: rocket\n  color: red', { meta: null }],
	['keys that only contain the names', 'icons: rocket\ncolors: red\nmy_icon: a', { icons: 'rocket', colors: 'red', my_icon: 'a' }],
];

describe('save-time and bulk extractors agree', () => {
	const note = (yaml: string) => {
		const eol = yaml.includes('\r\n') ? '\r\n' : '\n';
		return `---${eol}${yaml}${eol}---${eol}Body`;
	};

	it.each(FRONTMATTER_SHAPES)('on the icon of %s', (_label, yaml, projected) => {
		expect(extractIconFromFrontmatter(note(yaml))).toEqual(extractIconFromParsedFrontmatter(projected));
	});

	it.each(FRONTMATTER_SHAPES)('on the colors of %s', (_label, yaml, projected) => {
		expect(extractIconColorsFromFrontmatter(note(yaml))).toEqual(extractIconColorsFromParsedFrontmatter(projected));
	});

	it('reads a value on the next line', () => {
		expect(extractIconColorsFromFrontmatter('---\ncolor:\n  blue\n---')).toEqual({ color: 'blue' });
		expect(extractIconFromFrontmatter('---\n_icon:\n  lucide:home\n---')).toEqual({ iconPack: 'lucide', iconName: 'home' });
	});

	it.each([
		['a list', 'color: [red, blue]'],
		['an empty list', 'color: []'],
		['a comment', 'color: # c'],
		['a null', 'color: ~'],
	])('reads no color from %s', (_label, yaml) => {
		expect(extractIconColorsFromFrontmatter(note(yaml))).toEqual({});
	});

	it('reads no icon from a list', () => {
		expect(extractIconFromFrontmatter(note('icon: [a]'))).toBeNull();
	});

	it.each([
		['a line YAML rejects', 'title: foo: bar\n_icon: lucide:star\n_color: red\n_title_color: blue', { iconPack: 'lucide', iconName: 'star' }, { color: 'red', titleColor: 'blue' }],
		['an unclosed list', 'tags: [a, b\n_icon: lucide:star\ncolor: red', { iconPack: 'lucide', iconName: 'star' }, { color: 'red' }],
		['tab indentation', 'icon:\n\t- rocket\ncolor: red', null, { color: 'red' }],
		['an alias with no anchor', 'color: *missing\nicon: rocket', { iconPack: 'lucide', iconName: 'rocket' }, {}],
	])('reads the icon keys, without throwing, from frontmatter with %s', (_label, yaml, icon, colors) => {
		expect(extractIconFromFrontmatter(note(yaml))).toEqual(icon);
		expect(extractIconColorsFromFrontmatter(note(yaml))).toEqual(colors);
	});

	it.each([
		['a colon in a value', 'title: Meeting: Q3'],
		['an unclosed list', 'tags: [a, b'],
		['an unterminated quote', 'title: "oops'],
		['an at sign', 'author: @me'],
		['a backtick', 'cmd: `ls`'],
		['a percent sign', 'pct: %foo'],
		['text after a list', 'title: [x] y'],
		['text after a quote', 'title: "a" b'],
		['a Templater form', 'title: <% tp.system.prompt("Title: ") %>'],
	])('keeps the icon and colors when YAML rejects %s', (_label, badLine) => {
		const yaml = `${badLine}\n_icon: lucide:star\n_color: red\n_title_color: blue`;
		expect(extractIconFromFrontmatter(note(yaml))).toEqual({ iconPack: 'lucide', iconName: 'star' });
		expect(extractIconColorsFromFrontmatter(note(yaml))).toEqual({ color: 'red', titleColor: 'blue' });
	});

	// What `parse_yaml_lines` in src-tauri/src/vault/parsing.rs projects for each block.
	const REJECTED = 'title: Meeting: Q3';
	const LINE_SHAPES: [string, string, Record<string, FrontmatterValue>][] = [
		['the aliases', 'icon: rocket\ncolor: red\ntitle_color: blue', { _icon: 'rocket', _color: 'red', _title_color: 'blue' }],
		['double quotes', '_color: "#ff0000"\n_icon: "lucide:star"', { _color: '#ff0000', _icon: 'lucide:star' }],
		['single quotes', "color: 'red'", { _color: 'red' }],
		['a lone quote', 'color: "', { _color: '"' }],
		['mismatched quotes', 'color: "red\'', { _color: '"red\'' }],
		['a space before the colon', 'icon : rocket', { _icon: 'rocket' }],
		['CRLF line endings', '_icon: lucide:star\r\ncolor: red\r', { _icon: 'lucide:star', _color: 'red' }],
		['blank lines', '\n_icon: lucide:star\n\n   \ncolor: red', { _icon: 'lucide:star', _color: 'red' }],
		['one key twice', 'color: red\ncolor: blue', { _color: 'blue' }],
		['both spellings, alias last', '_color: red\ncolor: blue', { _color: 'blue' }],
		['both spellings, alias first', 'color: blue\n_color: red', { _color: 'red' }],
		['both spellings, the last one empty', '_color: red\ncolor:', { _color: null }],
		['both spellings, the last one a list', '_color: red\ncolor: [blue]', { _color: ['blue'] }],
		['an empty value', 'color:\nicon:', { _color: null, _icon: null }],
		['an empty quoted value', 'color: ""', { _color: '' }],
		['a list', 'color: [red, blue]\nicon: [a]', { _color: ['red', 'blue'], _icon: ['a'] }],
		['an unclosed list', 'color: [red, blue', { _color: ['red', 'blue'] }],
		['a block list', 'color:\n  - red\nicon:\n  - a', { _color: ['red'], _icon: ['a'] }],
		['a nested map', 'color:\n  dark: red', { _color: null }],
		['a null', 'color: null\nicon: ~', { _color: null, _icon: null }],
		['a boolean', 'color: true\nicon: False', { _color: true, _icon: false }],
		['a number', 'color: 5\nicon: 1.5\ntitle_color: -2', { _color: 5, _icon: 1.5, _title_color: -2 }],
		['a quoted scalar', 'color: "5"\ntitle_color: "true"', { _color: '5', _title_color: 'true' }],
		['a hex color with no quotes', 'color: #ff0000', { _color: '#ff0000' }],
		['a rejected pack', '_icon: mdi:home', { _icon: 'mdi:home' }],
		['the keys indented', '  icon: rocket\n\tcolor: red', {}],
		['keys that only contain the names', 'icons: rocket\ncolors: red\nmy_icon: a', {}],
		['a quoted key', '"icon": rocket', {}],
		['no icon keys', 'color_notes', {}],
	];

	describe.each(LINE_SHAPES)('when YAML rejects the block, with %s', (_label, yaml, projected) => {
		const block = `${REJECTED}\n${yaml}`;

		it('reads the icon the bulk index reads', () => {
			expect(extractIconFromFrontmatter(note(block))).toEqual(extractIconFromParsedFrontmatter(projected));
		});

		it('reads the colors the bulk index reads', () => {
			expect(extractIconColorsFromFrontmatter(note(block))).toEqual(extractIconColorsFromParsedFrontmatter(projected));
		});
	});

	it.each([
		['a flow map', 'color: {a: b}\nicon: {a: b}'],
		['an alias', 'color: *x\nicon: *x'],
	])('reads nothing from %s in a block YAML rejects', (_label, yaml) => {
		const block = `${REJECTED}\n${yaml}`;
		expect(extractIconFromFrontmatter(note(block))).toBeNull();
		expect(extractIconColorsFromFrontmatter(note(block))).toEqual({});
	});

	it('does not log an unknown YAML tag on every save', () => {
		const warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
		try {
			expect(extractIconColorsFromFrontmatter(note('color: !custom red'))).toEqual({ color: 'red' });
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
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
	it('drops an unsafe _color and _title_color, and keeps a safe one', () => {
		const unsafe = 'red; background-image: url(https://example.com/x)';
		expect(extractIconColorsFromParsedFrontmatter({ _color: unsafe, _title_color: 'url(https://example.com/x)' })).toEqual({});
		expect(extractIconColorsFromParsedFrontmatter({ _color: unsafe, _title_color: 'blue' })).toEqual({ titleColor: 'blue' });
	});

	it('reaches a .view body too', () => {
		expect(extractViewIcon('color: "red; top: 0"\ntitle_color: blue\n')).toEqual({ titleColor: 'blue' });
	});

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

	it('passes modern color functions and a name containing "url" through', () => {
		expect(iconColorCss('color-mix(in oklch, red 50%, blue)')).toBe('color-mix(in oklch, red 50%, blue)');
		expect(iconColorCss('oklch(0.7 0.1 200 / 0.5)')).toBe('oklch(0.7 0.1 200 / 0.5)');
		expect(iconColorCss('var(--accent)')).toBe('var(--accent)');
		expect(iconColorCss('burlywood')).toBe('burlywood');
	});

	it.each([
		['a second declaration', 'red; background-image: url(https://example.com/x)'],
		['a bare semicolon', 'red;'],
		['a url function', 'url(https://example.com/x)'],
		['a url function in capitals', 'URL(https://example.com/x)'],
	])('rejects %s', (_name, value) => {
		expect(iconColorCss(value)).toBeUndefined();
	});

	it('leaves the icon uncolored when there is no color', () => {
		expect(iconColorCss(undefined)).toBeUndefined();
		expect(iconColorCss('')).toBeUndefined();
	});
});
