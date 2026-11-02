import { describe, it, expect } from 'vitest';
import { updateCollectionYaml } from '#lib/features/collection/yaml-parser.js';

// Repro for fidelity-12: the toolbar write path (updateCollectionYaml) parses
// and re-stringifies the whole .view/.collection file, so YAML comments the
// user wrote are dropped. The correct behavior asserted here: a toolbar sort
// change keeps the user's comments.
describe('updateCollectionYaml comment preservation (h08 fidelity-12)', () => {
	it('keeps user comments when a toolbar sort change is written', () => {
		const input = [
			'# Project tracker, do not reorder the columns below',
			'views:',
			'  - type: table # main table',
			'    name: All',
			'',
		].join('\n');

		const out = updateCollectionYaml(input, {
			viewIndex: 0,
			viewSort: [{ column: 'title', direction: 'ASC' }],
		});

		expect(out).toContain('# Project tracker, do not reorder the columns below');
		expect(out).toContain('# main table');
	});
});
