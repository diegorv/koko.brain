import { afterEach, describe, expect, it } from 'vitest';
import parity from '../fixtures/task-headings-parity.fixture.json';
import { vaultIndex } from '../../../e2e/mocks/vault-index';
import { virtualFS } from '../../../e2e/mocks/virtual-fs';
import type { NoteEntryV2 } from '../../lib/types/vault-v2.types';

/**
 * The e2e mock parser against the fixture the Rust indexer is pinned to
 * (`src-tauri/tests/vault_task_headings_parity_test.rs`): the same note
 * gives the same `taskHeadings`, task `heading`, description and tags on
 * both sides.
 */

/** The fields the fixture pins, with absent wire fields left out as Rust omits them. */
function parityFields(entry: NoteEntryV2) {
	return {
		...(entry.taskHeadings !== undefined ? { taskHeadings: entry.taskHeadings } : {}),
		tasks: entry.tasks.map((t) => ({
			text: t.text,
			lineNumber: t.lineNumber,
			...(t.heading !== undefined ? { heading: t.heading } : {}),
			description: t.metadata.description,
			tags: t.metadata.tags,
		})),
	};
}

describe('E2E vault index task headings and tags parity', () => {
	afterEach(() => virtualFS.reset());

	it.each(parity.cases)('$name', ({ content, expected }) => {
		virtualFS.writeFile('/vault/note.md', content);
		vaultIndex.update('/vault/note.md', content);
		const entry = vaultIndex.getEntry('/vault/note.md');
		expect(entry).not.toBeNull();
		expect(parityFields(entry as NoteEntryV2)).toEqual(expected);
	});

	it('omits taskHeadings for a note without tasks', () => {
		vaultIndex.update('/vault/plain.md', '# Title\ntext\n');
		const entry = vaultIndex.getEntry('/vault/plain.md') as NoteEntryV2;
		expect('taskHeadings' in entry).toBe(false);
	});

	it('omits heading on a task before the first heading', () => {
		vaultIndex.update('/vault/early.md', '- [ ] early\n# H\n- [ ] late\n');
		const [early, late] = (vaultIndex.getEntry('/vault/early.md') as NoteEntryV2).tasks;
		expect('heading' in early).toBe(false);
		expect(late.heading).toBe(0);
	});
});
