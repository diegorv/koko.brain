import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/browser', () => ({
	init: vi.fn(),
	close: vi.fn(() => Promise.resolve(true)),
	withScope: vi.fn((callback) => callback({ setTag: vi.fn() })),
	captureException: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));

import * as Sentry from '@sentry/browser';
import { invoke } from '@tauri-apps/api/core';
import { captureSentryException, configureSentry, disableSentry, isSentryActive } from '$lib/core/settings/sentry.service';

const VALID_DSN = 'https://public-key@o1.ingest.sentry.io/2';

describe('configureSentry', () => {
	beforeEach(async () => {
		await disableSentry();
		vi.clearAllMocks();
	});

	it('does not initialize a client while monitoring is disabled', async () => {
		await expect(configureSentry({ enabled: false, dsn: VALID_DSN })).resolves.toBe('disabled');

		expect(isSentryActive()).toBe(false);
		expect(Sentry.init).not.toHaveBeenCalled();
		expect(invoke).toHaveBeenCalledWith('configure_sentry', {
			enabled: false,
			dsn: '',
			release: expect.stringMatching(/^kokobrain@/),
		});
	});

	it('does not initialize a client when opt-in lacks a valid DSN', async () => {
		await expect(configureSentry({ enabled: true, dsn: 'not a DSN' })).resolves.toBe('invalid-dsn');

		expect(isSentryActive()).toBe(false);
		expect(Sentry.init).not.toHaveBeenCalled();
		expect(invoke).toHaveBeenCalledWith('configure_sentry', {
			enabled: false,
			dsn: '',
			release: expect.stringMatching(/^kokobrain@/),
		});
	});

	it('initializes error-only monitoring with strict data filtering after explicit opt-in', async () => {
		await expect(configureSentry({ enabled: true, dsn: VALID_DSN })).resolves.toBe('enabled');

		expect(isSentryActive()).toBe(true);
		expect(Sentry.init).toHaveBeenCalledTimes(1);
		const options = vi.mocked(Sentry.init).mock.calls[0][0]!;
		expect(options.dsn).toBe(VALID_DSN);
		expect(invoke).toHaveBeenCalledWith('configure_sentry', {
			enabled: true,
			dsn: VALID_DSN,
			release: expect.stringMatching(/^kokobrain@/),
		});
		expect(options.dataCollection).toMatchObject({
			userInfo: false,
			cookies: false,
			httpHeaders: { request: false, response: false },
			httpBodies: [],
			urlQueryParams: false,
			stackFrameVariables: false,
			frameContextLines: 0,
		});

		const defaults = [
			{ name: 'Breadcrumbs' },
			{ name: 'GlobalHandlers' },
			{ name: 'BrowserSession' },
		] as never[];
		const integrations = typeof options.integrations === 'function'
			? options.integrations(defaults)
			: options.integrations;
		expect(integrations).toEqual([{ name: 'GlobalHandlers' }]);

		const event = await options.beforeSend!({
			type: undefined,
			breadcrumbs: [{ category: 'ui.click' }],
			extra: { note: 'private content' },
			request: { url: 'https://example.test/?token=private' },
			user: { email: 'person@example.test' },
		}, {});
		expect(event).toMatchObject({ type: undefined });
		expect(event?.breadcrumbs).toBeUndefined();
		expect(event?.extra).toBeUndefined();
		expect(event?.request).toBeUndefined();
		expect(event?.user).toBeUndefined();
	});

	it('captures handled errors only while the current vault enabled Sentry', async () => {
		captureSentryException('RUST', new Error('not configured'));
		expect(Sentry.captureException).not.toHaveBeenCalled();

		await configureSentry({ enabled: true, dsn: VALID_DSN });
		const exception = new Error('Rust command failed');
		captureSentryException('RUST', exception);

		expect(Sentry.withScope).toHaveBeenCalledTimes(1);
		expect(Sentry.captureException).toHaveBeenCalledWith(exception);
	});

	it('reconfigures only when the enabled DSN changes and closes on disable', async () => {
		await configureSentry({ enabled: true, dsn: VALID_DSN });
		await configureSentry({ enabled: true, dsn: VALID_DSN });
		await configureSentry({ enabled: true, dsn: 'https://other-key@o2.ingest.sentry.io/3' });
		await disableSentry();

		expect(Sentry.init).toHaveBeenCalledTimes(2);
		expect(Sentry.close).toHaveBeenCalledTimes(2);
		expect(isSentryActive()).toBe(false);
	});
});
