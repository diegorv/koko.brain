import { describe, expect, it } from 'vitest';

import { isValidSentryDsn } from '$lib/core/settings/sentry.logic';

describe('isValidSentryDsn', () => {
	it('accepts a complete Sentry Cloud DSN in each allowed region', () => {
		expect(isValidSentryDsn('https://public-key@o1.ingest.sentry.io/2')).toBe(true);
		expect(isValidSentryDsn('https://public-key@o1.ingest.us.sentry.io/2')).toBe(true);
		expect(isValidSentryDsn('https://public-key@o1.ingest.de.sentry.io/2')).toBe(true);
	});

	it('trims surrounding whitespace before validation', () => {
		expect(isValidSentryDsn('  https://public-key@o1.ingest.sentry.io/2  ')).toBe(true);
	});

	it('rejects incomplete, insecure, or unsupported DSNs', () => {
		expect(isValidSentryDsn('')).toBe(false);
		expect(isValidSentryDsn('https://o1.ingest.sentry.io/2')).toBe(false);
		expect(isValidSentryDsn('http://public-key@o1.ingest.sentry.io/2')).toBe(false);
		expect(isValidSentryDsn('https://public-key@o1.ingest.sentry.io/')).toBe(false);
		expect(isValidSentryDsn('https://public-key@example.com/2')).toBe(false);
	});
});
