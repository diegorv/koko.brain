import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { computeMetaBindButtons } from '$lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field';

function createState(doc: string, cursor?: number): EditorState {
	return EditorState.create({
		doc,
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
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

		const tr = state.update({
			changes: {
				from: 0,
				to: state.doc.length,
				insert: 'text\n```meta-bind-button\nlabel: Test\n```',
			},
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});
});
