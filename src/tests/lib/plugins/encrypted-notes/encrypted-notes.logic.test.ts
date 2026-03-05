import { describe, it, expect } from 'vitest';
import {
	isEncryptedContent,
	parseEncryptedPayload,
	serializeEncryptedPayload,
} from '$lib/plugins/encrypted-notes/encrypted-notes.logic';

describe('isEncryptedContent', () => {
	it('returns true for valid encrypted JSON', () => {
		const json = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'abc', data: 'def' });
		expect(isEncryptedContent(json)).toBe(true);
	});

	it('returns false for regular markdown', () => {
		expect(isEncryptedContent('# Hello World\n\nSome text.')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isEncryptedContent('')).toBe(false);
	});

	it('returns false for JSON without kokobrain_encrypted field', () => {
		expect(isEncryptedContent('{"foo": "bar"}')).toBe(false);
	});

	it('returns false for JSON array', () => {
		expect(isEncryptedContent('[1, 2, 3]')).toBe(false);
	});

	it('returns false for frontmatter starting with ---', () => {
		expect(isEncryptedContent('---\ntitle: test\n---\n# Hello')).toBe(false);
	});

	it('returns false for JSON with kokobrain_encrypted as number', () => {
		expect(isEncryptedContent('{"kokobrain_encrypted": 42}')).toBe(false);
	});

	it('returns false for null JSON value', () => {
		expect(isEncryptedContent('null')).toBe(false);
	});

	it('returns true regardless of extra fields', () => {
		const json = JSON.stringify({ kokobrain_encrypted: '2.0', iv: 'x', data: 'y', extra: true });
		expect(isEncryptedContent(json)).toBe(true);
	});
});

describe('parseEncryptedPayload', () => {
	it('parses valid payload', () => {
		const json = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'iv-data', data: 'cipher-data' });
		const result = parseEncryptedPayload(json);
		expect(result.kokobrain_encrypted).toBe('1.0');
		expect(result.iv).toBe('iv-data');
		expect(result.data).toBe('cipher-data');
	});

	it('throws on missing kokobrain_encrypted field', () => {
		const json = JSON.stringify({ iv: 'x', data: 'y' });
		expect(() => parseEncryptedPayload(json)).toThrow('kokobrain_encrypted');
	});

	it('throws on missing iv field', () => {
		const json = JSON.stringify({ kokobrain_encrypted: '1.0', data: 'x' });
		expect(() => parseEncryptedPayload(json)).toThrow('iv');
	});

	it('throws on missing data field', () => {
		const json = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'x' });
		expect(() => parseEncryptedPayload(json)).toThrow('data');
	});

	it('throws on invalid JSON', () => {
		expect(() => parseEncryptedPayload('not json')).toThrow();
	});

	it('ignores extra fields in output', () => {
		const json = JSON.stringify({ kokobrain_encrypted: '1.0', iv: 'a', data: 'b', extra: 'ignored' });
		const result = parseEncryptedPayload(json);
		expect(result).toEqual({ kokobrain_encrypted: '1.0', iv: 'a', data: 'b' });
		expect((result as unknown as Record<string, unknown>)['extra']).toBeUndefined();
	});

	it('throws when kokobrain_encrypted is not a string', () => {
		const json = JSON.stringify({ kokobrain_encrypted: 42, iv: 'a', data: 'b' });
		expect(() => parseEncryptedPayload(json)).toThrow('kokobrain_encrypted');
	});
});

describe('serializeEncryptedPayload', () => {
	it('roundtrips with parseEncryptedPayload', () => {
		const original = { kokobrain_encrypted: '1.0', iv: 'test-iv', data: 'test-data' };
		const json = serializeEncryptedPayload(original);
		const parsed = parseEncryptedPayload(json);
		expect(parsed).toEqual(original);
	});

	it('produces pretty-printed JSON', () => {
		const payload = { kokobrain_encrypted: '1.0', iv: 'a', data: 'b' };
		const json = serializeEncryptedPayload(payload);
		expect(json).toContain('\n');
		expect(json).toContain('  '); // 2-space indent
	});

	it('produces valid JSON', () => {
		const payload = { kokobrain_encrypted: '1.0', iv: 'a', data: 'b' };
		const json = serializeEncryptedPayload(payload);
		expect(() => JSON.parse(json)).not.toThrow();
	});
});
