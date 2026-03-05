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
