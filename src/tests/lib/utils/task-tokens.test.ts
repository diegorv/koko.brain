import { describe, expect, it } from 'vitest';

import { PRIORITY_EMOJIS, setDueToken, setPriorityToken, trailingBlockId, type PriorityEmoji } from '#lib/utils/task-tokens.js';
import fixture from '../../fixtures/task-line-edits.fixture.json';

/** Fixture priority names in `PRIORITY_EMOJIS` order. */
const PRIORITY_NAMES = ['highest', 'high', 'medium', 'low', 'lowest'] as const;

type Op = { kind: 'due'; date: string | null } | { kind: 'priority'; priority: (typeof PRIORITY_NAMES)[number] | null };

interface Case {
	name: string;
	text: string;
	op: Op;
	expected: string;
}

function emojiFor(priority: (typeof PRIORITY_NAMES)[number] | null): PriorityEmoji | null {
	return priority === null ? null : PRIORITY_EMOJIS[PRIORITY_NAMES.indexOf(priority)];
}

function apply(text: string, op: Op): string {
	return op.kind === 'due' ? setDueToken(text, op.date) : setPriorityToken(text, emojiFor(op.priority));
}

describe('task-tokens fixture (shared with the Rust parity test)', () => {
	const cases = fixture.cases as Case[];

	it('holds cases for both ops', () => {
		expect(cases.some((c) => c.op.kind === 'due')).toBe(true);
		expect(cases.some((c) => c.op.kind === 'priority')).toBe(true);
	});

	for (const c of cases) {
		it(c.name, () => {
			expect(apply(c.text, c.op)).toBe(c.expected);
		});
	}
});

describe('setDueToken', () => {
	it('returns an empty text with only the token', () => {
		expect(setDueToken('', '2026-11-20')).toBe('📅 2026-11-20');
	});

	it('leaves an empty text alone when clearing', () => {
		expect(setDueToken('', null)).toBe('');
	});

	it('removes every due when clearing', () => {
		expect(setDueToken('a 📅 2026-11-01 b 📅 2026-11-02', null)).toBe('a b');
	});

	it('inserts before the first 🆔 and keeps the block id after it', () => {
		expect(setDueToken('call 🆔 td-x ^abc', '2026-11-20')).toBe('call 📅 2026-11-20 🆔 td-x ^abc');
	});

	it('inserts before a block id followed by trailing whitespace', () => {
		expect(setDueToken('call ^abc  ', '2026-11-20')).toBe('call 📅 2026-11-20 ^abc  ');
	});

	it('treats a ^word that does not end the text as a word', () => {
		expect(setDueToken('call ^abc Ana', '2026-11-20')).toBe('call ^abc Ana 📅 2026-11-20');
	});
});

describe('setPriorityToken', () => {
	it('returns an empty text with only the emoji', () => {
		expect(setPriorityToken('', '🔺')).toBe('🔺');
	});

	it('keeps the text when clearing and none is set', () => {
		expect(setPriorityToken('call Ana', null)).toBe('call Ana');
	});

	it('replaces a priority with a variation selector', () => {
		expect(setPriorityToken('call ⏫️ Ana', '🔽')).toBe('call 🔽 Ana');
	});
});

describe('trailingBlockId', () => {
	it('returns the block id that ends the text', () => {
		expect(trailingBlockId('call ^abc-1  ')).toBe('^abc-1');
	});

	it('returns null without one', () => {
		expect(trailingBlockId('call ^abc Ana')).toBeNull();
		expect(trailingBlockId('')).toBeNull();
	});
});
