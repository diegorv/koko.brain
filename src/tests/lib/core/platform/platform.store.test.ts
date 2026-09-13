import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { platformStore } from '$lib/core/platform/platform.store.svelte';

/** Replaces `globalThis.navigator` for one test and restores it afterwards. */
function withNavigator(userAgent: string, maxTouchPoints: number): () => void {
	const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
	Object.defineProperty(globalThis, 'navigator', {
		value: { userAgent, maxTouchPoints },
		configurable: true,
		writable: true,
	});
	return () => {
		if (previous) Object.defineProperty(globalThis, 'navigator', previous);
		else delete (globalThis as { navigator?: unknown }).navigator;
	};
}

describe('platformStore', () => {
	let restoreNavigator: (() => void) | null = null;

	beforeEach(() => {
		platformStore._reset();
	});

	afterEach(() => {
		restoreNavigator?.();
		restoreNavigator = null;
		platformStore._reset();
	});

	it('defaults to desktop when no navigator is available', () => {
		restoreNavigator = withNavigator('', 0);
		delete (globalThis as { navigator?: unknown }).navigator;
		platformStore._reset();

		expect(platformStore.platform).toBe('desktop');
		expect(platformStore.isMobile).toBe(false);
	});

	it('detects ios from the navigator on reset', () => {
		restoreNavigator = withNavigator(
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
			5,
		);
		platformStore._reset();

		expect(platformStore.platform).toBe('ios');
		expect(platformStore.isMobile).toBe(true);
	});

	it('detects an iPad with a desktop-class user agent from its touch points', () => {
		restoreNavigator = withNavigator(
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
			5,
		);
		platformStore._reset();

		expect(platformStore.platform).toBe('ios');
		expect(platformStore.isMobile).toBe(true);
	});

	it('treats a navigator without maxTouchPoints as desktop', () => {
		restoreNavigator = withNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', undefined as unknown as number);
		platformStore._reset();

		expect(platformStore.platform).toBe('desktop');
		expect(platformStore.isMobile).toBe(false);
	});

	it('_setPlatform overrides detection and isMobile follows it', () => {
		platformStore._setPlatform('android');
		expect(platformStore.platform).toBe('android');
		expect(platformStore.isMobile).toBe(true);

		platformStore._setPlatform('desktop');
		expect(platformStore.isMobile).toBe(false);
	});
});
