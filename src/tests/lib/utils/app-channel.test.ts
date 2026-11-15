import { describe, it, expect, afterEach } from 'vitest';
import { getBuildChannel } from '#lib/utils/app-channel.js';

describe('getBuildChannel', () => {
	afterEach(() => {
		delete (globalThis as Record<string, unknown>).__APP_CHANNEL__;
	});

	it('returns stable when __APP_CHANNEL__ is not defined', () => {
		expect(getBuildChannel()).toBe('stable');
	});

	it('returns a string', () => {
		expect(typeof getBuildChannel()).toBe('string');
	});

	it('returns the channel the build define names, preview included', () => {
		(globalThis as Record<string, unknown>).__APP_CHANNEL__ = 'preview';
		expect(getBuildChannel()).toBe('preview');
	});
});
