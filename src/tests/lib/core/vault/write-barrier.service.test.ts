import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
}));

import { drainPendingWrites, registerWriteBarrier } from '#lib/core/vault/write-barrier.service.js';

describe('write barrier', () => {
	let unregister: (() => void)[] = [];

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
	});

	it('resolves only after every registered barrier settled, one after another', async () => {
		const trace: string[] = [];
		let releaseA!: () => void;
		unregister = [
			registerWriteBarrier('a', () => new Promise<void>((resolve) => {
				trace.push('a:start');
				releaseA = () => { trace.push('a:done'); resolve(); };
			})),
			registerWriteBarrier('b', async () => { trace.push('b'); }),
		];

		let settled = false;
		const draining = drainPendingWrites().then(() => { settled = true; });
		await Promise.resolve();
		expect(trace).toEqual(['a:start']);
		expect(settled).toBe(false);

		releaseA();
		await draining;

		expect(trace).toEqual(['a:start', 'a:done', 'b']);
		expect(settled).toBe(true);
	});

	it('resolves at once with no barrier registered', async () => {
		await expect(drainPendingWrites()).resolves.toBeUndefined();
	});

	it('propagates a barrier rejection to the caller', async () => {
		unregister = [registerWriteBarrier('broken', () => Promise.reject(new Error('stuck')))];

		await expect(drainPendingWrites()).rejects.toThrow('stuck');
	});

	it('stops waiting on a barrier once it is unregistered', async () => {
		const drain = vi.fn(() => Promise.resolve());
		const off = registerWriteBarrier('a', drain);

		off();
		await drainPendingWrites();

		expect(drain).not.toHaveBeenCalled();
	});
});
