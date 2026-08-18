import { describe, it, expect } from 'vitest';
import { clamp } from '$lib/utils/clamp';

describe('clamp', () => {
	it('returns the value when inside the range', () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it('clamps below the minimum', () => {
		expect(clamp(-3, 0, 10)).toBe(0);
	});

	it('clamps above the maximum', () => {
		expect(clamp(42, 0, 10)).toBe(10);
	});

	it('returns the boundary values unchanged', () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});

	it('supports negative and fractional ranges', () => {
		expect(clamp(-0.2, -0.1, 0.1)).toBe(-0.1);
		expect(clamp(0.05, -0.1, 0.1)).toBe(0.05);
	});

	it('returns min when the bounds are inverted', () => {
		expect(clamp(5, 10, 0)).toBe(10);
	});

	it('returns NaN when any argument is NaN', () => {
		expect(clamp(NaN, 0, 10)).toBeNaN();
		expect(clamp(5, NaN, 10)).toBeNaN();
		expect(clamp(5, 0, NaN)).toBeNaN();
	});
});
