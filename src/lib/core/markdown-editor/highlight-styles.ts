import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import type { Compartment } from '@codemirror/state';
import type { StateEffect } from '@codemirror/state';

import { MathExtension } from './extensions/lezer/math-extension';
import { HighlightExtension } from './extensions/lezer/highlight-extension';
import { getLanguageForFile } from '$lib/core/filesystem/fs.logic';

/** Syntax highlight style for markdown documents (headings, emphasis, links, etc.) */
export const markdownHighlight = HighlightStyle.define([
	{ tag: tags.heading1, fontWeight: 'var(--heading-h1-font-weight, bold)', fontSize: 'var(--heading-h1-font-size, 1.6em)', color: 'var(--syntax-heading1)' },
	{ tag: tags.heading2, fontWeight: 'var(--heading-h2-font-weight, bold)', fontSize: 'var(--heading-h2-font-size, 1.4em)', color: 'var(--syntax-heading2)' },
	{ tag: tags.heading3, fontWeight: 'var(--heading-h3-font-weight, bold)', fontSize: 'var(--heading-h3-font-size, 1.2em)', color: 'var(--syntax-heading3)' },
	{ tag: tags.heading4, fontWeight: 'var(--heading-h4-font-weight, bold)', color: 'var(--syntax-heading4)' },
	{ tag: tags.heading5, fontWeight: 'var(--heading-h5-font-weight, bold)', color: 'var(--syntax-heading5)' },
	{ tag: tags.heading6, fontWeight: 'var(--heading-h6-font-weight, bold)', color: 'var(--syntax-heading6)' },
	{ tag: tags.emphasis, fontStyle: 'italic', color: 'var(--syntax-emphasis)' },
	{ tag: tags.strong, fontWeight: 'bold', color: 'var(--syntax-strong)' },
	{ tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--syntax-strikethrough)' },
	{ tag: tags.link, color: 'var(--syntax-link)', textDecoration: 'underline' },
	{ tag: tags.url, color: 'var(--syntax-url)' },
	{
		tag: tags.monospace,
		fontFamily: 'MonoLisa, ui-monospace, SFMono-Regular, Menlo, monospace',
		color: 'var(--syntax-code)',
		backgroundColor: 'var(--syntax-code-bg)',
	},
	{ tag: tags.quote, fontStyle: 'italic', color: 'var(--syntax-quote)' },
	{ tag: tags.list, color: 'var(--foreground)' },
	{ tag: tags.meta, color: 'var(--syntax-meta)' },
	{ tag: tags.comment, color: 'var(--syntax-meta)' },
	{ tag: tags.processingInstruction, color: 'var(--syntax-processing)' },
]);

/** Syntax highlight style for code files (JS, TS, Python, Rust, etc.) */
export const codeHighlight = HighlightStyle.define([
	{ tag: tags.keyword, color: 'var(--lp-syntax-keyword)' },
	{ tag: tags.operator, color: 'var(--lp-syntax-operator)' },
	{ tag: tags.typeName, color: 'var(--lp-syntax-type)' },
	{ tag: tags.className, color: 'var(--lp-syntax-type)' },
	{ tag: tags.function(tags.variableName), color: 'var(--lp-syntax-function)' },
	{ tag: tags.definition(tags.variableName), color: 'var(--lp-syntax-function)' },
	{ tag: tags.variableName, color: 'var(--lp-syntax-variable)' },
	{ tag: tags.propertyName, color: 'var(--lp-syntax-property)' },
	{ tag: tags.string, color: 'var(--lp-syntax-string)' },
	{ tag: tags.regexp, color: 'var(--lp-syntax-string)' },
	{ tag: tags.number, color: 'var(--lp-syntax-number)' },
	{ tag: tags.bool, color: 'var(--lp-syntax-literal)' },
	{ tag: tags.null, color: 'var(--lp-syntax-literal)' },
	{ tag: tags.comment, color: 'var(--lp-syntax-comment)', fontStyle: 'italic' },
	{ tag: tags.meta, color: 'var(--lp-syntax-meta)' },
	{ tag: tags.tagName, color: 'var(--lp-syntax-tag)' },
	{ tag: tags.attributeName, color: 'var(--lp-syntax-attr)' },
	{ tag: tags.attributeValue, color: 'var(--lp-syntax-string)' },
	{ tag: tags.punctuation, color: 'var(--lp-syntax-punctuation)' },
	{ tag: tags.atom, color: 'var(--lp-syntax-builtin)' },
	{ tag: tags.self, color: 'var(--lp-syntax-keyword)' },
]);

/** Default markdown language extension with GFM, math, and highlight support */
export function markdownLanguage() {
	return markdown({ codeLanguages: languages, extensions: [GFM, MathExtension, HighlightExtension] });
}

/**
 * Returns the StateEffect[] to reconfigure language parser and highlight style
 * for the given file. Returns null if async loading is needed (code files).
 */
export async function getLanguageEffects(
	fileName: string,
	languageCompartment: Compartment,
	highlightStyleCompartment: Compartment,
): Promise<StateEffect<unknown>[]> {
	const langDesc = getLanguageForFile(fileName);
	if (!langDesc) {
		return [
			languageCompartment.reconfigure(markdownLanguage()),
			highlightStyleCompartment.reconfigure(syntaxHighlighting(markdownHighlight)),
		];
	}
	const langSupport = await langDesc.load();
	return [
		languageCompartment.reconfigure(langSupport),
		highlightStyleCompartment.reconfigure(syntaxHighlighting(codeHighlight)),
	];
}
