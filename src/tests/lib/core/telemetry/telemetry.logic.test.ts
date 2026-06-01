import { describe, it, expect } from 'vitest';

import {
	DEFAULT_POSTHOG_HOST,
	isValidPosthogHost,
	resolveTelemetryConfig,
} from '$lib/core/telemetry/telemetry.logic';

describe('isValidPosthogHost', () => {
	it('accepts an https URL', () => {
		expect(isValidPosthogHost('https://eu.i.posthog.com')).toBe(true);
		expect(isValidPosthogHost('https://us.i.posthog.com')).toBe(true);
		expect(isValidPosthogHost('https://ph.example.com:8443')).toBe(true);
	});

	it('rejects http (non-TLS) URLs', () => {
		expect(isValidPosthogHost('http://eu.i.posthog.com')).toBe(false);
	});

	it('rejects malformed or empty values', () => {
		expect(isValidPosthogHost('')).toBe(false);
		expect(isValidPosthogHost('eu.i.posthog.com')).toBe(false);
		expect(isValidPosthogHost('not a url')).toBe(false);
	});
});

describe('resolveTelemetryConfig', () => {
	it('returns null when no key is provided', () => {
		expect(resolveTelemetryConfig({})).toBeNull();
		expect(resolveTelemetryConfig({ host: 'https://eu.i.posthog.com' })).toBeNull();
	});

	it('returns null for an empty or whitespace-only key', () => {
		expect(resolveTelemetryConfig({ key: '' })).toBeNull();
		expect(resolveTelemetryConfig({ key: '   ' })).toBeNull();
	});

	it('falls back to the EU default host when host is missing', () => {
		expect(resolveTelemetryConfig({ key: 'phc_abc' })).toEqual({
			key: 'phc_abc',
			host: DEFAULT_POSTHOG_HOST,
		});
	});

	it('uses a valid provided host', () => {
		expect(resolveTelemetryConfig({ key: 'phc_abc', host: 'https://us.i.posthog.com' })).toEqual({
			key: 'phc_abc',
			host: 'https://us.i.posthog.com',
		});
	});

	it('strips trailing slashes from a valid host', () => {
		expect(resolveTelemetryConfig({ key: 'phc_abc', host: 'https://us.i.posthog.com/' })).toEqual({
			key: 'phc_abc',
			host: 'https://us.i.posthog.com',
		});
	});

	it('falls back to the EU default for an invalid host', () => {
		expect(resolveTelemetryConfig({ key: 'phc_abc', host: 'http://insecure.example' })).toEqual({
			key: 'phc_abc',
			host: DEFAULT_POSTHOG_HOST,
		});
	});

	it('trims surrounding whitespace from the key', () => {
		expect(resolveTelemetryConfig({ key: '  phc_abc  ' })).toEqual({
			key: 'phc_abc',
			host: DEFAULT_POSTHOG_HOST,
		});
	});
});
