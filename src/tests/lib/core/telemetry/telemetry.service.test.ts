import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the external PostHog SDK and the Tauri APIs the service touches.
// Stores and the telemetry.logic module are NOT mocked (real implementations).
const { mockPosthog } = vi.hoisted(() => ({
	mockPosthog: {
		init: vi.fn(),
		identify: vi.fn(),
		capture: vi.fn(),
		opt_out_capturing: vi.fn(),
		reset: vi.fn(),
	},
}));
vi.mock('posthog-js', () => ({ default: mockPosthog }));

const { fsMock } = vi.hoisted(() => ({
	fsMock: {
		exists: vi.fn(),
		mkdir: vi.fn(),
		readTextFile: vi.fn(),
		writeTextFile: vi.fn(),
	},
}));
vi.mock('@tauri-apps/plugin-fs', () => fsMock);

vi.mock('@tauri-apps/api/path', () => ({
	appConfigDir: vi.fn(async () => '/cfg'),
	join: vi.fn(async (...parts: string[]) => parts.join('/')),
}));

/**
 * Loads a fresh copy of the service (and the store from the same fresh
 * module graph) so the module-level posthog instance + anon-id cache reset
 * between tests.
 */
async function loadFresh() {
	const svc = await import('$lib/core/telemetry/telemetry.service');
	const { settingsStore } = await import('$lib/core/settings/settings.store.svelte');
	return { svc, settingsStore };
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	fsMock.exists.mockResolvedValue(false);
	fsMock.mkdir.mockResolvedValue(undefined);
	fsMock.readTextFile.mockResolvedValue('{}');
	fsMock.writeTextFile.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getOrCreateAnonymousId', () => {
	it('generates and persists a new id when the file is missing', async () => {
		const { svc } = await loadFresh();
		const id = await svc.getOrCreateAnonymousId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
		expect(fsMock.mkdir).toHaveBeenCalledWith('/cfg', { recursive: true });
		expect(fsMock.writeTextFile).toHaveBeenCalledTimes(1);
		const [path, content] = fsMock.writeTextFile.mock.calls[0];
		expect(path).toBe('/cfg/telemetry-id.json');
		expect(JSON.parse(content).anonymousId).toBe(id);
	});

	it('returns the persisted id when the file exists', async () => {
		fsMock.exists.mockResolvedValue(true);
		fsMock.readTextFile.mockResolvedValue(JSON.stringify({ anonymousId: 'fixed-id' }));
		const { svc } = await loadFresh();
		expect(await svc.getOrCreateAnonymousId()).toBe('fixed-id');
		expect(fsMock.writeTextFile).not.toHaveBeenCalled();
	});

	it('caches the id and does not re-read on the second call', async () => {
		fsMock.exists.mockResolvedValue(true);
		fsMock.readTextFile.mockResolvedValue(JSON.stringify({ anonymousId: 'fixed-id' }));
		const { svc } = await loadFresh();
		await svc.getOrCreateAnonymousId();
		await svc.getOrCreateAnonymousId();
		expect(fsMock.exists).toHaveBeenCalledTimes(1);
	});

	it('regenerates when the stored record has no usable id', async () => {
		fsMock.exists.mockResolvedValue(true);
		fsMock.readTextFile.mockResolvedValue(JSON.stringify({ foo: 1 }));
		const { svc } = await loadFresh();
		const id = await svc.getOrCreateAnonymousId();
		expect(id.length).toBeGreaterThan(0);
		expect(fsMock.writeTextFile).toHaveBeenCalledTimes(1);
	});

	it('falls back to an ephemeral id on filesystem error', async () => {
		fsMock.exists.mockRejectedValue(new Error('boom'));
		const { svc } = await loadFresh();
		const id = await svc.getOrCreateAnonymousId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
	});
});

