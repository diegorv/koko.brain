import { EditorView, WidgetType } from '@codemirror/view';
import { highlightCode } from '../code-highlight.logic';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Languages offered in the code-block widget's language switcher. Matches the
 * highlightCode logic's recognized identifiers plus a small "(none)" sentinel
 * so users can strip the language.
 */
const LANGUAGE_CHOICES = [
	'',
	'javascript',
	'typescript',
	'jsx',
	'tsx',
	'python',
	'ruby',
	'rust',
	'go',
	'java',
	'kotlin',
	'swift',
	'bash',
	'shell',
	'sh',
	'sql',
	'json',
	'yaml',
	'toml',
	'xml',
	'html',
	'css',
	'scss',
	'markdown',
	'c',
	'cpp',
	'csharp',
	'diff',
	'dockerfile',
	'makefile',
] as const;

/** Widget that renders a fenced code block with syntax highlighting, a
 * language switcher and a copy button. */
export class CodeBlockWidget extends WidgetType {
	constructor(
		readonly code: string,
		readonly language: string,
		readonly languageFrom: number,
		readonly languageTo: number,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const container = document.createElement('div');
		container.className = 'cm-lp-codeblock';

		container.appendChild(this.renderHeader(view));

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
		return (
			this.code === other.code &&
			this.language === other.language &&
			this.languageFrom === other.languageFrom &&
			this.languageTo === other.languageTo
		);
	}

	ignoreEvent() {
		return false;
	}

	/** Header with the language <select> and the Copy button. */
	private renderHeader(view: EditorView): HTMLDivElement {
		const header = document.createElement('div');
		header.className = 'cm-lp-codeblock-header';

		const select = document.createElement('select');
		select.className = 'cm-lp-codeblock-lang-select';
		for (const choice of LANGUAGE_CHOICES) {
			const option = document.createElement('option');
			option.value = choice;
			option.textContent = choice === '' ? '(no language)' : choice;
			if (choice === this.language) option.selected = true;
			select.appendChild(option);
		}
		// If the current language isn't in LANGUAGE_CHOICES (user typed something
		// exotic), preserve it as a separate option so the select still reflects
		// reality instead of silently flipping back to (no language).
		if (this.language && !LANGUAGE_CHOICES.includes(this.language as (typeof LANGUAGE_CHOICES)[number])) {
			const custom = document.createElement('option');
			custom.value = this.language;
			custom.textContent = this.language;
			custom.selected = true;
			select.appendChild(custom);
		}
		select.addEventListener('mousedown', (e) => e.stopPropagation());
		select.addEventListener('change', () => {
			const next = select.value;
			if (next === this.language) return;
			// Insert with a leading space IF we're inserting where there was no
			// language before and the opening fence doesn't already end in one.
			const needsSpace =
				this.languageFrom === this.languageTo &&
				next !== '' &&
				view.state.doc.sliceString(this.languageFrom - 1, this.languageFrom) !== ' ';
			view.dispatch({
				changes: {
					from: this.languageFrom,
					to: this.languageTo,
					insert: next === '' ? '' : `${needsSpace ? ' ' : ''}${next}`,
				},
			});
		});
		header.appendChild(select);

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

		return header;
	}
}
