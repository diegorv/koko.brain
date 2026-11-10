import { describe, it, expect } from 'vitest';
import type {
	TaskLineEdits,
	TaskLineInsert,
	TaskLineRemove,
	TaskLineReplace,
	TaskLinesStale,
} from '#lib/contracts/index.js';
import { applyTaskLineEdits } from '#lib/features/todoist-sync/task-line-edits.logic.js';

// The cases mirror the pure half of `src-tauri/tests/vault_task_lines_test.rs`:
// the TS port must decide every batch the way the Rust writer does.

function replace(anchor: string, expectedLine: string, newLine: string): TaskLineReplace {
	return { anchor, expectedLine, newLine };
}

function remove(anchor: string, expectedLine: string): TaskLineRemove {
	return { anchor, expectedLine };
}

function insert(afterHeading: string | null, lines: string[]): TaskLineInsert {
	return { afterHeading, lines };
}

function edits(r: TaskLineReplace[], i: TaskLineInsert[], d: TaskLineRemove[]): TaskLineEdits {
	return { replace: r, insert: i, remove: d };
}

function applied(content: string, e: TaskLineEdits): string {
	const out = applyTaskLineEdits(content, e);
	if (out.kind !== 'applied') throw new Error(`expected applied, got stale ${JSON.stringify(out.stale)}`);
	return out.content;
}

function stale(content: string, e: TaskLineEdits): TaskLinesStale {
	const out = applyTaskLineEdits(content, e);
	if (out.kind !== 'stale') throw new Error(`expected stale, got ${JSON.stringify(out.content)}`);
	return out.stale;
}

const A = '- [ ] Buy milk 🆔 td-a';
const B = '- [ ] Call 📅 2026-11-10 🆔 td-b';

describe('applyTaskLineEdits: replace and remove', () => {
	it('rewrites only the line that carries the anchor', () => {
		const e = edits([replace('td-b', B, '- [x] Call 📅 2026-11-10 🆔 td-b')], [], []);

		expect(applied(`# Inbox\n${A}\n${B}\n`, e)).toBe(`# Inbox\n${A}\n- [x] Call 📅 2026-11-10 🆔 td-b\n`);
	});

	it('drops the line that carries the anchor', () => {
		expect(applied(`${A}\n${B}\n`, edits([], [], [remove('td-a', A)]))).toBe(`${B}\n`);
	});

	it('counts an anchor token that is not the first id on the line', () => {
		const line = '- [ ] x 🆔 mine 🆔 td-a';
		const e = edits([replace('td-a', line, '- [x] x 🆔 mine 🆔 td-a')], [], []);

		expect(applied(`${line}\n`, e)).toBe('- [x] x 🆔 mine 🆔 td-a\n');
	});

	it('does not match an anchor that only prefixes another', () => {
		const s = stale('- [ ] x 🆔 td-ab\n', edits([], [], [remove('td-a', '- [ ] x 🆔 td-a')]));

		expect(s.reason).toBe('anchorMissing');
	});

	it('is stale when no line carries the anchor', () => {
		expect(stale(`${A}\n`, edits([replace('td-z', 'x', 'y')], [], []))).toEqual({
			reason: 'anchorMissing',
			subject: 'td-z',
		});
	});

	it('is stale when two lines carry the anchor', () => {
		const s = stale(`${A}\n${A}\n`, edits([replace('td-a', A, '- [x] Buy milk 🆔 td-a')], [], []));

		expect(s).toEqual({ reason: 'anchorDuplicated', subject: 'td-a' });
	});

	it('is stale when the anchored line differs from the expected one', () => {
		const s = stale('- [ ] Buy oat milk 🆔 td-a\n', edits([], [], [remove('td-a', A)]));

		expect(s).toEqual({ reason: 'lineDiffers', subject: 'td-a' });
	});

	it('stops the whole batch on one stale edit', () => {
		const e = edits(
			[replace('td-a', A, '- [x] Buy milk 🆔 td-a')],
			[insert(null, ['- [ ] New 🆔 td-c'])],
			[remove('td-b', '- [ ] Call 🆔 td-b')]
		);

		expect(stale(`${A}\n${B}\n`, e).reason).toBe('lineDiffers');
	});

	it('is stale when two edits locate one shared line', () => {
		const shared = '- [ ] a 🆔 td-1 b 🆔 td-2';
		const content = `${shared}\n- [ ] keep me 🆔 td-3\n`;
		const batches = [
			edits([], [], [remove('td-1', shared), remove('td-2', shared)]),
			edits([replace('td-1', shared, 'N1 🆔 td-1'), replace('td-2', shared, 'N2 🆔 td-2')], [], []),
			edits([replace('td-1', shared, 'N1 🆔 td-1')], [], [remove('td-2', shared)]),
		];

		for (const e of batches) {
			expect(stale(content, e)).toEqual({ reason: 'anchorDuplicated', subject: 'td-2' });
		}
	});

	it('is stale for any edit on a CRLF note, and leaves it as is for an empty batch', () => {
		const content = '## Work\r\n- [ ] one 🆔 td-a\r\n';

		for (const i of [insert(null, ['- [ ] t 🆔 td-c']), insert('Work', ['- [ ] t 🆔 td-c'])]) {
			expect(stale(content, edits([], [i], []))).toEqual({ reason: 'crlfLineEndings', subject: '' });
		}
		expect(applied(content, edits([], [], []))).toBe(content);
	});
});

