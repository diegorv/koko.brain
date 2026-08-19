import { describe, it, expect, vi } from 'vitest';
import { parseAlignments, findAllTables } from '$lib/core/markdown-editor/extensions/live-preview/parsers/table';
import { createMarkdownState } from '../../../test-helpers';

describe('parseAlignments', () => {
	it('parses default left alignment', () => {
		expect(parseAlignments('| --- | --- |')).toEqual(['left', 'left']);
	});

	it('parses left alignment with colon', () => {
		expect(parseAlignments('| :--- | :--- |')).toEqual(['left', 'left']);
	});

	it('parses center alignment', () => {
		expect(parseAlignments('| :---: | :---: |')).toEqual(['center', 'center']);
	});

	it('parses right alignment', () => {
		expect(parseAlignments('| ---: | ---: |')).toEqual(['right', 'right']);
	});

	it('parses mixed alignments', () => {
		expect(parseAlignments('| :--- | :---: | ---: |')).toEqual(['left', 'center', 'right']);
	});

	it('handles minimal dashes', () => {
		expect(parseAlignments('| - | :--: | --: |')).toEqual(['left', 'center', 'right']);
	});

	it('handles no spaces', () => {
		expect(parseAlignments('|---|:---:|---:|')).toEqual(['left', 'center', 'right']);
	});
});

describe('findAllTables', () => {
	it('finds a simple table', () => {
		const state = createMarkdownState('| a | b |\n| --- | --- |\n| 1 | 2 |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].headers).toEqual(['a', 'b']);
		expect(tables[0].alignments).toEqual(['left', 'left']);
		expect(tables[0].rows).toEqual([['1', '2']]);
	});

	it('finds a table with multiple data rows', () => {
		const state = createMarkdownState('| h1 | h2 |\n| --- | --- |\n| a | b |\n| c | d |\n| e | f |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows).toEqual([
			['a', 'b'],
			['c', 'd'],
			['e', 'f'],
		]);
	});

	it('finds a table with no data rows (header + separator only)', () => {
		const state = createMarkdownState('| h1 | h2 |\n| --- | --- |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].headers).toEqual(['h1', 'h2']);
		expect(tables[0].rows).toEqual([]);
	});

	it('respects column alignment', () => {
		const state = createMarkdownState('| left | center | right |\n| :--- | :---: | ---: |\n| a | b | c |');
		const tables = findAllTables(state);
		expect(tables[0].alignments).toEqual(['left', 'center', 'right']);
	});

	it('finds multiple tables', () => {
		const state = createMarkdownState(
			'| a | b |\n| --- | --- |\n| 1 | 2 |\n\n| x | y |\n| --- | --- |\n| 3 | 4 |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(2);
		expect(tables[0].headers).toEqual(['a', 'b']);
		expect(tables[1].headers).toEqual(['x', 'y']);
	});

	it('finds multiple tables when the initial parse budget expires', () => {
		// CodeMirror gives the parse started by EditorState.create a 20 ms wall-clock
		// budget (Work.Apply in LanguageState.init) and snapshots whatever tree that
		// produced. A clock that steps 25 ms per reading forces that budget to expire
		// at the first block boundary, which is what a scheduler stall does on a loaded
		// machine. createMarkdownState must still hand back the complete tree.
		let clock = 0;
		const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 25));
		try {
			const state = createMarkdownState(
				'| a | b |\n| --- | --- |\n| 1 | 2 |\n\n| x | y |\n| --- | --- |\n| 3 | 4 |',
			);
			const tables = findAllTables(state);
			expect(tables).toHaveLength(2);
			expect(tables[0].headers).toEqual(['a', 'b']);
			expect(tables[1].headers).toEqual(['x', 'y']);
		} finally {
			nowSpy.mockRestore();
		}
	});

	it('returns empty for non-table content', () => {
		const state = createMarkdownState('# Heading\nSome text\n- a list item');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(0);
	});

	it('returns empty for single line', () => {
		const state = createMarkdownState('| a | b |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(0);
	});

	it('returns empty for empty input', () => {
		const state = createMarkdownState('');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(0);
	});

	it('handles table surrounded by other content', () => {
		const state = createMarkdownState('# Title\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nParagraph');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].headers).toEqual(['a', 'b']);
	});

	it('handles single column table', () => {
		const state = createMarkdownState('| col |\n| --- |\n| val |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].headers).toEqual(['col']);
		expect(tables[0].rows).toEqual([['val']]);
	});

	it('provides correct position info', () => {
		const doc = '# Title\n\n| a | b |\n| --- | --- |\n| 1 | 2 |';
		const state = createMarkdownState(doc);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].from).toBe(doc.indexOf('| a'));
		expect(tables[0].startLine).toBe(3);
		expect(tables[0].endLine).toBe(5);
	});

	it('normalizes data rows with fewer cells', () => {
		const state = createMarkdownState('| a | b | c |\n| --- | --- | --- |\n| 1 |');
		const tables = findAllTables(state);
		expect(tables[0].rows).toEqual([['1', '', '']]);
	});

	it('normalizes data rows with extra cells', () => {
		const state = createMarkdownState('| a | b |\n| --- | --- |\n| 1 | 2 | 3 | 4 |');
		const tables = findAllTables(state);
		expect(tables[0].rows).toEqual([['1', '2']]);
	});
});
