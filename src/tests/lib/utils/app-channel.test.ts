import { describe, it, expect } from 'vitest';
import { getBuildChannel } from '$lib/utils/app-channel';

describe('getBuildChannel', () => {
	it('returns stable when __APP_CHANNEL__ is not defined', () => {
		expect(getBuildChannel()).toBe('stable');
	});

	it('returns a string', () => {
		expect(typeof getBuildChannel()).toBe('string');
	});
});
