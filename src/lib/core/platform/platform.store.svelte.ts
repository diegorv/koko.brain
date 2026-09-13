import { detectPlatform, isMobilePlatform, type PlatformKind } from './platform.logic';

/**
 * Reads the platform from the global `navigator`. Falls back to desktop when
 * there is no navigator (vitest without jsdom, SSR pre-pass) so every code
 * path outside a real webview keeps the desktop behaviour it has today.
 */
function detectFromNavigator(): PlatformKind {
	if (typeof navigator === 'undefined') return 'desktop';
	return detectPlatform(navigator.userAgent ?? '', navigator.maxTouchPoints ?? 0);
}

/** Host platform, detected once at module load. */
let platform = $state<PlatformKind>(detectFromNavigator());

/**
 * Reactive store describing the host platform. Consumers read `isMobile` to
 * skip desktop-only IPC (semantic search, updater, quick capture) and to pick
 * the touch layout; nothing mutates it outside tests.
 */
export const platformStore = {
	/** Detected platform family. */
	get platform() { return platform; },
	/** True on iOS / iPadOS / Android, false on macOS / Windows / Linux. */
	get isMobile() { return isMobilePlatform(platform); },

	/** @internal Overrides the detected platform (for testing only). */
	_setPlatform(kind: PlatformKind) {
		platform = kind;
	},

	/** @internal Re-runs detection against the current navigator (for testing only). */
	_reset() {
		platform = detectFromNavigator();
	},
};
