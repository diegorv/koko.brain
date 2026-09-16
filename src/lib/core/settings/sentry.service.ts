import * as Sentry from '@sentry/browser';
import { invoke } from '@tauri-apps/api/core';
import type { SentrySettings } from './settings.types';
import { isValidSentryDsn } from './sentry.logic';

/** Result of applying a vault's Sentry settings to the runtime client. */
export type SentryConfigurationResult = 'enabled' | 'disabled' | 'invalid-dsn';

/** DSN currently bound to the Sentry client, or null when no client may send events. */
let activeDsn: string | null = null;

/** Serializes reconfiguration while a user types or switches vaults rapidly. */
let configurationQueue: Promise<void> = Promise.resolve();

/** Returns the stable release identifier attached to frontend and Rust error events. */
function sentryRelease(): string {
	const buildInfo = typeof __BUILD_INFO__ === 'string' ? __BUILD_INFO__ : 'unknown';
	return `kokobrain@${buildInfo.split(' ')[0]}`;
}

/**
 * Removes data which can contain note text or user information from an event
 * after all SDK integrations have processed it, immediately before it is sent.
 */
function removeSensitiveEventData(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
	return {
		...event,
		breadcrumbs: undefined,
		extra: undefined,
		request: undefined,
		user: undefined,
	};
}

/** Applies one Sentry configuration after any prior enable/disable operation completes. */
async function applySentryConfiguration(settings: SentrySettings): Promise<SentryConfigurationResult> {
	const dsn = settings.dsn.trim();
	const shouldEnable = settings.enabled && isValidSentryDsn(dsn);

	if (activeDsn === dsn && shouldEnable) return 'enabled';

	if (activeDsn !== null) {
		await Sentry.close(2000);
		activeDsn = null;
	}

	await invoke('configure_sentry', {
		enabled: shouldEnable,
		dsn: shouldEnable ? dsn : '',
		release: sentryRelease(),
	});

	if (!shouldEnable) return settings.enabled ? 'invalid-dsn' : 'disabled';

	Sentry.init({
		dsn,
		release: sentryRelease(),
		// No tracing, replay, sessions, persistent conversation IDs, request
		// context, or breadcrumbs: this opt-in is error monitoring only.
		integrations: (defaults) => defaults.filter((integration) => [
			'InboundFilters',
			'FunctionToString',
			'BrowserApiErrors',
			'GlobalHandlers',
			'LinkedErrors',
			'Dedupe',
		].includes(integration.name)),
		dataCollection: {
			userInfo: false,
			cookies: false,
			httpHeaders: { request: false, response: false },
			httpBodies: [],
			urlQueryParams: false,
			graphQL: { document: false, variables: false },
			genAI: { inputs: false, outputs: false },
			databaseQueryData: false,
			stackFrameVariables: false,
			frameContextLines: 0,
		},
		beforeSend: removeSensitiveEventData,
	});
	activeDsn = dsn;
	return 'enabled';
}

/**
 * Enables or disables error monitoring for one vault. A Sentry client is only
 * initialized when the user enabled the setting and supplied a valid Cloud DSN.
 */
export function configureSentry(settings: SentrySettings): Promise<SentryConfigurationResult> {
	const snapshot = { ...settings };
	const operation = configurationQueue.then(() => applySentryConfiguration(snapshot));
	configurationQueue = operation.then(() => undefined, () => undefined);
	return operation;
}

/** Disables the active Sentry client without changing persisted settings. */
export function disableSentry(): Promise<SentryConfigurationResult> {
	return configureSentry({ enabled: false, dsn: '' });
}

/** Returns whether this process currently has a Sentry client allowed to send error events. */
export function isSentryActive(): boolean {
	return activeDsn !== null;
}

/** Captures a handled application error only when the current vault opted in to Sentry. */
export function captureSentryException(tag: string, exception: unknown): void {
	if (activeDsn === null) return;
	Sentry.withScope((scope) => {
		scope.setTag('source', tag);
		Sentry.captureException(exception);
	});
}
