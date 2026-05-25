import { describe, it, expect } from 'vitest';
import {
	isInboxEnabled,
	getInboxEntries,
	getInboxCount,
	shouldNewNoteBeUnorganized,
} from '$lib/features/type-definitions/inbox-workflow.logic';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

describe('isInboxEnabled', () => {
	it('returns true when explicitOrganization enabled', () => {
		expect(isInboxEnabled(true)).toBe(true);
	});

	it('returns false when explicitOrganization disabled', () => {
		expect(isInboxEnabled(false)).toBe(false);
	});
});

describe('getInboxEntries', () => {
	it('returns non-organized non-archived non-Type entries', () => {
		const entries = [
			entryV2('/v/a.md', { organized: false, archived: false, isA: null }),
			entryV2('/v/b.md', { organized: true, archived: false, isA: null }),
			entryV2('/v/c.md', { organized: false, archived: true, isA: null }),
			entryV2('/v/d.md', { organized: false, archived: false, isA: 'Type' }),
			entryV2('/v/e.md', { organized: false, archived: false, isA: 'Project' }),
		];
		const inbox = getInboxEntries(entries);
		expect(inbox.map((e) => e.path)).toEqual(['/v/a.md', '/v/e.md']);
	});

	it('returns empty when all organized', () => {
		const entries = [
			entryV2('/v/a.md', { organized: true, archived: false }),
		];
		expect(getInboxEntries(entries)).toHaveLength(0);
	});
});

describe('getInboxCount', () => {
	it('counts inbox entries', () => {
		const entries = [
			entryV2('/v/a.md', { organized: false, archived: false, isA: null }),
			entryV2('/v/b.md', { organized: true, archived: false, isA: null }),
			entryV2('/v/c.md', { organized: false, archived: false, isA: 'Project' }),
		];
		expect(getInboxCount(entries)).toBe(2);
	});
});

describe('shouldNewNoteBeUnorganized', () => {
	it('returns true when explicitOrganization enabled', () => {
		expect(shouldNewNoteBeUnorganized(true)).toBe(true);
	});

	it('returns false when disabled', () => {
		expect(shouldNewNoteBeUnorganized(false)).toBe(false);
	});
});
