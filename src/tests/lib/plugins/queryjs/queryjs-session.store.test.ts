// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';

function makeEl(text: string): HTMLElement {
	const el = document.createElement('div');
	el.textContent = text;
	return el;
}

describe('queryjsSessionStore', () => {
	beforeEach(() => {
		queryjsSessionStore.reset();
	});

	describe('result cache', () => {
		it('starts empty', () => {
			expect(queryjsSessionStore.resultCache.size).toBe(0);
		});

		it('hasResult returns false for missing entries', () => {
			expect(queryjsSessionStore.hasResult('missing')).toBe(false);
		});

		it('setResult + getResult roundtrip', () => {
			const el = makeEl('rendered');
			queryjsSessionStore.setResult('hash-1', el);
			expect(queryjsSessionStore.getResult('hash-1')).toBe(el);
			expect(queryjsSessionStore.hasResult('hash-1')).toBe(true);
		});

		it('stores the LIVE element reference (not a clone)', () => {
			// Critical for <canvas> / <video> state preservation.
			const el = makeEl('rendered');
			queryjsSessionStore.setResult('hash-1', el);
			const retrieved = queryjsSessionStore.getResult('hash-1');
			expect(retrieved).toBe(el); // identity equality, not deep equal
		});

		it('invalidate drops one entry without affecting others', () => {
			queryjsSessionStore.setResult('a', makeEl('A'));
			queryjsSessionStore.setResult('b', makeEl('B'));
			queryjsSessionStore.invalidate('a');
			expect(queryjsSessionStore.hasResult('a')).toBe(false);
			expect(queryjsSessionStore.hasResult('b')).toBe(true);
		});

		it('invalidate of a missing key is a no-op (no throw)', () => {
			expect(() => queryjsSessionStore.invalidate('missing')).not.toThrow();
		});
	});

	describe('autoRunOnFirstOpen tracking', () => {
		it('starts empty', () => {
			expect(queryjsSessionStore.autoRunOnFirstOpen.size).toBe(0);
		});

		it('hasAutoRun is false until markAutoRun is called', () => {
			expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(false);
			queryjsSessionStore.markAutoRun('/vault/note.md');
			expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(true);
		});

		it('markAutoRun is idempotent', () => {
			queryjsSessionStore.markAutoRun('/vault/note.md');
			queryjsSessionStore.markAutoRun('/vault/note.md');
			expect(queryjsSessionStore.autoRunOnFirstOpen.size).toBe(1);
		});

		it('invalidatePath drops the marker (file is "fresh" again on next render)', () => {
			queryjsSessionStore.markAutoRun('/vault/note.md');
			queryjsSessionStore.invalidatePath('/vault/note.md');
			expect(queryjsSessionStore.hasAutoRun('/vault/note.md')).toBe(false);
		});

		it('invalidatePath only affects the named file, not siblings', () => {
			queryjsSessionStore.markAutoRun('/vault/a.md');
			queryjsSessionStore.markAutoRun('/vault/b.md');
			queryjsSessionStore.invalidatePath('/vault/a.md');
			expect(queryjsSessionStore.hasAutoRun('/vault/a.md')).toBe(false);
			expect(queryjsSessionStore.hasAutoRun('/vault/b.md')).toBe(true);
		});
	});

	describe('reset', () => {
		it('wipes both result cache and autoRun tracking', () => {
			queryjsSessionStore.setResult('hash', makeEl('x'));
			queryjsSessionStore.markAutoRun('/vault/note.md');
			queryjsSessionStore.reset();
			expect(queryjsSessionStore.resultCache.size).toBe(0);
			expect(queryjsSessionStore.autoRunOnFirstOpen.size).toBe(0);
		});
	});
});