describe('initTelemetry', () => {
	it('does nothing when no token is set', async () => {
		vi.stubGlobal('window', {});
		const { svc } = await loadFresh();
		await svc.initTelemetry();
		expect(mockPosthog.init).not.toHaveBeenCalled();
	});

	it('initializes with privacy-first options and identifies the install', async () => {
		vi.stubGlobal('window', {});
		fsMock.exists.mockResolvedValue(true);
		fsMock.readTextFile.mockResolvedValue(JSON.stringify({ anonymousId: 'fixed-id' }));
		const { svc, settingsStore } = await loadFresh();
		settingsStore.updatePosthogToken('phc_test');
		await svc.initTelemetry();
		expect(mockPosthog.init).toHaveBeenCalledWith(
			'phc_test',
			expect.objectContaining({
				api_host: 'https://eu.i.posthog.com',
				autocapture: false,
				capture_pageview: false,
				persistence: 'memory',
				disable_session_recording: true,
			}),
		);
		expect(mockPosthog.identify).toHaveBeenCalledWith(
			'fixed-id',
			expect.objectContaining({ release_channel: expect.any(String) }),
		);
	});

	it('is idempotent — a second call does not re-init', async () => {
		vi.stubGlobal('window', {});
		const { svc, settingsStore } = await loadFresh();
		settingsStore.updatePosthogToken('phc_test');
		await svc.initTelemetry();
		await svc.initTelemetry();
		expect(mockPosthog.init).toHaveBeenCalledTimes(1);
	});

	it('does not init in a non-browser environment (no window)', async () => {
		// Default vitest environment is node, so window is undefined here.
		const { svc, settingsStore } = await loadFresh();
		settingsStore.updatePosthogToken('phc_test');
		await svc.initTelemetry();
		expect(mockPosthog.init).not.toHaveBeenCalled();
	});
});

describe('trackEvent', () => {
	it('is a no-op before init', async () => {
		const { svc } = await loadFresh();
		expect(() => svc.trackEvent('x', { a: 1 })).not.toThrow();
		expect(mockPosthog.capture).not.toHaveBeenCalled();
	});

	it('captures the event after init', async () => {
		vi.stubGlobal('window', {});
		const { svc, settingsStore } = await loadFresh();
		settingsStore.updatePosthogToken('phc_test');
		await svc.initTelemetry();
		svc.trackEvent('vault_opened', { n: 3 });
		expect(mockPosthog.capture).toHaveBeenCalledWith('vault_opened', { n: 3 });
	});
});

describe('teardownTelemetry', () => {
	it('opts out, resets, and stops capturing afterwards', async () => {
		vi.stubGlobal('window', {});
		const { svc, settingsStore } = await loadFresh();
		settingsStore.updatePosthogToken('phc_test');
		await svc.initTelemetry();
		svc.teardownTelemetry();
		expect(mockPosthog.opt_out_capturing).toHaveBeenCalled();
		expect(mockPosthog.reset).toHaveBeenCalled();
		mockPosthog.capture.mockClear();
		svc.trackEvent('after', { a: 1 });
		expect(mockPosthog.capture).not.toHaveBeenCalled();
	});

	it('is idempotent when telemetry is not running', async () => {
		const { svc } = await loadFresh();
		expect(() => svc.teardownTelemetry()).not.toThrow();
		expect(mockPosthog.opt_out_capturing).not.toHaveBeenCalled();
	});
});

describe('product-analytics wrappers', () => {
	async function loadInitialized() {
		vi.stubGlobal('window', {});
		const { svc, settingsStore } = await loadFresh();
		settingsStore.updatePosthogToken('phc_test');
		await svc.initTelemetry();
		const pa = await import('$lib/core/telemetry/product-analytics');
		return pa;
	}

	it('trackTelemetryOptedIn captures telemetry_opted_in', async () => {
		const pa = await loadInitialized();
		pa.trackTelemetryOptedIn();
		expect(mockPosthog.capture).toHaveBeenCalledWith('telemetry_opted_in', undefined);
	});

	it('trackTelemetryOptedOut captures telemetry_opted_out', async () => {
		const pa = await loadInitialized();
		pa.trackTelemetryOptedOut();
		expect(mockPosthog.capture).toHaveBeenCalledWith('telemetry_opted_out', undefined);
	});

	it('trackVaultOpened captures vault_opened', async () => {
		const pa = await loadInitialized();
		pa.trackVaultOpened();
		expect(mockPosthog.capture).toHaveBeenCalledWith('vault_opened', undefined);
	});
});
