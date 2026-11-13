import { describe, it, expect } from 'vitest';
import { getInboxCount, isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

describe('getInboxCount', () => {
	it('counts inbox entries', () => {
		const entries = [
			entryV2('/v/a.md', { organized: false, archived: false, isA: null }),
			entryV2('/v/b.md', { organized: true, archived: false, isA: null }),
			entryV2('/v/c.md', { organized: false, archived: false, isA: 'Project' }),
			entryV2('/v/d.md', { organized: false, archived: true, isA: null }),
			entryV2('/v/e.md', { organized: false, archived: false, isA: 'Type' }),
		];
		expect(getInboxCount(entries)).toBe(2);
	});

	it('leaves out a .view that is not organized', () => {
		const entries = [entryV2('/v/a.md'), entryV2('/v/Projects.view', { organized: false })];
		expect(getInboxCount(entries)).toBe(1);
	});
});

describe('isInboxEntry', () => {
	it('is true only for a note that is not organized, not archived, not a type definition and not a .view', () => {
		expect(isInboxEntry(entryV2('/v/f.view'))).toBe(false);
		expect(isInboxEntry(entryV2('/v/a.md'))).toBe(true);
		expect(isInboxEntry(entryV2('/v/b.md', { organized: true }))).toBe(false);
		expect(isInboxEntry(entryV2('/v/c.md', { archived: true }))).toBe(false);
		expect(isInboxEntry(entryV2('/v/d.md', { isA: 'Type' }))).toBe(false);
		expect(isInboxEntry(entryV2('/v/e.md', { isA: 'Project' }))).toBe(true);
	});

	it('gives getInboxCount its count', () => {
		const entries = [entryV2('/v/a.md'), entryV2('/v/b.md', { organized: true })];
		expect(getInboxCount(entries)).toBe(entries.filter(isInboxEntry).length);
		expect(getInboxCount([])).toBe(0);
	});
});
