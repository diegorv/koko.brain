import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildTaskListDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/task-list-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildTaskListDecorations>) {
	const result: { from: number; to: number; hasWidget: boolean }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			hasWidget: !!(iter.value.spec as { widget?: unknown }).widget,
		});
		iter.next();
	}
	return result;
}

function buildTasks(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildTaskListDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('taskListPlugin — buildTaskListDecorations', () => {
	it('replaces task marker with widget when cursor is outside', () => {
		const doc = '- [ ] todo\ntext';
		const decos = buildTasks(doc, 13);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('shows source when cursor is on the task line', () => {
		const doc = '- [ ] todo';
		const decos = buildTasks(doc, 5);
		expect(decos).toHaveLength(0);
	});

	it('handles checked tasks', () => {
		const doc = '- [x] done\ntext';
		const decos = buildTasks(doc, 13);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('handles multiple tasks', () => {
		const doc = '- [ ] one\n- [x] two\ntext';
		const decos = buildTasks(doc, 22);
		expect(decos).toHaveLength(2);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n- [ ] not a task\n```';
		const decos = buildTasks(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for task under cursor', () => {
		const doc = '- [ ] first\n- [ ] second\ntext';
		const decos = buildTasks(doc, 5); // cursor on "first"
		// Only second task should have widget
		expect(decos).toHaveLength(1);
		const state = createMarkdownState(doc);
		const line2 = state.doc.line(2);
		expect(decos[0].from).toBeGreaterThanOrEqual(line2.from);
	});
});
