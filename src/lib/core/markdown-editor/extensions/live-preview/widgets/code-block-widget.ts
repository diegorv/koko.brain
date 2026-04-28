import { WidgetType, type EditorView } from '@codemirror/view';
import { highlightCode } from '../code-highlight.logic';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Common languages offered in the language-switcher dropdown. Order matters
 * — most-used languages first so the Select's natural scroll lands users on
 * the right thing fast. If the block's current language isn't in this list
 * (e.g. `csharp`, `vb`), it gets prepended so the user doesn't accidentally
 * lose an exotic tag by clicking the dropdown.
 */
export const COMMON_LANGUAGES: readonly string[] = [
	'plaintext',
	'javascript',
	'typescript',
	'jsx',
	'tsx',
	'python',
	'rust',
	'go',
	'java',
	'kotlin',
	'swift',
	'c',
	'cpp',
	'csharp',
	'php',
	'ruby',
	'sql',
	'html',
	'css',
	'scss',
	'json',
	'yaml',
	'toml',
	'xml',
	'markdown',
	'bash',
	'shell',
	'powershell',
	'dockerfile',
	'graphql',
	'lua',
	'elixir',
	'haskell',
	'scala',
];

/** Position info for the code block's language tag (or null when fence has no tag). */
export interface CodeBlockLanguageRange {
	languageFrom: number | null;
	languageTo: number | null;
	/** End of the opening fence line — used as insert position when no tag exists. */
	openFenceTo: number;
}

/** Widget that renders a fenced code block with syntax highlighting, language switcher, and copy button */
export class CodeBlockWidget extends WidgetType {
	constructor(
		readonly code: string,
		readonly language: string,
		readonly languageRange: CodeBlockLanguageRange | null = null,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const container = document.createElement('div');
		container.className = 'cm-lp-codeblock';

		// Header: language switcher + copy button
		if (this.language || this.code) {
			const header = document.createElement('div');
			header.className = 'cm-lp-codeblock-header';

			// Language switcher — `<select>` is the simplest way to ship a
			// keyboard-accessible dropdown without a popover library. Falls back
			// to a plain label when no source range is wired (indented code blocks).
			if (this.languageRange) {
				header.appendChild(this.buildLanguageSelect(view));
			} else if (this.language) {
				const lang = document.createElement('span');
				lang.className = 'cm-lp-codeblock-lang';
				lang.textContent = this.language;
				header.appendChild(lang);
			}

			const copyBtn = document.createElement('button');
			copyBtn.className = 'cm-lp-codeblock-copy';
			copyBtn.textContent = 'Copy';
			copyBtn.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				navigator.clipboard.writeText(this.code).then(() => {
					copyBtn.textContent = 'Copied!';
					setTimeout(() => {
						copyBtn.textContent = 'Copy';
					}, 1500);
				});
			});
			header.appendChild(copyBtn);

			container.appendChild(header);
		}

		// Code area
		const pre = document.createElement('pre');
		pre.className = 'cm-lp-codeblock-pre';
		const codeEl = document.createElement('code');

		const { html } = highlightCode(this.code, this.language);
		// Defense-in-depth: highlightCode already escapes text nodes, but sanitize
		// to prevent any regression if the highlighter is ever modified incorrectly.
		codeEl.innerHTML = DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['span'],
			ALLOWED_ATTR: ['class'],
			ALLOW_DATA_ATTR: false,
		});

		pre.appendChild(codeEl);
		container.appendChild(pre);

		return container;
	}

	eq(other: CodeBlockWidget) {
		if (this.code !== other.code || this.language !== other.language) return false;
		// Range-based equality: a block whose source moved (lines added above
		// it) must rebuild so dispatched transactions hit the right offsets.
		const a = this.languageRange;
		const b = other.languageRange;
		if (a === null && b === null) return true;
		if (a === null || b === null) return false;
		return (
			a.languageFrom === b.languageFrom &&
			a.languageTo === b.languageTo &&
			a.openFenceTo === b.openFenceTo
		);
	}

	ignoreEvent() {
		return false;
	}

	private buildLanguageSelect(view: EditorView): HTMLSelectElement {
		const select = document.createElement('select');
		select.className = 'cm-lp-codeblock-lang cm-lp-codeblock-lang-select';
		// Prepend any exotic language so the user can keep round-tripping it
		const options = this.language && !COMMON_LANGUAGES.includes(this.language)
			? [this.language, ...COMMON_LANGUAGES]
			: [...COMMON_LANGUAGES];

		for (const lang of options) {
			const opt = document.createElement('option');
			opt.value = lang;
			opt.textContent = lang;
			if (lang === this.language) opt.selected = true;
			select.appendChild(opt);
		}

		// Stop CodeMirror from focusing the editor when interacting with the select
		select.addEventListener('mousedown', (e) => e.stopPropagation());
		select.addEventListener('change', () => {
			this.dispatchLanguageChange(view, select.value);
		});

		return select;
	}

	private dispatchLanguageChange(view: EditorView, newLanguage: string): void {
		const range = this.languageRange;
		if (!range) return;
		// Replace existing language tag, or insert one at openFenceTo if none.
		const from = range.languageFrom ?? range.openFenceTo;
		const to = range.languageTo ?? range.openFenceTo;
		const insert = range.languageFrom === null ? newLanguage : newLanguage;
		view.dispatch({
			changes: { from, to, insert },
			userEvent: 'input.codeblock.set-language',
		});
	}
}
