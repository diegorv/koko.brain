import { describe, it, expect } from 'vitest';
import { shouldAutoCheckNow } from '$lib/core/settings/update-check.service';

describe('shouldAutoCheckNow', () => {
	it('returns true when auto-check is enabled', () => {
		expect(shouldAutoCheckNow(true)).toBe(true);
	});

	it('returns false when auto-check is disabled', () => {
		expect(shouldAutoCheckNow(false)).toBe(false);
	});
});
