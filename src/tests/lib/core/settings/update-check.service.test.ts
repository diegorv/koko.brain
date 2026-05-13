import { describe, it, expect } from 'vitest';
import { shouldAutoCheckNow } from '$lib/core/settings/update-check.service';

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const NOW = 1_700_000_000_000;

describe('shouldAutoCheckNow', () => {
	it('returns false when autoCheck is disabled', () => {
		expect(shouldAutoCheckNow(false, null, NOW)).toBe(false);
		expect(shouldAutoCheckNow(false, NOW - ONE_DAY * 7, NOW)).toBe(false);
	});

	it('returns true when autoCheck is on and there is no prior check', () => {
		expect(shouldAutoCheckNow(true, null, NOW)).toBe(true);
	});

	it('returns false when the last check was less than 24h ago', () => {
		expect(shouldAutoCheckNow(true, NOW - 1_000, NOW)).toBe(false);
		expect(shouldAutoCheckNow(true, NOW - ONE_HOUR, NOW)).toBe(false);
		expect(shouldAutoCheckNow(true, NOW - 23 * ONE_HOUR, NOW)).toBe(false);
	});

	it('returns true exactly at the 24h boundary', () => {
		expect(shouldAutoCheckNow(true, NOW - ONE_DAY, NOW)).toBe(true);
	});

	it('returns true when the last check is older than 24h', () => {
		expect(shouldAutoCheckNow(true, NOW - ONE_DAY - 1, NOW)).toBe(true);
		expect(shouldAutoCheckNow(true, NOW - ONE_DAY * 30, NOW)).toBe(true);
	});

	it('treats a future lastCheckedAt as already-checked (negative diff < threshold)', () => {
		// Clock skew: a backup-restored settings file could carry a
		// lastCheckedAt timestamp from the future. The throttle should
		// still hold rather than re-checking on every boot.
		expect(shouldAutoCheckNow(true, NOW + ONE_HOUR, NOW)).toBe(false);
	});
});
