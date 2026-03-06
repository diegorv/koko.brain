import { describe, it, expect } from 'vitest';
import { isHandshakeError } from '$lib/features/sync/sync.logic';

describe('isHandshakeError', () => {
	it('detects Noise handshake write failure', () => {
		expect(isHandshakeError('Noise handshake write failed: Decrypt')).toBe(true);
	});

	it('detects Noise handshake read failure', () => {
		expect(isHandshakeError('Noise handshake read failed: Decrypt')).toBe(true);
	});

	it('detects handshake timeout', () => {
		expect(isHandshakeError('Handshake timed out')).toBe(true);
	});

	it('detects connection timeout', () => {
		expect(isHandshakeError('Connection timed out')).toBe(true);
	});

	it('detects connection failure', () => {
		expect(isHandshakeError('Connection failed: Connection refused')).toBe(true);
	});

	it('detects generic Noise error', () => {
		expect(isHandshakeError('Failed to build Noise initiator: invalid key')).toBe(true);
	});

	it('detects transport mode failure', () => {
		expect(isHandshakeError('Failed to enter transport mode: Noise error')).toBe(true);
	});

	it('returns false for unrelated errors', () => {
		expect(isHandshakeError('File not found: notes/test.md')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isHandshakeError('')).toBe(false);
	});

	it('returns false for generic sync error', () => {
		expect(isHandshakeError('Manifest HMAC verification failed')).toBe(false);
	});

	it('returns false for file integrity error', () => {
		expect(isHandshakeError('File integrity check failed for notes/hello.md')).toBe(false);
	});

	it('is case-insensitive', () => {
		expect(isHandshakeError('HANDSHAKE TIMED OUT')).toBe(true);
		expect(isHandshakeError('NOISE HANDSHAKE WRITE FAILED')).toBe(true);
	});
});
