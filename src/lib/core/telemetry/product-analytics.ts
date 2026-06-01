import { trackEvent } from './telemetry.service';

/**
 * Domain-specific telemetry wrappers. Keeping event names and property
 * shapes in one place (rather than scattering raw `trackEvent` strings
 * across the app) makes the captured surface auditable and prevents typos
 * in event names. Every wrapper sends only primitive metadata, never note
 * content.
 */

/** Fired when the user enables analytics in Settings > Privacy. */
export function trackTelemetryOptedIn(): void {
	trackEvent('telemetry_opted_in');
}

/** Fired when the user disables analytics. Must be captured before teardown. */
export function trackTelemetryOptedOut(): void {
	trackEvent('telemetry_opted_out');
}

/** Fired once per vault open, after telemetry is initialized. */
export function trackVaultOpened(): void {
	trackEvent('vault_opened');
}
