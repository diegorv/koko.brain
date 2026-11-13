// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { LanguageDescription } from '@codemirror/language';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { computeMetaBindButtons } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.js';
import {
	MetaBindButtonWidget,
	MetaBindButtonErrorWidget,
} from '#lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.js';
import { createMarkdownState, withFullParse } from '../../../test-helpers';

function createState(doc: string, cursor?: number): EditorState {
	return createMarkdownState(doc, { cursor });
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeMetaBindButtons(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

const BUTTON_BLOCK = 'text\n```meta-bind-button\nlabel: Click Me\nstyle: default\n```';

describe('metaBindButtonField', () => {
	it('decorates a button block when cursor is outside', () => {
		const state = createState(BUTTON_BLOCK, 0); // cursor on "text"
		const decos = collectDecos(state);
		// First line: widget replace
		// Lines 2-3 (yaml lines): hiddenLineDeco + replace each = 4
		// Line 4 (closing fence): hiddenLineDeco + replace = 2
		// Total: 1 + 2 + 2 + 2 = 7
		expect(decos.length).toBeGreaterThan(0);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '```meta-bind-button\nlabel: Click Me\n```';
		const state = createState(doc, 22); // cursor inside YAML
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('produces no decorations without button blocks', () => {
		const state = createState('plain text\nno buttons', 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('does not match regular code blocks', () => {
		const doc = 'text\n```javascript\nconst x = 1;\n```';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles invalid config with error widget', () => {
		const doc = 'text\n```meta-bind-button\ninvalid yaml content\n```';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Should still produce decorations (error widget)
		expect(decos.length).toBeGreaterThan(0);
	});

	it('updates when document changes', () => {
		const state = createState('plain text', 0);
		expect(collectDecos(state)).toHaveLength(0);

		const next = withFullParse(() =>
			state.update({
				changes: {
					from: 0,
					to: state.doc.length,
					insert: 'text\n```meta-bind-button\nlabel: Test\n```',
				},
			}).state,
		);
		expect(collectDecos(next).length).toBeGreaterThan(0);
	});
});

/** A rendered button: opening-fence range and the button label (`error` for the error widget). */
interface Rendered {
	from: number;
	to: number;
	label: string;
}

/** Collects the widget decorations of a set as their range and label. */
function rendered(set: DecorationSet): Rendered[] {
	const out: Rendered[] = [];
	const iter = set.iter();
	while (iter.value) {
		const widget = (iter.value.spec as { widget?: unknown }).widget;
		if (widget instanceof MetaBindButtonWidget) out.push({ from: iter.from, to: iter.to, label: widget.config.label });
		else if (widget instanceof MetaBindButtonErrorWidget) out.push({ from: iter.from, to: iter.to, label: 'error' });
		iter.next();
	}
	return out;
}

/** Counts every decoration in a set (widget, hidden-line class and replace). */
function count(set: DecorationSet): number {
	let n = 0;
	const iter = set.iter();
	while (iter.value) {
		n++;
		iter.next();
	}
	return n;
}

/**
 * Which fences the meta-bind-button decorator claims. The cursor sits on the
 * first line ("text"), so every detected block renders.
 */
describe('meta-bind-button fence detection', () => {
	const run = (doc: string) => computeMetaBindButtons(createState(`text\n${doc}`, 0));
	const at = (doc: string, needle: string) => 'text\n'.length + doc.indexOf(needle);

	it('renders a closed block from its YAML and hides the following lines', () => {
		const doc = '```meta-bind-button\nlabel: Go\naction: { type: open, link: x }\n```';
		const set = run(doc);
		expect(rendered(set)).toEqual([{ from: at(doc, '```'), to: at(doc, '\nlabel'), label: 'Go' }]);
		// widget + (hidden class + replace) for two YAML lines and the closing fence
		expect(count(set)).toBe(7);
	});

	it('renders an empty block as the error widget', () => {
		const doc = '```meta-bind-button\n```';
		expect(rendered(run(doc))).toEqual([{ from: at(doc, '```'), to: at(doc, '\n```'), label: 'error' }]);
	});

	it('accepts spaces around the language and a longer fence', () => {
		expect(rendered(run('````  meta-bind-button  \nlabel: Go\naction: { type: open, link: x }\n````')).map((r) => r.label)).toEqual(['Go']);
	});

	it('does not close on a shorter fence', () => {
		const set = run('````meta-bind-button\nlabel: Go\n```\nstyle: primary\n````');
		// widget + (hidden class + replace) for three inner lines and the closing fence
		expect(count(set)).toBe(9);
	});

	it('does not close on a fence that carries an info string', () => {
		const set = run('```meta-bind-button\nlabel: Go\n```js\nstyle: primary\n```');
		expect(count(set)).toBe(9);
	});

	it('renders nothing for an unclosed block', () => {
		expect(count(run('```meta-bind-button\nlabel: Go'))).toBe(0);
	});

	it('renders nothing when the info string has extra words', () => {
		expect(count(run('```meta-bind-button extra\nlabel: Go\n```'))).toBe(0);
	});

	it('renders nothing for an indented opening fence', () => {
		expect(count(run('  ```meta-bind-button\nlabel: Go\n  ```'))).toBe(0);
	});

	it('renders a fence inside a blockquote from its YAML without the quote prefix', () => {
		const doc = '> ```meta-bind-button\n> label: Go\n> action: { type: open, link: x }\n> ```';
		expect(rendered(run(doc))).toEqual([{ from: at(doc, '>'), to: at(doc, '\n> label'), label: 'Go' }]);
	});

	it('renders nothing for a tilde fence', () => {
		expect(count(run('~~~meta-bind-button\nlabel: Go\n~~~'))).toBe(0);
	});

	it('renders two blocks separated by text', () => {
		const doc = '```meta-bind-button\nlabel: A\naction: { type: open, link: x }\n```\nmiddle\n```meta-bind-button\nlabel: B\naction: { type: open, link: y }\n```';
		expect(rendered(run(doc)).map((r) => r.label)).toEqual(['A', 'B']);
	});
});

describe('meta-bind-button fenced code awareness', () => {
	const NESTED = 'text\n````md\n```meta-bind-button\nlabel: Nested\naction: { type: open, link: x }\n```\n````';
	const TOP = '\n```meta-bind-button\nlabel: Top\naction: { type: open, link: y }\n```';

	/** The app's markdown language carries an `md` code language, so a ````md fence mounts a nested markdown tree. */
	const withMd = () => {
		const md = LanguageDescription.of({ name: 'Markdown', alias: ['md'], support: markdown() });
		return [markdown({ codeLanguages: [md] })];
	};

	it('does not render a meta-bind-button fence nested in a ````md fence', () => {
		expect(count(computeMetaBindButtons(createMarkdownState(NESTED, { cursor: 0 })))).toBe(0);
	});

	it('does not render a nested fence when the ````md content is parsed as markdown', () => {
		const state = createMarkdownState(NESTED, { cursor: 0, extensions: withMd() });
		expect(count(computeMetaBindButtons(state))).toBe(0);
	});

	it('still renders a top-level meta-bind-button fence next to a ````md fence', () => {
		const state = createMarkdownState(NESTED + TOP, { cursor: 0, extensions: withMd() });
		expect(rendered(computeMetaBindButtons(state)).map((r) => r.label)).toEqual(['Top']);
	});
});

describe('meta-bind-button error reason', () => {
	/** The error widget's text for the block `yaml`. */
	function errorText(yaml: string): string | null {
		const iter = computeMetaBindButtons(createState(`text\n\`\`\`meta-bind-button\n${yaml}\n\`\`\``, 0)).iter();
		while (iter.value) {
			const widget = (iter.value.spec as { widget?: unknown }).widget;
			if (widget instanceof MetaBindButtonErrorWidget) return (widget.toDOM() as HTMLElement).textContent;
			iter.next();
		}
		return null;
	}

	it('names the missing label', () => {
		expect(errorText('action: { type: open, link: x }')).toBe('Invalid button: label missing');
	});

	it('names the missing field of an action', () => {
		expect(errorText('label: Go\naction: { type: updateMetadata, prop: status }')).toBe(
			'Invalid button: updateMetadata needs prop and value',
		);
	});

	it('names an openView path that is not a view or leaves the vault', () => {
		expect(errorText('label: Go\naction: { type: openView, path: Projects.md }')).toBe('Invalid button: openView needs a .view path');
		expect(errorText('label: Go\naction: { type: openView, path: ../Projects.view }')).toBe('Invalid button: openView path leaves the vault');
	});
});

describe('meta-bind-button widget events', () => {
	it('the error box lets a click through, so it reveals the invalid YAML', () => {
		expect(new MetaBindButtonErrorWidget('Invalid configuration').ignoreEvent()).toBe(false);
	});

	it('a valid button keeps ignoring editor events (its click runs the action)', () => {
		expect(new MetaBindButtonWidget({ label: 'Go', style: 'default' }).ignoreEvent()).toBe(true);
	});
});
