import { describe, it, expect } from 'vitest';
import {
	themeColorsToCssVars,
	KOKOBRAIN_DEFAULT_THEME,
	SAKURA_THEME,
	LAVENDER_HAZE_THEME,
	TWILIGHT_VIOLET_THEME,
} from '#lib/core/settings/theme.logic.js';

/**
 * Pins every CSS variable of the hand-written themes, so restructuring how a
 * theme is built cannot change what it looks like. Update the snapshot only
 * for an intended visual change.
 */
describe('hand-written theme CSS variables', () => {
	for (const theme of [KOKOBRAIN_DEFAULT_THEME, SAKURA_THEME, LAVENDER_HAZE_THEME, TWILIGHT_VIOLET_THEME]) {
		it(`${theme.name} is unchanged`, () => {
			expect(themeColorsToCssVars(theme.colors)).toMatchSnapshot();
		});
	}
});
