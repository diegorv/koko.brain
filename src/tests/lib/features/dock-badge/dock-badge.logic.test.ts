import { describe, it, expect } from 'vitest';
import { dockBadgeCount } from '$lib/features/dock-badge/dock-badge.logic';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

describe('dockBadgeCount', () => {
	it('returns null when disabled, regardless of inbox entries', () => {
		const entries = [entryV2('/v/a.md', { organized: false, archived: false, isA: null })];
		expect(dockBadgeCount(false, entries)).toBeNull();
	});

	it('returns the inbox count when enabled', () => {
		const entries = [
			entryV2('/v/a.md', { organized: false, archived: false, isA: null }),
			entryV2('/v/b.md', { organized: true, archived: false, isA: null }),
			entryV2('/v/c.md', { organized: false, archived: false, isA: 'Project' }),
		];
		expect(dockBadgeCount(true, entries)).toBe(2);
	});

	it('returns 0 when enabled but no inbox entries', () => {
		const entries = [entryV2('/v/a.md', { organized: true, archived: false, isA: null })];
		expect(dockBadgeCount(true, entries)).toBe(0);
	});

	it('returns 0 when enabled and the vault is empty', () => {
		expect(dockBadgeCount(true, [])).toBe(0);
	});
});
