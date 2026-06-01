/**
 * Default PostHog ingestion host (EU cloud). Used when `VITE_POSTHOG_HOST`
 * is unset or invalid. The Tauri CSP only allows the EU posthog hosts, so a
 * different region also requires a CSP change.
 */
export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

/** Raw build-time telemetry values, sourced from `import.meta.env`. */
export interface TelemetryEnv {
	/** PostHog project API key (`VITE_POSTHOG_KEY`). */
	key?: string;
	/** PostHog ingestion host (`VITE_POSTHOG_HOST`). */
	host?: string;
}

/** Validated telemetry config ready to hand to `posthog.init()`. */
export interface TelemetryConfig {
	/** Non-empty PostHog project API key. */
	key: string;
	/** Normalized https host with no trailing slash. */
	host: string;
}

/**
 * Returns true when `host` is a syntactically valid `https://` URL with a
 * non-empty hostname. Anything else (http, malformed, empty) is rejected.
 */
export function isValidPosthogHost(host: string): boolean {
	try {
		const url = new URL(host);
		return url.protocol === 'https:' && url.hostname.length > 0;
	} catch {
		return false;
	}
}

/**
 * Resolves build-time telemetry env vars into a validated config.
 *
 * Returns `null` when no API key is present so the caller can keep
 * telemetry a complete no-op (nothing imported, nothing sent). An empty or
 * invalid host falls back to {@link DEFAULT_POSTHOG_HOST}; a valid host has
 * trailing slashes stripped for a stable `api_host` value.
 */
export function resolveTelemetryConfig(env: TelemetryEnv): TelemetryConfig | null {
	const key = env.key?.trim() ?? '';
	if (!key) return null;
	const rawHost = env.host?.trim() ?? '';
	const host =
		rawHost && isValidPosthogHost(rawHost) ? rawHost.replace(/\/+$/, '') : DEFAULT_POSTHOG_HOST;
	return { key, host };
}
