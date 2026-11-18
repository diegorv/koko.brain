import { describe, it, expect, beforeEach } from 'vitest';

import { zoomStore } from '#lib/core/zoom/zoom.store.svelte.js';

describe('zoomStore', () => {
	beforeEach(() => {
		zoomStore._reset();
	});

	describe('level', () => {
		it('starts at 1', () => {
			expect(zoomStore.level).toBe(1);
		});

		it('returns the level set last', () => {
			zoomStore.setLevel(1.25);
			expect(zoomStore.level).toBe(1.25);

			zoomStore.setLevel(0.5);
			expect(zoomStore.level).toBe(0.5);
		});
	});

	describe('chipVisible', () => {
		it('starts hidden', () => {
			expect(zoomStore.chipVisible).toBe(false);
		});

		it('is true after showChip and false after hideChip', () => {
			zoomStore.showChip();
			expect(zoomStore.chipVisible).toBe(true);

			zoomStore.hideChip();
			expect(zoomStore.chipVisible).toBe(false);
		});

		it('does not change the level', () => {
			zoomStore.setLevel(1.5);
			zoomStore.showChip();
			zoomStore.hideChip();
			expect(zoomStore.level).toBe(1.5);
		});
	});

	describe('_reset', () => {
		it('restores level 1 and a hidden chip', () => {
			zoomStore.setLevel(2);
			zoomStore.showChip();

			zoomStore._reset();

			expect(zoomStore.level).toBe(1);
			expect(zoomStore.chipVisible).toBe(false);
		});
	});
});
