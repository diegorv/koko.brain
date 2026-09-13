/** Platform family the webview is running on. */
export type PlatformKind = 'desktop' | 'ios' | 'android';

/**
 * Classifies the host platform from the navigator's user agent string and
 * touch-point count.
 *
 * iPadOS 13+ ships a desktop-class user agent (`Macintosh`) inside WKWebView;
 * the only reliable tell is `navigator.maxTouchPoints > 1`, which no Mac
 * reports. iPhone and iPod keep their own tokens. Everything that is neither
 * Apple mobile nor Android is treated as desktop, so an unknown or empty user
 * agent keeps the full desktop feature set.
 */
export function detectPlatform(userAgent: string, maxTouchPoints: number): PlatformKind {
	if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
	if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ios';
	if (/Android/.test(userAgent)) return 'android';
	return 'desktop';
}

/**
 * Whether the platform runs the reduced mobile feature set: no semantic
 * search, no updater, no quick capture, no native menu, single window,
 * touch-first layout.
 */
export function isMobilePlatform(kind: PlatformKind): boolean {
	return kind !== 'desktop';
}
