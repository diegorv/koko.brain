import { WidgetType } from '@codemirror/view';
import { highlightCode } from '../code-highlight.logic';
import DOMPurify from 'isomorphic-dompurify';

/** Widget that renders a fenced code block with syntax highlighting, language label, and copy button */
export class CodeBlockWidget extends WidgetType {
	constructor(
		readonly code: string,
		readonly language: string,
	) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-lp-codeblock';

		// Header: language label + copy button
		if (this.language || this.code) {
			const header = document.createElement('div');
			header.className = 'cm-lp-codeblock-header';

			if (this.language) {
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
		return this.code === other.code && this.language === other.language;
	}

	ignoreEvent() {
		return false;
	}
}
