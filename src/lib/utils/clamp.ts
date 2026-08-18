/**
 * Clamps `value` into the inclusive range `[min, max]`.
 *
 * Equivalent to `Math.max(min, Math.min(max, value))`: when the bounds are
 * inverted (`min > max`), `min` wins. `NaN` in any argument yields `NaN`.
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
