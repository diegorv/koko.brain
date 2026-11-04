import { describe, it, expect } from 'vitest';
import { parseLocalDateOnly } from '#lib/features/collection/expression/date-value.logic.js';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../../fixtures/timezone.fixture';

describe('parseLocalDateOnly', () => {
	it('reads YYYY-MM-DD as local midnight', () => {
		const d = parseLocalDateOnly('2026-11-03');
		expect(d).toBeInstanceOf(Date);
		expect(d!.getTime()).toBe(new Date(2026, 10, 3).getTime());
	});

	it('returns null for an empty string', () => {
		expect(parseLocalDateOnly('')).toBeNull();
	});

	it('returns null for a non-date string', () => {
		expect(parseLocalDateOnly('abc')).toBeNull();
	});

	it('returns null for out-of-range parts', () => {
		expect(parseLocalDateOnly('2026-13-01')).toBeNull();
		expect(parseLocalDateOnly('2026-00-10')).toBeNull();
		expect(parseLocalDateOnly('2026-02-30')).toBeNull();
		expect(parseLocalDateOnly('2026-11-00')).toBeNull();
	});

	it('returns null for anything that is not exactly YYYY-MM-DD', () => {
		expect(parseLocalDateOnly('2026-11-03T10:00')).toBeNull();
		expect(parseLocalDateOnly(' 2026-11-03')).toBeNull();
		expect(parseLocalDateOnly('2026-1-3')).toBeNull();
		expect(parseLocalDateOnly('20261103')).toBeNull();
	});

	it('accepts Feb 29 of a leap year', () => {
		expect(parseLocalDateOnly('2028-02-29')!.getTime()).toBe(new Date(2028, 1, 29).getTime());
	});
});

describe.runIf(runtimeTimeZoneSwitchWorks())('parseLocalDateOnly across time zones', () => {
	for (const tz of ['America/Sao_Paulo', 'Asia/Tokyo']) {
		it(`returns local midnight in ${tz}, not UTC midnight`, () => {
			withTimeZone(tz, () => {
				const d = parseLocalDateOnly('2026-11-03')!;
				expect(d.getFullYear()).toBe(2026);
				expect(d.getMonth()).toBe(10);
				expect(d.getDate()).toBe(3);
				expect(d.getHours()).toBe(0);
			});
		});
	}
});