describe('applyTaskLineEdits: insert', () => {
	it('puts an end insert after the last non-blank line', () => {
		const e = edits([], [insert(null, ['- [ ] New 🆔 td-c'])], []);

		expect(applied('', e)).toBe('- [ ] New 🆔 td-c\n');
		expect(applied('a\n', e)).toBe('a\n- [ ] New 🆔 td-c\n');
		expect(applied('a', e)).toBe('a\n- [ ] New 🆔 td-c');
		expect(applied('a\n\n', e)).toBe('a\n- [ ] New 🆔 td-c\n\n');
	});

	it('puts a heading insert after the last line before the next heading of any level', () => {
		const content = '# P\n\n## Work\n- [ ] one\n\n### Sub\n- [ ] sub\n## Home\n- [ ] h\n';
		const e = edits([], [insert('Work', ['- [ ] two 🆔 td-c', '- [ ] three 🆔 td-d'])], []);

		expect(applied(content, e)).toBe(
			'# P\n\n## Work\n- [ ] one\n- [ ] two 🆔 td-c\n- [ ] three 🆔 td-d\n\n### Sub\n- [ ] sub\n## Home\n- [ ] h\n'
		);
	});

	it('keeps the order of two inserts under one heading', () => {
		const e = edits([], [insert('Work', ['- [ ] a 🆔 td-c']), insert('Work', ['- [ ] b 🆔 td-d'])], []);

		expect(applied('## Work\n', e)).toBe('## Work\n- [ ] a 🆔 td-c\n- [ ] b 🆔 td-d\n');
	});

	it('does not read headings inside frontmatter or code fences', () => {
		const content = '---\n# Work\n---\n```\n## Work\n```\n~~~\n## Work\n~~~\n## Work\n';
		const e = edits([], [insert('Work', ['- [ ] t 🆔 td-c'])], []);

		expect(applied(content, e)).toBe(`${content}- [ ] t 🆔 td-c\n`);
	});

	it('puts an insert after an empty heading right below it', () => {
		const e = edits([], [insert('Work', ['- [ ] t 🆔 td-c'])], []);

		expect(applied('## Work\n\n## Home\n', e)).toBe('## Work\n- [ ] t 🆔 td-c\n\n## Home\n');
	});

	it('matches the heading text trimmed', () => {
		const e = edits([], [insert('Work', ['- [ ] t 🆔 td-c'])], []);

		expect(applied('##   Work  \n', e)).toBe('##   Work  \n- [ ] t 🆔 td-c\n');
	});

	it('is stale when the heading is missing', () => {
		const s = stale('## Home\n', edits([], [insert('Work', ['- [ ] t 🆔 td-c'])], []));

		expect(s).toEqual({ reason: 'headingMissing', subject: 'Work' });
	});

	it('is stale when the heading appears twice', () => {
		const s = stale('## Work\n- a\n## Work\n- b\n', edits([], [insert('Work', ['- [ ] t 🆔 td-c'])], []));

		expect(s).toEqual({ reason: 'headingDuplicated', subject: 'Work' });
	});

	it('refuses to insert an anchor already in the note', () => {
		const s = stale(`${A}\n`, edits([], [insert(null, ['- [ ] again 🆔 td-a'])], []));

		expect(s).toEqual({ reason: 'anchorExists', subject: 'td-a' });
	});

	it('moves a line within one note in one batch', () => {
		const e = edits([], [insert('Home', [A])], [remove('td-a', A)]);

		expect(applied(`## Work\n${A}\n## Home\n- [ ] h\n`, e)).toBe(`## Work\n## Home\n- [ ] h\n${A}\n`);
	});

	it('inserts lines without an anchor', () => {
		const e = edits([], [insert(null, ['', '## Work', '- [ ] t 🆔 td-c'])], []);

		expect(applied('# P\n', e)).toBe('# P\n\n## Work\n- [ ] t 🆔 td-c\n');
	});
});

describe('applyTaskLineEdits: batches built wrong', () => {
	it('throws on a new or inserted line with a line break', () => {
		expect(() => applyTaskLineEdits(`${A}\n`, edits([replace('td-a', A, 'x\ny')], [], []))).toThrow();
		expect(() => applyTaskLineEdits(`${A}\n`, edits([], [insert(null, ['x\r'])], []))).toThrow();
	});

	it('throws on an anchor named by two edits', () => {
		const e = edits([replace('td-a', A, 'x 🆔 td-a')], [], [remove('td-a', A)]);

		expect(() => applyTaskLineEdits(`${A}\n`, e)).toThrow();
	});

	it('throws on the same anchor in two inserted lines', () => {
		const e = edits([], [insert(null, ['- a 🆔 td-c']), insert(null, ['- b 🆔 td-c'])], []);

		expect(() => applyTaskLineEdits('', e)).toThrow();
	});
});
