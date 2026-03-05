import type { EncryptedPayload } from './encrypted-notes.types';

/**
 * Checks whether a file's content is an encrypted note.
 * Tries JSON.parse and looks for the `kokobrain_encrypted` field.
 * Returns false for regular markdown or invalid JSON.
 */
export function isEncryptedContent(content: string): boolean {
	if (!content.startsWith('{')) return false;
	try {
		const parsed = JSON.parse(content);
		return (
			typeof parsed === 'object' &&
			parsed !== null &&
			typeof parsed.kokobrain_encrypted === 'string'
		);
	} catch {
		return false;
	}
}

/**
 * Parses and validates an encrypted note's JSON content.
 * Throws on invalid format or missing fields.
 */
export function parseEncryptedPayload(content: string): EncryptedPayload {
	const parsed = JSON.parse(content);
	if (typeof parsed.kokobrain_encrypted !== 'string') {
		throw new Error('Missing or invalid "kokobrain_encrypted" field');
	}
	if (typeof parsed.iv !== 'string') {
		throw new Error('Missing or invalid "iv" field');
	}
	if (typeof parsed.data !== 'string') {
		throw new Error('Missing or invalid "data" field');
	}
	return {
		kokobrain_encrypted: parsed.kokobrain_encrypted,
		iv: parsed.iv,
		data: parsed.data,
	};
}

/** Serializes an encrypted payload to pretty-printed JSON for disk storage */
export function serializeEncryptedPayload(payload: EncryptedPayload): string {
	return JSON.stringify(payload, null, 2);
}
