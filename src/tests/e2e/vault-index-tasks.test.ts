import { afterEach, describe, expect, it } from 'vitest';
import { vaultIndex } from '../../../e2e/mocks/vault-index';
import { virtualFS } from '../../../e2e/mocks/virtual-fs';

/** Writes `content` into `virtualFS` and indexes it, as the app's save path does. */
function writeNote(path: string, content: string): void {
	virtualFS.writeFile(path, content);
	vaultIndex.update(path, content);
}

/** Task texts per listed note, in group order. */
function listed(sectionTags: string[]): [string, string[]][] {
	return vaultIndex.getTasksInSection(sectionTags).map((g) => [g.filePath, g.tasks.map((t) => t.text)]);
}

describe('E2E vault index getTasksInSection', () => {
	// `virtualFS.reset` also rebuilds the (now empty) index.
	afterEach(() => virtualFS.reset());

	it('lists the tasks under any of several tagged headings', () => {
		writeNote('/vault/a.md', '## A #to-list\n- [ ] a1\n## B #work\n- [ ] b1\n## C\n- [ ] c1\n');
		expect(listed(['#to-list', '#work'])).toEqual([['/vault/a.md', ['a1', 'b1']]]);
		expect(listed(['#to-list'])).toEqual([['/vault/a.md', ['a1']]]);
	});

	it('keeps an outer section open past a nested tagged heading', () => {
		writeNote('/vault/nested.md', '# A #to-list\n## B #work\n- [ ] t1\n## C\n- [ ] t2\n');
		expect(listed(['#to-list', '#work'])).toEqual([['/vault/nested.md', ['t1', 't2']]]);
	});

	it('lists a task under a heading with two tags once', () => {
		writeNote('/vault/both.md', '## Both #to-list #work\n- [ ] once\n');
		expect(listed(['#to-list', '#work'])).toEqual([['/vault/both.md', ['once']]]);
	});

	it('adds a missing #, matches case-sensitively and skips fenced headings', () => {
		writeNote('/vault/rule.md', '## Work #Work\n- [ ] upper\n```\n## Fake #work\n```\n- [ ] after fence\n## Real #work\n- [ ] real\n');
		expect(listed(['work'])).toEqual([['/vault/rule.md', ['real']]]);
	});

	it('drops notes without a matching section and ignores blank tags and a lone #', () => {
		writeNote('/vault/plain.md', '## Notes #misc\n- [ ] not listed\n');
		expect(listed(['#to-list'])).toEqual([]);
		expect(listed(['', '  ', '#', '#to-list'])).toEqual([]);
	});

	it('lists every task when no tag is left', () => {
		writeNote('/vault/plain.md', '## Notes #misc\n- [ ] listed\n');
		expect(listed([])).toEqual([['/vault/plain.md', ['listed']]]);
		expect(listed([' ', '#'])).toEqual([['/vault/plain.md', ['listed']]]);
	});
});
