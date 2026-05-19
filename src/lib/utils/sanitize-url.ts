/** Protocols known to be safe for navigation and resource loading */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/** Returns true if the URL is safe to open or use as a resource src */
export function isSafeUrl(url: string): boolean {
	const lower = url.trim().toLowerCase();
	// Reject protocol-relative URLs (e.g. //evil.com)
	if (lower.startsWith('//')) return false;
	// Relative URLs and fragment-only links are safe
	if (lower.startsWith('.') || lower.startsWith('/') || lower.startsWith('#')) return true;
	// URLs without a protocol scheme are treated as relative paths
	const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(lower);
	if (!hasProtocol) return true;
	return SAFE_PROTOCOLS.some((p) => lower.startsWith(p));
}

/**
 * Converts a `file://` URL to a filesystem path the Tauri asset protocol can
 * resolve. Returns null when the URL is malformed, uses a different protocol,
 * or carries a non-local host (SMB / UNC paths like `file://server/share/x.png`
 * are rejected outright).
 *
 * Handles Windows drive paths (`file:///C:/foo` -> `C:/foo`) and percent-
 * decodes the path so spaces and other reserved characters survive the
 * round-trip (capture deep-links emit `file:///.../CleanShot%202026...png`
 * style URLs).
 *
 * The SMB rejection is a security invariant: callers like `ImageWidget` (live
 * preview) and the canvas `ImageNode` must agree on which file URLs are even
 * eligible to be forwarded to `convertFileSrc`. Keep this as the single
 * source of truth.
 */
export function fileUrlToFsPath(fileUrl: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(fileUrl);
	} catch {
		return null;
	}
	if (parsed.protocol !== 'file:') return null;
	if (parsed.host && parsed.host !== 'localhost') return null;
	let path = decodeURIComponent(parsed.pathname);
	// Windows: `/C:/foo` -> `C:/foo`
	if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1);
	return path;
}
