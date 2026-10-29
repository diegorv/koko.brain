/** The subset of `Navigator` that platform detection reads. */
export interface PlatformNavigator {
	/** `navigator.platform`, e.g. "MacIntel", "Win32", "Linux x86_64". */
	platform?: string;
	/** `navigator.userAgent`, used when `platform` is empty. */
	userAgent?: string;
}

/** The modifier flags of a mouse event that link-click helpers read. */
export type LinkClickModifiers = Pick<MouseEvent, 'metaKey' | 'ctrlKey'>;

/**
 * Returns true when `nav` describes macOS. `navigator.platform` is deprecated
 * but still filled in by every Tauri webview (WKWebView, WebView2, WebKitGTK);
 * the user agent is the fallback.
 */
export function detectMac(nav: PlatformNavigator | undefined): boolean {
	if (!nav) return false;
	return /Mac/i.test(nav.platform || nav.userAgent || '');
}

/** True when the app runs on macOS. Detected once, at module load. */
export const IS_MAC = detectMac(typeof navigator === 'undefined' ? undefined : navigator);

/**
 * True when a click carries the platform's "open link" modifier: Cmd on macOS,
 * Ctrl on Windows/Linux. On macOS a click with Ctrl held is a context-menu
 * click, so Cmd+Ctrl does not count.
 */
export function isOpenLinkModifier(e: LinkClickModifiers, mac: boolean): boolean {
	return mac ? e.metaKey && !e.ctrlKey : e.ctrlKey;
}

/**
 * True for a macOS Ctrl+click. It arrives as a primary-button mousedown with
 * `ctrlKey`, but the user means the context menu, so it must not navigate.
 */
export function isMacContextClick(e: LinkClickModifiers, mac: boolean): boolean {
	return mac && e.ctrlKey;
}
