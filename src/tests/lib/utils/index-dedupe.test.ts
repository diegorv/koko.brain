import { describe, it, expect, beforeEach } from 'vitest';
import {
	isAlreadyIndexed,
	markIndexed,
	clearIndexedEntry,
	clearAllIndexed,
} from '$lib/utils/index-dedupe';

describe('index-dedupe', () => {
	beforeEach(() => {
		clearAllIndexed();
	});

	it('returns false for an untracked path', () => {
		expect(isAlreadyIndexed('/vault/a.md', 'hello')).toBe(false);
	});

	it('returns true after markIndexed with same content', () => {
		markIndexed('/vault/a.md', 'hello');
		expect(isAlreadyIndexed('/vault/a.md', 'hello')).toBe(true);
	});

	it('returns false when the content changes', () => {
		markIndexed('/vault/a.md', 'hello');
		expect(isAlreadyIndexed('/vault/a.md', 'world')).toBe(false);
	});

	it('tracks paths independently', () => {
		markIndexed('/vault/a.md', 'foo');
		markIndexed('/vault/b.md', 'bar');
		expect(isAlreadyIndexed('/vault/a.md', 'foo')).toBe(true);
		expect(isAlreadyIndexed('/vault/b.md', 'bar')).toBe(true);
		expect(isAlreadyIndexed('/vault/a.md', 'bar')).toBe(false);
	});

	it('overwrites older content when markIndexed is called again', () => {
		markIndexed('/vault/a.md', 'v1');
		markIndexed('/vault/a.md', 'v2');
		expect(isAlreadyIndexed('/vault/a.md', 'v1')).toBe(false);
		expect(isAlreadyIndexed('/vault/a.md', 'v2')).toBe(true);
	});

	it('clearIndexedEntry removes only the given path', () => {
		markIndexed('/vault/a.md', 'foo');
		markIndexed('/vault/b.md', 'bar');
		clearIndexedEntry('/vault/a.md');
		expect(isAlreadyIndexed('/vault/a.md', 'foo')).toBe(false);
		expect(isAlreadyIndexed('/vault/b.md', 'bar')).toBe(true);
	});

	it('clearIndexedEntry on an untracked path is a no-op', () => {
		markIndexed('/vault/b.md', 'bar');
		clearIndexedEntry('/vault/never-tracked.md');
		expect(isAlreadyIndexed('/vault/b.md', 'bar')).toBe(true);
	});

	it('clearAllIndexed drops every signature', () => {
		markIndexed('/vault/a.md', 'foo');
		markIndexed('/vault/b.md', 'bar');
		clearAllIndexed();
		expect(isAlreadyIndexed('/vault/a.md', 'foo')).toBe(false);
		expect(isAlreadyIndexed('/vault/b.md', 'bar')).toBe(false);
	});

	it('handles empty-string content', () => {
		markIndexed('/vault/empty.md', '');
		expect(isAlreadyIndexed('/vault/empty.md', '')).toBe(true);
		expect(isAlreadyIndexed('/vault/empty.md', ' ')).toBe(false);
	});

	it('matches identical content passed as different string instances', () => {
		// Simulates the scenario where two callers build the same literal
		// independently (e.g. one reads from disk, one from the editor).
		const first = ['hello', ' ', 'world'].join('');
		const second = 'hello' + ' ' + 'world';
		markIndexed('/vault/x.md', first);
		expect(isAlreadyIndexed('/vault/x.md', second)).toBe(true);
	});
});
