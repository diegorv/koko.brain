import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import {
	APP_SANS_FONT_STACK,
	MONO_FONT_STACK,
	editorFontFamily,
	quoteFontFamily,
} from '#lib/utils/font-stacks.js';

describe('font stacks', () => {
	it('monospace stack starts with MonoLisa and ends with the generic family', () => {
		expect(MONO_FONT_STACK).toBe('MonoLisa, ui-monospace, SFMono-Regular, Menlo, monospace');
	});

	it('app sans stack matches the body font-family in app.css', () => {
		// CSS cannot import the TS constant, so this keeps the two in sync.
		const css = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
		const body = css.match(/body\s*\{[^}]*?font-family:\s*([^;]+);/);
		expect(body).not.toBeNull();
		expect(APP_SANS_FONT_STACK).toBe(body![1].trim());
	});
});

describe('quoteFontFamily', () => {
	it.each([
		['plain name', 'Menlo', '"Menlo"'],
		['name with spaces', 'iA Writer Duo S', '"iA Writer Duo S"'],
		['name with a digit-led word', 'Font Awesome 6 Free', '"Font Awesome 6 Free"'],
		['name with a symbol', 'Foo+Bar', '"Foo+Bar"'],
		['name with inner double quotes', 'My "Fancy" Font', '"My \\"Fancy\\" Font"'],
		['name with a backslash', 'Back\\slash', '"Back\\\\slash"'],
		['already double-quoted name', '"Font Awesome 6 Free"', '"Font Awesome 6 Free"'],
		['already single-quoted name', "'Font Awesome 6 Free'", "'Font Awesome 6 Free'"],
		['two quoted strings are not one quoted name', '"Foo" "Bar"', '"\\"Foo\\" \\"Bar\\""'],
		['comma list kept as written', 'Menlo, "Fira Code", monospace', 'Menlo, "Fira Code", monospace'],
		['generic family stays unquoted', 'monospace', 'monospace'],
		['generic ui family stays unquoted', 'ui-serif', 'ui-serif'],
		['surrounding whitespace trimmed', '  Menlo  ', '"Menlo"'],
		['empty string', '', ''],
		['whitespace only', '   ', ''],
	])('%s', (_label, input, expected) => {
		expect(quoteFontFamily(input)).toBe(expected);
	});
});

describe('editorFontFamily', () => {
	it('quotes a single name and appends the app sans stack', () => {
		expect(editorFontFamily('iA Writer Duo S')).toBe(`"iA Writer Duo S", ${APP_SANS_FONT_STACK}`);
	});

	it('keeps a typed list as written and appends the app sans stack', () => {
		expect(editorFontFamily('Menlo, monospace')).toBe(`Menlo, monospace, ${APP_SANS_FONT_STACK}`);
	});

	it('falls back to the app sans stack alone for an empty value', () => {
		expect(editorFontFamily('')).toBe(APP_SANS_FONT_STACK);
		expect(editorFontFamily('  ')).toBe(APP_SANS_FONT_STACK);
	});
});
