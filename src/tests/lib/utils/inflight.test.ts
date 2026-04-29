import { describe, it, expect, vi } from 'vitest';
import { dedupeInflight } from '$lib/utils/inflight';
import { debounce } from '$lib/utils/debounce';

/**
 * Returns a controllable promise factory. Each call to `make()` produces
 * a fresh `{ promise, resolve, reject }` triple — used to simulate IPC
 * roundtrips that the test can settle on demand.
 */
function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('dedupeInflight', () => {
	it('collapses concurrent same-key calls into a single invocation', async () => {
		const def = deferred<string>();
		const fn = vi.fn(async (_path: string) => def.promise);
		const wrapped = dedupeInflight(fn, (path: string) => path);

		const p1 = wrapped('/vault/a.md');
		const p2 = wrapped('/vault/a.md');
		const p3 = wrapped('/vault/a.md');

		// Underlying fn invoked exactly once.
		expect(fn).toHaveBeenCalledTimes(1);
		// All three callers got the SAME Promise instance.
		expect(p1).toBe(p2);
		expect(p2).toBe(p3);

		def.resolve('result');
		await expect(p1).resolves.toBe('result');
		await expect(p2).resolves.toBe('result');
	});

	it('fires independent invocations for different keys', async () => {
		const def1 = deferred<string>();
		const def2 = deferred<string>();
		const fn = vi.fn(async (path: string) => {
			if (path === '/vault/a.md') return def1.promise;
			return def2.promise;
		});
		const wrapped = dedupeInflight(fn, (path: string) => path);

		const a = wrapped('/vault/a.md');
		const b = wrapped('/vault/b.md');

		expect(fn).toHaveBeenCalledTimes(2);
		expect(a).not.toBe(b);

		def1.resolve('A');
		def2.resolve('B');
		await expect(a).resolves.toBe('A');
		await expect(b).resolves.toBe('B');
	});

	it('clears the cache after success — next same-key call fires fresh', async () => {
		const fn = vi.fn(async (path: string) => `result for ${path}`);
		const wrapped = dedupeInflight(fn, (path: string) => path);

		await wrapped('/vault/a.md');
		await wrapped('/vault/a.md');

		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('clears the cache after rejection — next same-key call retries', async () => {
		let attempt = 0;
		const fn = vi.fn(async (_path: string) => {
			attempt += 1;
			if (attempt === 1) throw new Error('first attempt failed');
			return 'second attempt ok';
		});
		const wrapped = dedupeInflight(fn, (path: string) => path);

		await expect(wrapped('/vault/a.md')).rejects.toThrow('first attempt failed');
		await expect(wrapped('/vault/a.md')).resolves.toBe('second attempt ok');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('concurrent same-key callers all see the rejection', async () => {
		const def = deferred<string>();
		const fn = vi.fn(async (_path: string) => def.promise);
		const wrapped = dedupeInflight(fn, (path: string) => path);

		const p1 = wrapped('/vault/a.md');
		const p2 = wrapped('/vault/a.md');

		def.reject(new Error('shared rejection'));

		await expect(p1).rejects.toThrow('shared rejection');
		await expect(p2).rejects.toThrow('shared rejection');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('keys are independent — settling one does not clear another', async () => {
		const defA = deferred<string>();
		const defB = deferred<string>();
		const fn = vi.fn(async (path: string) => {
			if (path === '/vault/a.md') return defA.promise;
			return defB.promise;
		});
		const wrapped = dedupeInflight(fn, (path: string) => path);

		const a = wrapped('/vault/a.md');
		const b = wrapped('/vault/b.md');
		expect(fn).toHaveBeenCalledTimes(2);

		// Resolve A; B is still in-flight.
		defA.resolve('A');
		await a;

		// Calling A again fires fresh (cache cleared).
		const a2 = wrapped('/vault/a.md');
		expect(fn).toHaveBeenCalledTimes(3);

		// Calling B again still hits the in-flight cache.
		const b2 = wrapped('/vault/b.md');
		expect(b2).toBe(b);
		expect(fn).toHaveBeenCalledTimes(3);

		defB.resolve('B');
		defA.resolve('A2 (will be ignored — already resolved)');
		await expect(a2).resolves.toBeDefined();
		await expect(b2).resolves.toBe('B');
	});

	it('respects custom keyFn over multi-arg functions', async () => {
		const def = deferred<string>();
		const fn = vi.fn(async (_path: string, _content: string) => def.promise);
		// Dedupe by path only — content is ignored for caching purposes.
		const wrapped = dedupeInflight(fn, (path: string, _content: string) => path);

		const p1 = wrapped('/vault/a.md', 'contentA');
		const p2 = wrapped('/vault/a.md', 'contentB'); // same key, different second arg

		expect(fn).toHaveBeenCalledTimes(1);
		expect(p1).toBe(p2);

		def.resolve('done');
		await expect(p1).resolves.toBe('done');
		await expect(p2).resolves.toBe('done');
	});

	it('different first arg → different key even when other args match', async () => {
		const fn = vi.fn(async (path: string, _v: number) => `${path}-result`);
		const wrapped = dedupeInflight(fn, (path: string, v: number) => `${path}::${v}`);

		await wrapped('/vault/a.md', 1);
		await wrapped('/vault/a.md', 2); // same path, different version

		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('does not invoke fn at all if the call site never reaches it (sanity)', () => {
		const fn = vi.fn(async (_arg: string) => 'x');
		dedupeInflight(fn, (arg: string) => arg);
		// Wrapper produced; no calls yet.
		expect(fn).not.toHaveBeenCalled();
	});

	it('composition with debounce: burst of N calls collapses into 1 IPC', async () => {
		// Simulates the panel-effect pattern: debounce(150ms) → dedupeInflight.
		// During a burst-open the panel $effect re-fires for every path
		// change; the debounced scheduler coalesces them into one fire after
		// 150ms of stability, and the in-flight dedupe ensures it stays
		// one IPC even if multiple effects converge on the same path.
		vi.useFakeTimers();
		try {
			const ipc = vi.fn(async (_path: string) => 'ok');
			const dedupedIpc = dedupeInflight(ipc, (path: string) => path);
			const scheduleFetch = debounce((path: string) => {
				void dedupedIpc(path);
			}, 150);

			// Burst: 5 path changes within 50ms.
			scheduleFetch('/vault/a.md');
			vi.advanceTimersByTime(10);
			scheduleFetch('/vault/b.md');
			vi.advanceTimersByTime(10);
			scheduleFetch('/vault/c.md');
			vi.advanceTimersByTime(10);
			scheduleFetch('/vault/d.md');
			vi.advanceTimersByTime(10);
			scheduleFetch('/vault/e.md');

			// Before debounce window elapses, no IPC fired.
			expect(ipc).not.toHaveBeenCalled();

			// Advance past the debounce window.
			vi.advanceTimersByTime(150);

			// Only the LAST path fired — debounce coalesced the burst.
			expect(ipc).toHaveBeenCalledTimes(1);
			expect(ipc).toHaveBeenCalledWith('/vault/e.md');
		} finally {
			vi.useRealTimers();
		}
	});

	it('composition: two debounced schedulers converging on the same path → 1 IPC via dedupe', async () => {
		vi.useFakeTimers();
		try {
			const ipc = vi.fn(async (_path: string) => 'ok');
			const dedupedIpc = dedupeInflight(ipc, (path: string) => path);

			// Two independent debounced schedulers (think: BacklinksPanel
			// effect AND +layout.svelte tab-switch effect, both calling
			// fetchBacklinksV2 for the same path).
			const schedA = debounce((path: string) => { void dedupedIpc(path); }, 150);
			const schedB = debounce((path: string) => { void dedupedIpc(path); }, 150);

			schedA('/vault/x.md');
			schedB('/vault/x.md');

			vi.advanceTimersByTime(150);
			// Both debounced schedulers fire at the same tick → both call
			// dedupedIpc('/vault/x.md') synchronously → second call hits the
			// in-flight cache → only 1 underlying IPC.
			expect(ipc).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('handles synchronously-thrown errors inside fn (still rejected promise)', async () => {
		const fn = vi.fn((_path: string): Promise<string> =>
			Promise.reject(new Error('sync throw')),
		);
		const wrapped = dedupeInflight(fn, (path: string) => path);

		await expect(wrapped('/vault/a.md')).rejects.toThrow('sync throw');
		// Cache cleared after rejection.
		await expect(wrapped('/vault/a.md')).rejects.toThrow('sync throw');
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
