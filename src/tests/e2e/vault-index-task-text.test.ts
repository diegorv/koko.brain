import { afterEach, describe, expect, it } from 'vitest';
import { vaultIndex } from '../../../e2e/mocks/vault-index';
import { virtualFS } from '../../../e2e/mocks/virtual-fs';

const NOTE = '# Calls\n\t* [ ] call Ana\nplain line\n';

/** Writes `content` into `virtualFS` and indexes it, as the app's save path does. */
function writeNote(path: string, content: string): void {
	virtualFS.writeFile(path, content);
	vaultIndex.update(path, content);
}

describe('E2E vault index writeTaskText (Rust write_task_text)', () => {
	// `virtualFS.reset` also rebuilds the (now empty) index.
	afterEach(() => virtualFS.reset());

	it('rewrites the text, keeps the prefix and indexes the note', () => {
		writeNote('/vault/Calls.md', NOTE);

		const result = vaultIndex.writeTaskText('/vault', 'Calls.md', 2, 'call Ana', 'todo', 'call Ana 📅 2026-11-20');

		const expected = '# Calls\n\t* [ ] call Ana 📅 2026-11-20\nplain line\n';
		expect(virtualFS.readFile('/vault/Calls.md')).toBe(expected);
		expect(result.updatedContent).toBe(expected);
		expect(result.stale).toBe(false);
		expect(result.updateResult.changed).toBe(true);
		expect(result.task).toMatchObject({ text: 'call Ana 📅 2026-11-20', lineNumber: 2, status: 'todo', metadata: { dueDate: '2026-11-20' } });
		expect(result.task?.heading).toBeUndefined();
		expect(vaultIndex.getEntry('/vault/Calls.md')?.tasks[0].metadata.dueDate).toBe('2026-11-20');
	});

	it('reports stale and writes nothing when the expected text or status differs', () => {
		writeNote('/vault/Calls.md', NOTE);

		for (const [text, status] of [
			['call Bob', 'todo'],
			['call Ana', 'done'],
		] as const) {
			const result = vaultIndex.writeTaskText('/vault', 'Calls.md', 2, text, status, 'call Ana ⏫');
			expect(result.stale).toBe(true);
			expect(result.updateResult.changed).toBe(false);
			expect(result.task).toBeNull();
		}
		expect(virtualFS.readFile('/vault/Calls.md')).toBe(NOTE);
	});

	it('writes nothing for the same text and is not stale', () => {
		writeNote('/vault/Calls.md', NOTE);

		const result = vaultIndex.writeTaskText('/vault', 'Calls.md', 2, 'call Ana', 'todo', 'call Ana');

		expect(result).toMatchObject({ stale: false, task: null, updateResult: { changed: false } });
		expect(virtualFS.readFile('/vault/Calls.md')).toBe(NOTE);
	});

	it('throws on a line break or blank text', () => {
		writeNote('/vault/Calls.md', NOTE);

		for (const newText of ['a\nb', 'a\r', '  ']) {
			expect(() => vaultIndex.writeTaskText('/vault', 'Calls.md', 2, 'call Ana', 'todo', newText)).toThrow();
		}
		expect(virtualFS.readFile('/vault/Calls.md')).toBe(NOTE);
	});
});
