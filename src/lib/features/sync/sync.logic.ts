/** Error message substrings that indicate a Noise handshake / connection failure,
 *  typically caused by mismatched passphrases between devices. */
const HANDSHAKE_ERROR_PATTERNS = [
	'handshake',
	'noise',
	'connection timed out',
	'connection failed',
];

/** Returns true if the error message indicates a Noise handshake failure,
 *  which usually means the passphrase doesn't match the other device. */
export function isHandshakeError(message: string): boolean {
	const lower = message.toLowerCase();
	return HANDSHAKE_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}
