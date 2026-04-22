import { describe, it, expect, beforeEach } from 'vitest';

import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';

function el(text: string): HTMLElement {
	// In node there's no `document`, but vitest uses jsdom for tests that need it.
	// This file runs in the default environment since cache just stores references,
	// it doesn't need DOM. Use a minimal object with the right shape.
	return { dataset: { text } } as unknown as HTMLElement;
}

describe('queryjsSessionStore', () => {
	beforeEach(() => {
		queryjsSessionStore.reset();
	});

	describe('getCached / setCached', () => {
		it('returns null for an unknown hash', () => {
			expect(queryjsSessionStore.getCached('never')).toBeNull();
		});

		it('returns the stored element after setCached', () => {
			const e = el('first');
			queryjsSessionStore.setCached('hash-a', '/note.md', e);
			expect(queryjsSessionStore.getCached('hash-a')).toBe(e);
		});

		it('returns the LIVE reference (not a copy) across repeat calls', () => {
			const e = el('live');
			queryjsSessionStore.setCached('hash-a', '/note.md', e);
			expect(queryjsSessionStore.getCached('hash-a')).toBe(queryjsSessionStore.getCached('hash-a'));
		});

		it('overwrites when the same hash is set twice', () => {
			const a = el('a');
			const b = el('b');
			queryjsSessionStore.setCached('hash', '/note.md', a);
			queryjsSessionStore.setCached('hash', '/note.md', b);
			expect(queryjsSessionStore.getCached('hash')).toBe(b);
		});
	});

	describe('invalidate', () => {
		it('drops the hashed entry', () => {
			queryjsSessionStore.setCached('hash', '/n.md', el('x'));
			queryjsSessionStore.invalidate('hash');
			expect(queryjsSessionStore.getCached('hash')).toBeNull();
		});

		it('is a no-op for unknown hashes', () => {
			queryjsSessionStore.invalidate('nope');
			expect(queryjsSessionStore._snapshot()).toEqual({ cacheSize: 0, autoRunCount: 0 });
		});
	});

	describe('invalidatePath', () => {
		it('drops every entry for the given note path', () => {
			queryjsSessionStore.setCached('h1', '/a.md', el('1'));
			queryjsSessionStore.setCached('h2', '/a.md', el('2'));
			queryjsSessionStore.setCached('h3', '/b.md', el('3'));
			queryjsSessionStore.markAutoRun('/a.md');

			queryjsSessionStore.invalidatePath('/a.md');

			expect(queryjsSessionStore.getCached('h1')).toBeNull();
			expect(queryjsSessionStore.getCached('h2')).toBeNull();
			expect(queryjsSessionStore.getCached('h3')).not.toBeNull();
			expect(queryjsSessionStore.hasAutoRun('/a.md')).toBe(false);
		});

		it('preserves a shared hash when another note still references it', () => {
			// Same block copied into two notes → same hash, two paths
			const shared = el('shared');
			queryjsSessionStore.setCached('hash', '/a.md', shared);
			queryjsSessionStore.setCached('hash', '/b.md', shared);

			queryjsSessionStore.invalidatePath('/a.md');

			// b.md still uses the hash → cache entry survives
			expect(queryjsSessionStore.getCached('hash')).toBe(shared);

			queryjsSessionStore.invalidatePath('/b.md');
			expect(queryjsSessionStore.getCached('hash')).toBeNull();
		});
	});

	describe('hasAutoRun / markAutoRun', () => {
		it('starts false for any path', () => {
			expect(queryjsSessionStore.hasAutoRun('/any.md')).toBe(false);
		});

		it('returns true after markAutoRun', () => {
			queryjsSessionStore.markAutoRun('/note.md');
			expect(queryjsSessionStore.hasAutoRun('/note.md')).toBe(true);
		});

		it('is path-scoped', () => {
			queryjsSessionStore.markAutoRun('/a.md');
			expect(queryjsSessionStore.hasAutoRun('/b.md')).toBe(false);
		});
	});

	describe('reset', () => {
		it('clears cache, autoRun set and path index', () => {
			queryjsSessionStore.setCached('h1', '/a.md', el('1'));
			queryjsSessionStore.markAutoRun('/a.md');

			queryjsSessionStore.reset();

			expect(queryjsSessionStore.getCached('h1')).toBeNull();
			expect(queryjsSessionStore.hasAutoRun('/a.md')).toBe(false);
			expect(queryjsSessionStore._snapshot()).toEqual({ cacheSize: 0, autoRunCount: 0 });
		});
	});
});
