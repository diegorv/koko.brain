import { describe, it, expect } from 'vitest';
import { getInboxCount } from '$lib/features/type-definitions/inbox-workflow.logic';
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
});
