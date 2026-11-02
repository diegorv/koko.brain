import { describe, expect, it } from 'vitest';
import { dialogButtons } from '#lib/app/remote/remote-dialog.logic.js';

describe('dialogButtons', () => {
	it('maps the plugin presets to their labels', () => {
		expect(dialogButtons('Ok')).toEqual(['Ok']);
		expect(dialogButtons('OkCancel')).toEqual(['Ok', 'Cancel']);
		expect(dialogButtons('YesNo')).toEqual(['Yes', 'No']);
		expect(dialogButtons('YesNoCancel')).toEqual(['Yes', 'No', 'Cancel']);
	});

	it('keeps custom labels in order', () => {
		expect(dialogButtons({ OkCustom: 'Got it' })).toEqual(['Got it']);
		expect(dialogButtons({ OkCancelCustom: ['Delete', 'Keep'] })).toEqual(['Delete', 'Keep']);
		expect(dialogButtons({ YesNoCancelCustom: ['Save', "Don't", 'Back'] })).toEqual(['Save', "Don't", 'Back']);
	});

	it('falls back to a single Ok for none or an unknown shape', () => {
		expect(dialogButtons(undefined)).toEqual(['Ok']);
		expect(dialogButtons(null)).toEqual(['Ok']);
		expect(dialogButtons('Bogus')).toEqual(['Ok']);
		expect(dialogButtons({ OkCancelCustom: 'x' })).toEqual(['Ok']);
	});
});
