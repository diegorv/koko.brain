import type { PostHog } from 'posthog-js';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { getBuildChannel } from '$lib/utils/app-channel';
import { debug, error } from '$lib/utils/debug';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { resolveTelemetryConfig, type TelemetryConfig } from './telemetry.logic';

/**
 * Filename of the per-install anonymous id record, stored in the Tauri
 * app-config dir (outside any vault) so it is stable across vaults and
 * survives vault switches.
 */
const ANON_ID_FILE = 'telemetry-id.json';

/**
 * The live PostHog instance once telemetry is initialized, or null while
 * disabled. Module-level so init/teardown/trackEvent share one instance.
 */
let posthogInstance: PostHog | null = null;

/** In-memory cache of the resolved anonymous id to avoid re-reading the file. */
let cachedAnonymousId: string | null = null;

/**
 * Resolves telemetry config. The UI-entered `posthogToken` setting takes
 * precedence; the build-time `VITE_POSTHOG_KEY` is the fallback. Host comes
 * from `VITE_POSTHOG_HOST` or the EU default.
 */
function getTelemetryConfig(): TelemetryConfig | null {
	const key = settingsStore.posthogToken?.trim() || import.meta.env.VITE_POSTHOG_KEY;
	return resolveTelemetryConfig({
		key,
		host: import.meta.env.VITE_POSTHOG_HOST,
	});
}

/**
 * Returns the stable per-install anonymous id, reading it from the
 * app-config dir or generating + persisting a fresh UUID on first run.
 * Never throws: on any filesystem failure it falls back to an ephemeral
 * session id so `identify()` still has a value.
 */
export async function getOrCreateAnonymousId(): Promise<string> {
	if (cachedAnonymousId) return cachedAnonymousId;
	try {
		const dir = await appConfigDir();
		const file = await join(dir, ANON_ID_FILE);
		if (await exists(file)) {
			const parsed = JSON.parse(await readTextFile(file)) as { anonymousId?: unknown };
			if (typeof parsed.anonymousId === 'string' && parsed.anonymousId) {
				cachedAnonymousId = parsed.anonymousId;
				return cachedAnonymousId;
			}
		}
		const id = crypto.randomUUID();
		await mkdir(dir, { recursive: true });
		await writeTextFile(file, JSON.stringify({ anonymousId: id, createdAt: Date.now() }, null, 2));
		cachedAnonymousId = id;
		return id;
	} catch (err) {
		error('TELEMETRY', 'Failed to read/create anonymous id:', err);
		if (!cachedAnonymousId) cachedAnonymousId = crypto.randomUUID();
		return cachedAnonymousId;
	}
}

/**
 * Initializes PostHog with privacy-first options (no autocapture, no
 * pageviews, no session recording, memory-only persistence) and identifies
 * the install via its anonymous id.
 *
 * Idempotent — a second call while already initialized is a no-op. Errors
 * are logged and swallowed on purpose: telemetry is best-effort and must
 * never break vault initialization or a settings toggle. The caller does
 * not need to handle a rejection.
 */
export async function initTelemetry(): Promise<void> {
	if (posthogInstance) return;
	if (typeof window === 'undefined') return;
	const config = getTelemetryConfig();
	if (!config) {
		debug('TELEMETRY', 'No PostHog key configured — telemetry disabled');
		return;
	}
	try {
		const anonymousId = await getOrCreateAnonymousId();
		const posthog = (await import('posthog-js')).default;
		posthog.init(config.key, {
			api_host: config.host,
			autocapture: false,
			capture_pageview: false,
			persistence: 'memory',
			disable_session_recording: true,
		});
		posthog.identify(anonymousId, { release_channel: getBuildChannel() });
		posthogInstance = posthog;
		debug('TELEMETRY', 'PostHog initialized');
	} catch (err) {
		error('TELEMETRY', 'Failed to initialize PostHog:', err);
	}
}

/**
 * Stops capturing, opts the install out, and drops the instance. Idempotent
 * — a no-op when telemetry is not running. Called on opt-out and on vault
 * teardown.
 */
export function teardownTelemetry(): void {
	if (!posthogInstance) return;
	try {
		posthogInstance.opt_out_capturing();
		posthogInstance.reset();
	} catch (err) {
		error('TELEMETRY', 'Failed to tear down PostHog:', err);
	}
	posthogInstance = null;
}

/**
 * Captures a custom event. No-op when telemetry is disabled. Property values
 * are restricted to primitives so note content can never be sent by accident.
 */
export function trackEvent(name: string, properties?: Record<string, string | number>): void {
	posthogInstance?.capture(name, properties);
}
