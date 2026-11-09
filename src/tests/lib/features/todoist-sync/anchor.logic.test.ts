import { describe, it, expect } from 'vitest';
import {
	anchorForTodoistId,
	anchorToken,
	buildAnchorOccurrences,
	generateAnchor,
	hasForeignId,
	isInSyncScope,
	readAnchor,
} from '#lib/features/todoist-sync/anchor.logic.js';

describe('readAnchor', () => {
	it('reads the td- value at the end of the line', () => {
		expect(readAnchor('- [ ] Buy milk 🆔 td-abc12345')).toBe('td-abc12345');
	});

	it('reads the td- value anywhere on the line', () => {
		expect(readAnchor('- [ ] Buy 🆔 td-6hxGCq milk 📅 2026-11-09')).toBe('td-6hxGCq');
	});

	it('accepts the variation selector and no space after the emoji', () => {
		expect(readAnchor('- [ ] Buy milk 🆔️td-x1')).toBe('td-x1');
	});

	it('returns null for a line without 🆔', () => {
		expect(readAnchor('- [ ] Buy milk')).toBeNull();
		expect(readAnchor('')).toBeNull();
	});

	it('returns null when the first 🆔 has no td- prefix', () => {
		expect(readAnchor('- [ ] Buy milk 🆔 abc123')).toBeNull();
		expect(readAnchor('- [ ] Buy milk 🆔 abc 🆔 td-x1')).toBeNull();
	});

	it('returns null for a bare td- prefix', () => {
		expect(readAnchor('- [ ] Buy milk 🆔 td-')).toBeNull();
	});
});

describe('hasForeignId', () => {
	it('is true for a user 🆔 without the td- prefix', () => {
		expect(hasForeignId('- [ ] Buy milk 🆔 abc123')).toBe(true);
	});

	it('is true when a user 🆔 sits next to a td- anchor', () => {
		expect(hasForeignId('- [ ] Buy milk 🆔 td-x1 🆔 abc')).toBe(true);
	});

	it('is true for a bare td- value, which is not an anchor', () => {
		expect(hasForeignId('- [ ] Buy milk 🆔 td-')).toBe(true);
	});

	it('is false for a td- anchor or no 🆔', () => {
		expect(hasForeignId('- [ ] Buy milk 🆔 td-x1')).toBe(false);
		expect(hasForeignId('- [ ] Buy milk')).toBe(false);
		expect(hasForeignId('')).toBe(false);
	});
});

describe('anchor builders', () => {
	it('builds the anchor of a Todoist-born task from its id', () => {
		expect(anchorForTodoistId('6hxGCqmrqCMqj7mj')).toBe('td-6hxGCqmrqCMqj7mj');
	});

	it('builds the line token for an anchor', () => {
		expect(anchorToken('td-abc12345')).toBe('🆔 td-abc12345');
	});

	it('round-trips a built token through readAnchor', () => {
		const token = anchorToken(anchorForTodoistId('123'));
		expect(readAnchor(`- [ ] Task ${token}`)).toBe('td-123');
	});
});

describe('generateAnchor', () => {
	it('returns td- plus 8 base36 chars', () => {
		expect(generateAnchor(new Set())).toMatch(/^td-[0-9a-z]{8}$/);
	});

	it('returns an empty-set value without retrying', () => {
		expect(generateAnchor(new Set(), () => 0)).toBe('td-00000000');
	});

	it('retries until the value is not in the taken set', () => {
		const values = [0, 0, 0, 0, 0, 0, 0, 0, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999, 0.999];
		let i = 0;
		const random = () => values[i++];
		expect(generateAnchor(new Set(['td-00000000']), random)).toBe('td-zzzzzzzz');
		expect(i).toBe(16);
	});
});

describe('buildAnchorOccurrences', () => {
	it('groups lines by anchor and keeps duplicates', () => {
		const a = { relPath: 'Todoist/Work.md', line: '- [ ] One 🆔 td-a1' };
		const b = { relPath: 'Todoist/Work.md', line: '- [ ] Two 🆔 td-b2' };
		const c = { relPath: 'Notes/Copy.md', line: '- [x] One again 🆔 td-a1' };
		const map = buildAnchorOccurrences([a, b, c]);
		expect([...map.keys()]).toEqual(['td-a1', 'td-b2']);
		expect(map.get('td-a1')).toEqual([a, c]);
		expect(map.get('td-b2')).toEqual([b]);
	});

	it('skips lines without a td- anchor', () => {
		const map = buildAnchorOccurrences([
			{ relPath: 'a.md', line: '- [ ] No anchor' },
			{ relPath: 'a.md', line: '- [ ] User id 🆔 mine' },
		]);
		expect(map.size).toBe(0);
	});

	it('returns an empty map for no lines', () => {
		expect(buildAnchorOccurrences([]).size).toBe(0);
	});

	it('keeps extra fields of the input items', () => {
		const item = { relPath: 'a.md', line: '- [ ] One 🆔 td-a1', lineNumber: 4 };
		expect(buildAnchorOccurrences([item]).get('td-a1')?.[0].lineNumber).toBe(4);
	});
});

describe('isInSyncScope', () => {
	const templates = '_system/templates';

	it('accepts an ordinary note', () => {
		expect(isInSyncScope('Todoist/Work.md', templates)).toBe(true);
		expect(isInSyncScope('Projects/system-notes.md', templates)).toBe(true);
	});

	it('excludes the templates folder from settings', () => {
		expect(isInSyncScope('Templates/Daily.md', 'Templates')).toBe(false);
		expect(isInSyncScope('Templates/Daily.md', 'Templates/')).toBe(false);
		expect(isInSyncScope('TemplatesOld/Daily.md', 'Templates')).toBe(true);
	});

	it('ignores an empty templates folder setting', () => {
		expect(isInSyncScope('Notes/a.md', '')).toBe(true);
	});

	it('excludes _system/ even when templates live elsewhere', () => {
		expect(isInSyncScope('_system/inbox.md', 'Templates')).toBe(false);
		expect(isInSyncScope('_system/templates/Daily.md', templates)).toBe(false);
	});

	it('excludes .view files', () => {
		expect(isInSyncScope('Views/Tasks.view', templates)).toBe(false);
	});

	it('excludes .kokobrain/', () => {
		expect(isInSyncScope('.kokobrain/notes.md', templates)).toBe(false);
	});
});
