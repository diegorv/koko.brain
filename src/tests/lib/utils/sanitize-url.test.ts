import { describe, it, expect } from 'vitest';
import { isSafeUrl } from '$lib/utils/sanitize-url';

describe('isSafeUrl', () => {
	it('allows http URLs', () => {
		expect(isSafeUrl('http://example.com')).toBe(true);
	});

	it('allows https URLs', () => {
		expect(isSafeUrl('https://example.com/page?q=1')).toBe(true);
	});

	it('allows relative paths', () => {
		expect(isSafeUrl('./image.png')).toBe(true);
		expect(isSafeUrl('../docs/file.md')).toBe(true);
	});

	it('allows mailto protocol', () => {
		expect(isSafeUrl('mailto:user@example.com')).toBe(true);
	});

	it('allows tel protocol', () => {
		expect(isSafeUrl('tel:+1234567890')).toBe(true);
	});

	it('allows fragment-only links', () => {
		expect(isSafeUrl('#section')).toBe(true);
	});

	it('allows bare text without protocol as relative path', () => {
		expect(isSafeUrl('image.png')).toBe(true);
		expect(isSafeUrl('folder/file.md')).toBe(true);
	});

	it('blocks javascript: protocol', () => {
		expect(isSafeUrl('javascript:alert(1)')).toBe(false);
	});

	it('blocks javascript: with mixed case', () => {
		expect(isSafeUrl('JavaScript:alert(1)')).toBe(false);
		expect(isSafeUrl('JAVASCRIPT:void(0)')).toBe(false);
	});

	it('blocks javascript: with leading whitespace', () => {
		expect(isSafeUrl('  javascript:alert(1)')).toBe(false);
	});

	it('blocks vbscript: protocol', () => {
		expect(isSafeUrl('vbscript:MsgBox("XSS")')).toBe(false);
	});

	it('blocks data: URLs', () => {
		expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
		expect(isSafeUrl('data:image/png;base64,iVBOR...')).toBe(false);
		expect(isSafeUrl('data:image/svg+xml,<svg onload="alert(1)"/>')).toBe(false);
		expect(isSafeUrl('data:text/javascript,alert(1)')).toBe(false);
	});

	it('blocks file: protocol', () => {
		expect(isSafeUrl('file:///etc/passwd')).toBe(false);
	});

	it('blocks blob: protocol', () => {
		expect(isSafeUrl('blob:https://example.com/uuid')).toBe(false);
	});

	it('blocks unknown protocols', () => {
		expect(isSafeUrl('custom:something')).toBe(false);
	});

	it('blocks protocol-relative URLs', () => {
		expect(isSafeUrl('//evil.com/payload')).toBe(false);
	});

	it('blocks protocol-relative URLs with whitespace', () => {
		expect(isSafeUrl('  //evil.com/payload')).toBe(false);
	});
});
