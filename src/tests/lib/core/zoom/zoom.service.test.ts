// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetZoom = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
	getCurrentWebviewWindow: () => ({ setZoom: mockSetZoom }),
}));

import { zoomIn, zoomOut, resetZoom } from '$lib/core/zoom/zoom.service';

describe('zoom.service', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await resetZoom(); // reset module state to 1.0
		vi.clearAllMocks(); // clear the setZoom call from resetZoom
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
});
