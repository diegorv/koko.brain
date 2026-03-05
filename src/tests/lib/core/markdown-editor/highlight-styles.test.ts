import { describe, it, expect } from 'vitest';
import { Compartment } from '@codemirror/state';
import { tags } from '@lezer/highlight';

import {
	markdownHighlight,
	codeHighlight,
	markdownLanguage,
	getLanguageEffects,
} from '$lib/core/markdown-editor/highlight-styles';

describe('markdownHighlight', () => {
	it('is a valid HighlightStyle instance', () => {
		expect(markdownHighlight).toBeDefined();
		expect(markdownHighlight.style).toBeTypeOf('function');
	});

	it('defines styles for heading1 through heading6', () => {
		const headingTags = [
			tags.heading1,
			tags.heading2,
			tags.heading3,
			tags.heading4,
			tags.heading5,
			tags.heading6,
		];
		for (const tag of headingTags) {
			const result = markdownHighlight.style([tag]);
			expect(result).not.toBeNull();
		}
	});

	it('defines a style for emphasis', () => {
		expect(markdownHighlight.style([tags.emphasis])).not.toBeNull();
	});

	it('defines a style for strong', () => {
		expect(markdownHighlight.style([tags.strong])).not.toBeNull();
	});

	it('defines a style for strikethrough', () => {
		expect(markdownHighlight.style([tags.strikethrough])).not.toBeNull();
	});

	it('defines a style for links', () => {
		expect(markdownHighlight.style([tags.link])).not.toBeNull();
	});

	it('defines a style for urls', () => {
		expect(markdownHighlight.style([tags.url])).not.toBeNull();
	});

	it('defines a style for monospace (inline code)', () => {
		expect(markdownHighlight.style([tags.monospace])).not.toBeNull();
	});

	it('defines a style for quote', () => {
		expect(markdownHighlight.style([tags.quote])).not.toBeNull();
	});

	it('defines a style for list', () => {
		expect(markdownHighlight.style([tags.list])).not.toBeNull();
	});

	it('defines a style for meta', () => {
		expect(markdownHighlight.style([tags.meta])).not.toBeNull();
	});

	it('defines a style for processingInstruction', () => {
		expect(markdownHighlight.style([tags.processingInstruction])).not.toBeNull();
	});

	it('does not define styles for code-specific tags like keyword', () => {
		expect(markdownHighlight.style([tags.keyword])).toBeNull();
	});

	it('does not define styles for code-specific tags like typeName', () => {
		expect(markdownHighlight.style([tags.typeName])).toBeNull();
	});
});

describe('codeHighlight', () => {
	it('is a valid HighlightStyle instance', () => {
		expect(codeHighlight).toBeDefined();
		expect(codeHighlight.style).toBeTypeOf('function');
	});

	it('defines styles for keyword', () => {
		expect(codeHighlight.style([tags.keyword])).not.toBeNull();
	});

	it('defines styles for operator', () => {
		expect(codeHighlight.style([tags.operator])).not.toBeNull();
	});

	it('defines styles for typeName', () => {
		expect(codeHighlight.style([tags.typeName])).not.toBeNull();
	});

	it('defines styles for className', () => {
		expect(codeHighlight.style([tags.className])).not.toBeNull();
	});

	it('defines styles for string', () => {
		expect(codeHighlight.style([tags.string])).not.toBeNull();
	});

	it('defines styles for regexp', () => {
		expect(codeHighlight.style([tags.regexp])).not.toBeNull();
	});

	it('defines styles for number', () => {
		expect(codeHighlight.style([tags.number])).not.toBeNull();
	});

	it('defines styles for comment', () => {
		expect(codeHighlight.style([tags.comment])).not.toBeNull();
	});

	it('defines styles for variableName', () => {
		expect(codeHighlight.style([tags.variableName])).not.toBeNull();
	});

	it('defines styles for propertyName', () => {
		expect(codeHighlight.style([tags.propertyName])).not.toBeNull();
	});

	it('defines styles for punctuation', () => {
		expect(codeHighlight.style([tags.punctuation])).not.toBeNull();
	});

	it('defines styles for bool and null as literals', () => {
		expect(codeHighlight.style([tags.bool])).not.toBeNull();
		expect(codeHighlight.style([tags.null])).not.toBeNull();
	});

	it('defines styles for tagName (HTML)', () => {
		expect(codeHighlight.style([tags.tagName])).not.toBeNull();
	});

	it('defines styles for attributeName (HTML)', () => {
		expect(codeHighlight.style([tags.attributeName])).not.toBeNull();
	});

	it('defines styles for atom', () => {
		expect(codeHighlight.style([tags.atom])).not.toBeNull();
	});

	it('does not define styles for markdown-specific tags like heading1', () => {
		expect(codeHighlight.style([tags.heading1])).toBeNull();
	});

	it('does not define styles for markdown-specific tags like emphasis', () => {
		expect(codeHighlight.style([tags.emphasis])).toBeNull();
	});

	it('does not define styles for markdown-specific tags like strong', () => {
		expect(codeHighlight.style([tags.strong])).toBeNull();
	});
});

describe('markdownLanguage', () => {
	it('returns a LanguageSupport instance', () => {
		const lang = markdownLanguage();
		expect(lang).toBeDefined();
		expect(lang.language).toBeDefined();
		expect(lang.language.name).toBe('markdown');
	});

	it('returns a new instance on each call', () => {
		const a = markdownLanguage();
		const b = markdownLanguage();
		expect(a).not.toBe(b);
	});
});

describe('getLanguageEffects', () => {
	it('returns two effects for .md files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('note.md', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns two effects for .markdown files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('readme.markdown', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns two effects for .js files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('script.js', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns two effects for .ts files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('app.ts', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns two effects for .py files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('main.py', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns two effects for .rs files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('lib.rs', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('falls back to markdown for unknown extensions', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('data.xyz', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('falls back to markdown for files without extension', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('Makefile', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns StateEffect instances with reconfigure values', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('note.md', langComp, hlComp);
		for (const effect of effects) {
			expect(effect).toBeDefined();
			expect(effect.value).toBeDefined();
		}
	});

	it('returns two effects for .collection files (YAML)', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('database.collection', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns two effects for .canvas files (JSON)', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const effects = await getLanguageEffects('diagram.canvas', langComp, hlComp);
		expect(effects).toHaveLength(2);
	});

	it('returns code highlight (not markdown) for .collection files', async () => {
		const langComp = new Compartment();
		const hlComp = new Compartment();
		const baseEffects = await getLanguageEffects('database.collection', langComp, hlComp);

		const langComp2 = new Compartment();
		const hlComp2 = new Compartment();
		const mdEffects = await getLanguageEffects('note.md', langComp2, hlComp2);

		// .collection should use code highlight style, different from markdown
		expect(baseEffects[1].value).not.toBe(mdEffects[1].value);
	});

	it('returns different effects for markdown vs code files', async () => {
		const langComp1 = new Compartment();
		const hlComp1 = new Compartment();
		const mdEffects = await getLanguageEffects('note.md', langComp1, hlComp1);

		const langComp2 = new Compartment();
		const hlComp2 = new Compartment();
		const jsEffects = await getLanguageEffects('script.js', langComp2, hlComp2);

		// Both return 2 effects but with different reconfigure values
		expect(mdEffects).toHaveLength(2);
		expect(jsEffects).toHaveLength(2);
		// The reconfigure values should differ (different language + different highlight style)
		expect(mdEffects[0].value).not.toBe(jsEffects[0].value);
		expect(mdEffects[1].value).not.toBe(jsEffects[1].value);
	});
});
