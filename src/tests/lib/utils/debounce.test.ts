import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '$lib/utils/debounce';

describe('debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls the function after the specified delay', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledOnce();
	});

	it('resets the timer on subsequent calls', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		vi.advanceTimersByTime(100);
		debounced();
		vi.advanceTimersByTime(100);

		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledOnce();
	});

	it('passes arguments to the debounced function', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced('hello', 42);
		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledWith('hello', 42);
	});

	it('uses the latest arguments when called multiple times', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced('first');
		debounced('second');
		debounced('third');
		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledOnce();
		expect(fn).toHaveBeenCalledWith('third');
	});

	it('cancel prevents the function from being called', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		debounced.cancel();
		vi.advanceTimersByTime(200);

		expect(fn).not.toHaveBeenCalled();
	});

	it('cancel is safe to call when no timer is pending', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		expect(() => debounced.cancel()).not.toThrow();
	});

	it('can be called again after cancel', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		debounced.cancel();
		debounced();
		vi.advanceTimersByTime(200);

		expect(fn).toHaveBeenCalledOnce();
	});

	it('flush immediately executes the pending call', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced('flushed');
		debounced.flush();

		expect(fn).toHaveBeenCalledOnce();
		expect(fn).toHaveBeenCalledWith('flushed');
	});

	it('flush does nothing when no pending call', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced.flush();

		expect(fn).not.toHaveBeenCalled();
	});

	it('flush cancels the pending timer', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced('arg');
		debounced.flush();
		vi.advanceTimersByTime(200);

		// Should have been called exactly once (by flush), not twice
		expect(fn).toHaveBeenCalledOnce();
	});

	it('flush uses the latest arguments', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced('first');
		debounced('second');
		debounced.flush();

		expect(fn).toHaveBeenCalledWith('second');
	});

	it('can be called again after flush', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced('a');
		debounced.flush();
		debounced('b');
		vi.advanceTimersByTime(200);

		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenNthCalledWith(1, 'a');
		expect(fn).toHaveBeenNthCalledWith(2, 'b');
	});
});
