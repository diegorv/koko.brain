import { describe, it, expect } from 'vitest';

import { DEFAULT_POSTHOG_HOST, resolveTelemetryConfig } from '$lib/core/telemetry/telemetry.logic';

describe('resolveTelemetryConfig', () => {
	it('returns null when no key is provided', () => {
		expect(resolveTelemetryConfig(undefined)).toBeNull();
	});

	it('returns null for an empty or whitespace-only key', () => {
		expect(resolveTelemetryConfig('')).toBeNull();
		expect(resolveTelemetryConfig('   ')).toBeNull();
	});

	it('resolves a key with the EU default host', () => {
		expect(resolveTelemetryConfig('phc_abc')).toEqual({
			key: 'phc_abc',
			host: DEFAULT_POSTHOG_HOST,
		});
	});

	it('trims surrounding whitespace from the key', () => {
		expect(resolveTelemetryConfig('  phc_abc  ')).toEqual({
			key: 'phc_abc',
			host: DEFAULT_POSTHOG_HOST,
		});
	});
});
