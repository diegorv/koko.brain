/** Sentry Cloud ingestion domains allowed by the desktop application's CSP. */
const SENTRY_INGEST_DOMAINS = [
	'ingest.sentry.io',
	'ingest.us.sentry.io',
	'ingest.de.sentry.io',
] as const;

/**
 * Returns whether `value` is a Sentry Cloud project DSN that the app can send
 * to under its content-security policy. The public key and project ID must be
 * present so enabling monitoring with an incomplete value never opens a client.
 */
export function isValidSentryDsn(value: string): boolean {
	try {
		const url = new URL(value.trim());
		const isSentryIngestDomain = SENTRY_INGEST_DOMAINS.some(
			(domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
		);
		return (
			url.protocol === 'https:'
			&& isSentryIngestDomain
			&& Boolean(url.username)
			&& url.pathname.split('/').filter(Boolean).length === 1
		);
	} catch {
		return false;
	}
}
