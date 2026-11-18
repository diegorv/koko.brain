// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSetZoom = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
	getCurrentWebviewWindow: () => ({ setZoom: mockSetZoom }),
}));

import { zoomIn, zoomOut, resetZoom, restoreZoom } from '#lib/core/zoom/zoom.service.js';
import { zoomStore } from '#lib/core/zoom/zoom.store.svelte.js';

const ZOOM_KEY = 'kokobrain:zoom';

describe('zoom.service', () => {
	beforeEach(async () => {
		// Fake timers for every case, so a hide timer started in one test never fires in another.
		vi.useFakeTimers();
		vi.clearAllMocks();
		await resetZoom(); // reset module state to 1.0
		vi.clearAllMocks(); // clear the setZoom call from resetZoom
		vi.clearAllTimers();
		localStorage.clear();
		zoomStore._reset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('zoomIn', () => {
		it('advances to the next zoom level from 1.0', async () => {
			await zoomIn();

			expect(mockSetZoom).toHaveBeenCalledWith(1.1);
		});

		it('advances through multiple steps correctly', async () => {
			await zoomIn(); // 1.0 → 1.1
			await zoomIn(); // 1.1 → 1.25

			expect(mockSetZoom).toHaveBeenLastCalledWith(1.25);
		});

		it('stays at maximum zoom level (2.0) when already at max', async () => {
			// advance to max
			for (let i = 0; i < 10; i++) await zoomIn();

			vi.clearAllMocks();
			await zoomIn();

			expect(mockSetZoom).toHaveBeenCalledWith(2.0);
		});

		it('calls setZoom exactly once per call', async () => {
			await zoomIn();

			expect(mockSetZoom).toHaveBeenCalledTimes(1);
		});
	});

	describe('zoomOut', () => {
		it('goes back to the previous zoom level from 1.0', async () => {
			await zoomOut();

			expect(mockSetZoom).toHaveBeenCalledWith(0.9);
		});

		it('advances through multiple steps correctly', async () => {
			await zoomOut(); // 1.0 → 0.9
			await zoomOut(); // 0.9 → 0.8

			expect(mockSetZoom).toHaveBeenLastCalledWith(0.8);
		});

		it('stays at minimum zoom level (0.5) when already at min', async () => {
			// go to min
			for (let i = 0; i < 10; i++) await zoomOut();

			vi.clearAllMocks();
			await zoomOut();

			expect(mockSetZoom).toHaveBeenCalledWith(0.5);
		});

		it('calls setZoom exactly once per call', async () => {
			await zoomOut();

			expect(mockSetZoom).toHaveBeenCalledTimes(1);
		});
	});

	describe('resetZoom', () => {
		it('resets to 1.0 from a zoomed-in state', async () => {
			await zoomIn();
			await zoomIn();
			vi.clearAllMocks();

			await resetZoom();

			expect(mockSetZoom).toHaveBeenCalledWith(1.0);
		});

		it('resets to 1.0 from a zoomed-out state', async () => {
			await zoomOut();
			vi.clearAllMocks();

			await resetZoom();

			expect(mockSetZoom).toHaveBeenCalledWith(1.0);
		});

		it('calls setZoom exactly once', async () => {
			await resetZoom();

			expect(mockSetZoom).toHaveBeenCalledTimes(1);
		});

		it('allows zoomIn to proceed normally after reset', async () => {
			await zoomIn();
			await zoomIn();
			await resetZoom();
			vi.clearAllMocks();

			await zoomIn();

			expect(mockSetZoom).toHaveBeenCalledWith(1.1);
		});
	});

	describe('remembered level', () => {
		it('stores the level after zoomIn', async () => {
			await zoomIn();

			expect(localStorage.getItem(ZOOM_KEY)).toBe('1.1');
		});

		it('removes the key on resetZoom', async () => {
			await zoomIn();
			await resetZoom();

			expect(localStorage.getItem(ZOOM_KEY)).toBeNull();
		});

		it('restoreZoom applies a stored level and the next zoomIn steps from it', async () => {
			localStorage.setItem(ZOOM_KEY, '1.25');

			await restoreZoom();

			expect(mockSetZoom).toHaveBeenCalledTimes(1);
			expect(mockSetZoom).toHaveBeenCalledWith(1.25);
			expect(zoomStore.level).toBe(1.25);

			await zoomIn();

			expect(mockSetZoom).toHaveBeenLastCalledWith(1.5);
		});

		it.each(['abc', '1.3', 'NaN', '1', null])('restoreZoom with %s makes no call and leaves 1.0', async (stored) => {
			if (stored !== null) localStorage.setItem(ZOOM_KEY, stored);

			await restoreZoom();

			expect(mockSetZoom).not.toHaveBeenCalled();
			expect(zoomStore.level).toBe(1);

			await zoomIn();

			expect(mockSetZoom).toHaveBeenCalledWith(1.1);
		});

		it('restoreZoom makes no call when storage throws', async () => {
			const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('blocked');
			});
			try {
				await restoreZoom();
			} finally {
				spy.mockRestore();
			}

			expect(mockSetZoom).not.toHaveBeenCalled();
		});

		it('a rejecting setZoom propagates and leaves the key and the level', async () => {
			await zoomIn();
			mockSetZoom.mockRejectedValueOnce(new Error('ipc failed'));

			await expect(zoomIn()).rejects.toThrow('ipc failed');

			expect(localStorage.getItem(ZOOM_KEY)).toBe('1.1');
			expect(zoomStore.level).toBe(1.1);
		});

		it('two zoomIn calls started without awaiting end at 1.25', async () => {
			await Promise.all([zoomIn(), zoomIn()]);

			expect(mockSetZoom).toHaveBeenNthCalledWith(1, 1.1);
			expect(mockSetZoom).toHaveBeenNthCalledWith(2, 1.25);
			expect(localStorage.getItem(ZOOM_KEY)).toBe('1.25');
			expect(zoomStore.level).toBe(1.25);
		});
	});

	describe('chip', () => {
		it('a change sets the level and shows the chip', async () => {
			await zoomIn();

			expect(zoomStore.level).toBe(1.1);
			expect(zoomStore.chipVisible).toBe(true);
		});

		it('hides the chip after 1500 ms', async () => {
			await zoomOut();

			vi.advanceTimersByTime(1499);
			expect(zoomStore.chipVisible).toBe(true);

			vi.advanceTimersByTime(1);
			expect(zoomStore.chipVisible).toBe(false);
		});

		it('a second change at 1000 ms keeps the chip until 2500 ms', async () => {
			await zoomIn();
			vi.advanceTimersByTime(1000);
			await zoomIn();

			vi.advanceTimersByTime(1499);
			expect(zoomStore.chipVisible).toBe(true);
			expect(zoomStore.level).toBe(1.25);

			vi.advanceTimersByTime(1);
			expect(zoomStore.chipVisible).toBe(false);
		});

		it('resetZoom shows the chip at 1', async () => {
			await zoomIn();
			vi.advanceTimersByTime(1500);

			await resetZoom();

			expect(zoomStore.level).toBe(1);
			expect(zoomStore.chipVisible).toBe(true);
		});

		it('restoreZoom never shows the chip', async () => {
			localStorage.setItem(ZOOM_KEY, '1.5');

			await restoreZoom();

			expect(zoomStore.level).toBe(1.5);
			expect(zoomStore.chipVisible).toBe(false);
		});

		it('a rejecting setZoom does not show the chip', async () => {
			mockSetZoom.mockRejectedValueOnce(new Error('ipc failed'));

			await expect(zoomIn()).rejects.toThrow('ipc failed');

			expect(zoomStore.chipVisible).toBe(false);
		});
	});
});
