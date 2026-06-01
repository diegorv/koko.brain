/**
 * PostHog ingestion host (EU cloud). The Tauri CSP only allows the EU posthog
 * hosts, so this is the single supported region.
 */
export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

/** Validated telemetry config ready to hand to `posthog.init()`. */
export interface TelemetryConfig {
	/** Non-empty PostHog project API key. */
	key: string;
	/** PostHog ingestion host. */
	host: string;
}

/**
 * Resolves the UI-entered PostHog token into a validated config.
 *
 * Returns `null` when no key is present so the caller can keep telemetry a
 * complete no-op (nothing imported, nothing sent). The host is always
 * {@link DEFAULT_POSTHOG_HOST} — the only region the Tauri CSP permits.
 */
export function resolveTelemetryConfig(key: string | undefined): TelemetryConfig | null {
	const trimmed = key?.trim() ?? '';
	if (!trimmed) return null;
	return { key: trimmed, host: DEFAULT_POSTHOG_HOST };
}
