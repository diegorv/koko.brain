/** On-disk format for an encrypted note (parsed from the .md file) */
export interface EncryptedPayload {
	/** Format version (e.g. "1.0") */
	kokobrain_encrypted: string;
	/** Base64-encoded 12-byte initialization vector */
	iv: string;
	/** Base64-encoded AES-256-GCM ciphertext (includes 16-byte auth tag) */
	data: string;
}
