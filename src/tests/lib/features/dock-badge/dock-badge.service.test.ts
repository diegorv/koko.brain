import { describe, it, expect, vi, beforeEach } from 'vitest';

const { setBadgeCount, errorMock } = vi.hoisted(() => ({
	setBadgeCount: vi.fn(),
	errorMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({ setBadgeCount }),
}));

vi.mock('$lib/utils/debug', () => ({
	error: errorMock,
	debug: vi.fn(),
}));

import { applyDockBadge } from '$lib/features/dock-badge/dock-badge.service';

describe('applyDockBadge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setBadgeCount.mockResolvedValue(undefined);
	});

	it('sets the badge to a positive count', async () => {
		await applyDockBadge(3);
		expect(setBadgeCount).toHaveBeenCalledWith(3);
	});

	it('clears the badge (undefined) when value is 0', async () => {
		await applyDockBadge(0);
		expect(setBadgeCount).toHaveBeenCalledWith(undefined);
	});

	it('clears the badge (undefined) when value is null', async () => {
		await applyDockBadge(null);
		expect(setBadgeCount).toHaveBeenCalledWith(undefined);
	});

	it('clears the badge (undefined) for a negative value', async () => {
		await applyDockBadge(-1);
		expect(setBadgeCount).toHaveBeenCalledWith(undefined);
	});

	it('logs and does not throw when setBadgeCount rejects', async () => {
		setBadgeCount.mockRejectedValue(new Error('no permission'));
		await expect(applyDockBadge(5)).resolves.toBeUndefined();
		expect(errorMock).toHaveBeenCalledWith('DOCK-BADGE', 'Failed to set dock badge count:', expect.any(Error));
	});
});
