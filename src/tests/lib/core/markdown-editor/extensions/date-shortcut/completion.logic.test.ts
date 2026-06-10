import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import {
	detectDateShortcut,
	dateForToken,
} from '$lib/core/markdown-editor/extensions/date-shortcut/completion.logic';

describe('detectDateShortcut', () => {
	it('matches @tod as a prefix of today', () => {
		expect(detectDateShortcut('see @tod', 8)).toEqual({ from: 4, to: 8, matches: ['today'] });
	});

	it('matches a bare @ with all tokens', () => {
		expect(detectDateShortcut('@', 1)?.matches).toEqual(['today', 'tomorrow', 'yesterday']);
	});

	it('matches a full token at the start of the line', () => {
		expect(detectDateShortcut('@today', 6)).toEqual({ from: 0, to: 6, matches: ['today'] });
	});

	it('matches @tomorrow and @yesterday prefixes', () => {
		expect(detectDateShortcut('@tom', 4)?.matches).toEqual(['tomorrow']);
		expect(detectDateShortcut('@y', 2)?.matches).toEqual(['yesterday']);
	});

	it('is case-insensitive', () => {
		expect(detectDateShortcut('@ToD', 4)?.matches).toEqual(['today']);
	});

	it('returns null when the query matches no token', () => {
		expect(detectDateShortcut('@x', 2)).toBeNull();
	});

	it('returns null inside an email address', () => {
		expect(detectDateShortcut('eu@tod', 6)).toBeNull();
		expect(detectDateShortcut('write to eu@t', 13)).toBeNull();
	});

	it('returns null when there is no @ before the cursor', () => {
		expect(detectDateShortcut('today', 5)).toBeNull();
	});

	it('does not match once a non-letter follows the token text', () => {
		expect(detectDateShortcut('@today ', 7)).toBeNull();
	});

	it('returns null for an empty document', () => {
		expect(detectDateShortcut('', 0)).toBeNull();
	});
});

describe('dateForToken', () => {
	it('returns the ISO date for each token', () => {
		expect(dateForToken('today')).toBe(dayjs().format('YYYY-MM-DD'));
		expect(dateForToken('tomorrow')).toBe(dayjs().add(1, 'day').format('YYYY-MM-DD'));
		expect(dateForToken('yesterday')).toBe(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
	});
});
