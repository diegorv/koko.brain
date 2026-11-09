import { describe, it, expect } from 'vitest';
import {
	addTag,
	contentRoundTripProblem,
	isTaskTagName,
	removeTag,
	replaceDescription,
	setDueDate,
	setPriority,
	setTaskStatus,
} from '#lib/features/todoist-sync/task-line.logic.js';

/**
 * A line with every token a patch must keep: links, wikilinks, every
 * unmapped signifier, the anchor and text after it.
 */
const RICH =
	'\t- [ ] Call [[Bob]] about [plan](https://x.io/p) ⏳ 2026-01-02 🛫 2026-01-01 ➕ 2025-12-31 ✅ 2026-01-03 ❌ 2026-01-04 🔁 every week ⛔ abc,def 🏁 delete 📅 2026-11-10 🔼 #work 🆔 td-abc12345 trailing words';

describe('setTaskStatus', () => {
	it('closes an open task with x', () => {
		expect(setTaskStatus('- [ ] Buy milk', 'closed')).toBe('- [x] Buy milk');
	});

	it('closes a non-space open status with x', () => {
		for (const c of ['/', '?', '!', '>']) {
			expect(setTaskStatus(`- [${c}] Buy milk`, 'closed')).toBe('- [x] Buy milk');
		}
	});

	it('keeps x, X and - when closing', () => {
		expect(setTaskStatus('- [x] Buy milk', 'closed')).toBe('- [x] Buy milk');
		expect(setTaskStatus('- [X] Buy milk', 'closed')).toBe('- [X] Buy milk');
		expect(setTaskStatus('- [-] Buy milk', 'closed')).toBe('- [-] Buy milk');
	});

	it('opens a closed task with a space', () => {
		expect(setTaskStatus('- [x] Buy milk', 'open')).toBe('- [ ] Buy milk');
		expect(setTaskStatus('- [X] Buy milk', 'open')).toBe('- [ ] Buy milk');
		expect(setTaskStatus('- [-] Buy milk', 'open')).toBe('- [ ] Buy milk');
	});

	it('keeps / ? ! > and space when opening', () => {
		for (const c of [' ', '/', '?', '!', '>']) {
			expect(setTaskStatus(`- [${c}] Buy milk`, 'open')).toBe(`- [${c}] Buy milk`);
		}
	});

	it('handles ordered and indented lines and other bullets', () => {
		expect(setTaskStatus('  12. [ ] Buy milk', 'closed')).toBe('  12. [x] Buy milk');
		expect(setTaskStatus('\t\t* [x] Buy milk', 'open')).toBe('\t\t* [ ] Buy milk');
		expect(setTaskStatus('+ [ ] Buy milk', 'closed')).toBe('+ [x] Buy milk');
	});

	it('flips only the task marker, never a box in the text', () => {
		expect(setTaskStatus('- [x] see [x] box', 'open')).toBe('- [ ] see [x] box');
	});

	it('returns null for a non-task line', () => {
		expect(setTaskStatus('Buy milk', 'closed')).toBeNull();
		expect(setTaskStatus('- Buy milk', 'closed')).toBeNull();
		expect(setTaskStatus('', 'open')).toBeNull();
	});

	it('keeps every other token of a rich line', () => {
		expect(setTaskStatus(RICH, 'closed')).toBe(RICH.replace('[ ]', '[x]'));
	});

	it('patches a CRLF line and keeps its trailing CR', () => {
		expect(setTaskStatus('- [ ] Buy milk\r', 'closed')).toBe('- [x] Buy milk\r');
	});
});

describe('setDueDate', () => {
	it('replaces an existing due date in place', () => {
		expect(setDueDate('- [ ] Buy 📅 2026-01-01 milk', '2026-02-02')).toBe('- [ ] Buy 📅 2026-02-02 milk');
	});

	it('replaces a due date written with the variation selector and no space', () => {
		expect(setDueDate('- [ ] Buy milk 📅️2026-01-01', '2026-02-02')).toBe('- [ ] Buy milk 📅 2026-02-02');
	});

	it('inserts a missing due date before the anchor', () => {
		expect(setDueDate('- [ ] Buy milk 🆔 td-x1 after', '2026-02-02')).toBe(
			'- [ ] Buy milk 📅 2026-02-02 🆔 td-x1 after'
		);
	});

	it('appends a missing due date before trailing whitespace when there is no anchor', () => {
		expect(setDueDate('- [ ] Buy milk', '2026-02-02')).toBe('- [ ] Buy milk 📅 2026-02-02');
		expect(setDueDate('- [ ] Buy milk  ', '2026-02-02')).toBe('- [ ] Buy milk 📅 2026-02-02  ');
	});

	it('inserts before the trailing CR of a CRLF line', () => {
		expect(setDueDate('- [ ] Buy milk\r', '2026-02-02')).toBe('- [ ] Buy milk 📅 2026-02-02\r');
	});

	it('removes the due date and its separating space', () => {
		expect(setDueDate('- [ ] Buy milk 📅 2026-01-01 🆔 td-x1', null)).toBe('- [ ] Buy milk 🆔 td-x1');
		expect(setDueDate('- [ ] 📅 2026-01-01 Buy milk', null)).toBe('- [ ] Buy milk');
	});

	it('removes every due date so no second one is parsed', () => {
		expect(setDueDate('- [ ] Buy 📅 2026-01-01 milk 📅 2026-03-03', null)).toBe('- [ ] Buy milk');
	});

	it('leaves a line without a due date unchanged on remove', () => {
		expect(setDueDate('- [ ] Buy milk ⏳ 2026-01-01', null)).toBe('- [ ] Buy milk ⏳ 2026-01-01');
	});

	it('never touches other date signifiers', () => {
		expect(setDueDate('- [ ] Buy milk ⏳ 2026-01-01', '2026-02-02')).toBe(
			'- [ ] Buy milk ⏳ 2026-01-01 📅 2026-02-02'
		);
	});

	it('returns null for a non-task line', () => {
		expect(setDueDate('Buy milk 📅 2026-01-01', null)).toBeNull();
	});

	it('keeps every other token of a rich line', () => {
		expect(setDueDate(RICH, '2026-12-01')).toBe(RICH.replace('📅 2026-11-10', '📅 2026-12-01'));
		expect(setDueDate(RICH, null)).toBe(RICH.replace(' 📅 2026-11-10', ''));
	});
});

describe('setPriority', () => {
	it('replaces an existing priority emoji in place', () => {
		expect(setPriority('- [ ] Buy ⏫ milk', '🔺')).toBe('- [ ] Buy 🔺 milk');
	});

	it('replaces the first priority and drops any other one', () => {
		expect(setPriority('- [ ] Buy ⏬ milk 🔺', '🔼')).toBe('- [ ] Buy 🔼 milk');
	});

	it('replaces a priority written with the variation selector', () => {
		expect(setPriority('- [ ] Buy milk ⏫️', '🔽')).toBe('- [ ] Buy milk 🔽');
	});

	it('inserts a missing priority before the anchor, else at the end', () => {
		expect(setPriority('- [ ] Buy milk 🆔 td-x1', '⏬')).toBe('- [ ] Buy milk ⏬ 🆔 td-x1');
		expect(setPriority('1. [ ] Buy milk', '⏫')).toBe('1. [ ] Buy milk ⏫');
	});

	it('removes every priority emoji', () => {
		expect(setPriority('- [ ] Buy ⏫ milk 🔽', null)).toBe('- [ ] Buy milk');
	});

	it('leaves a line without priority unchanged on remove', () => {
		expect(setPriority('- [ ] Buy milk', null)).toBe('- [ ] Buy milk');
	});

	it('returns null for a non-task line', () => {
		expect(setPriority('Buy milk', '🔺')).toBeNull();
	});

	it('keeps every other token of a rich line', () => {
		expect(setPriority(RICH, '⏫')).toBe(RICH.replace('🔼', '⏫'));
		expect(setPriority(RICH, null)).toBe(RICH.replace(' 🔼', ''));
	});
});

describe('isTaskTagName', () => {
	it('accepts names matching the parser tag rule', () => {
		for (const name of ['work', 'Work_2', '_x', '9to5', 'a-b-c']) {
			expect(isTaskTagName(name)).toBe(true);
		}
	});

	it('rejects names the parser would not read back whole', () => {
		for (const name of ['', '-a', 'café', 'two words', 'a/b', '#work']) {
			expect(isTaskTagName(name)).toBe(false);
		}
	});
});

describe('addTag', () => {
	it('inserts the tag before the anchor', () => {
		expect(addTag('- [ ] Buy milk 🆔 td-x1', 'shop')).toBe('- [ ] Buy milk #shop 🆔 td-x1');
	});

	it('appends the tag when there is no anchor', () => {
		expect(addTag('  3. [/] Buy milk', 'shop')).toBe('  3. [/] Buy milk #shop');
	});

	it('is a no-op when the tag is already there, case-insensitively', () => {
		expect(addTag('- [ ] Buy milk #Shop', 'shop')).toBe('- [ ] Buy milk #Shop');
	});

	it('adds the tag when only a longer tag shares its prefix', () => {
		expect(addTag('- [ ] Buy milk #shopping', 'shop')).toBe('- [ ] Buy milk #shopping #shop');
	});

	it('is a no-op for a tag the parser reads without a left boundary', () => {
		expect(addTag('- [ ] Buy milk (#shop)', 'shop')).toBe('- [ ] Buy milk (#shop)');
		expect(addTag('- [ ] Buy milk#shop', 'shop')).toBe('- [ ] Buy milk#shop');
	});

	it('adds a space before the tag when the anchor follows a word directly', () => {
		const once = addTag('- [ ] Buy milk🆔 td-x', 'shop');
		expect(once).toBe('- [ ] Buy milk #shop 🆔 td-x');
		expect(addTag(once as string, 'shop')).toBe(once);
	});

	it('throws on a name that is not a tag', () => {
		expect(() => addTag('- [ ] Buy milk', 'two words')).toThrow();
	});

	it('returns null for a non-task line', () => {
		expect(addTag('Buy milk', 'shop')).toBeNull();
	});

	it('keeps every other token of a rich line', () => {
		expect(addTag(RICH, 'home')).toBe(RICH.replace('#work 🆔', '#work #home 🆔'));
	});
});

describe('removeTag', () => {
	it('removes a standalone tag and its separating space', () => {
		expect(removeTag('- [ ] Buy milk #shop 🆔 td-x1', 'shop')).toBe('- [ ] Buy milk 🆔 td-x1');
		expect(removeTag('- [ ] #shop Buy milk', 'shop')).toBe('- [ ] Buy milk');
	});

	it('removes case-insensitively', () => {
		expect(removeTag('- [ ] Buy milk #Shop', 'shop')).toBe('- [ ] Buy milk');
	});

	it('keeps a longer tag that shares the prefix', () => {
		expect(removeTag('- [ ] Buy milk #shopping', 'shop')).toBe('- [ ] Buy milk #shopping');
	});

	it('removes a tag the parser reads without a left boundary', () => {
		expect(removeTag('- [ ] Buy milk (#shop)', 'shop')).toBe('- [ ] Buy milk ()');
		expect(removeTag('- [ ] Buy milk#shop 🆔 td-x1', 'shop')).toBe('- [ ] Buy milk 🆔 td-x1');
	});

	it('keeps links and wikilinks that contain the tag text', () => {
		const line = '- [ ] Read [[Note#shop]] and https://x.io/#shop';
		expect(removeTag(line, 'shop')).toBe(line);
	});

	it('leaves a line without the tag unchanged', () => {
		expect(removeTag('- [ ] Buy milk', 'shop')).toBe('- [ ] Buy milk');
	});

	it('throws on a name that is not a tag', () => {
		expect(() => removeTag('- [ ] Buy milk', 'a.b')).toThrow();
	});

	it('returns null for a non-task line', () => {
		expect(removeTag('Buy milk #shop', 'shop')).toBeNull();
	});

	it('keeps every other token of a rich line', () => {
		expect(removeTag(RICH, 'work')).toBe(RICH.replace(' #work', ''));
	});
});

describe('replaceDescription', () => {
	it('replaces the description and keeps the tokens after it', () => {
		expect(replaceDescription('- [ ] Buy milk 📅 2026-01-01 🔼 #shop 🆔 td-x1', 'Buy bread')).toEqual({
			kind: 'line',
			line: '- [ ] Buy bread 📅 2026-01-01 🔼 #shop 🆔 td-x1',
		});
	});

	it('keeps mapped signifiers placed before the description', () => {
		expect(replaceDescription('- [ ] 🔼 📅 2026-01-01 Buy milk', 'Buy bread')).toEqual({
			kind: 'line',
			line: '- [ ] 🔼 📅 2026-01-01 Buy bread',
		});
	});

	it('keeps unmapped signifiers and recurrence text after the description', () => {
		expect(
			replaceDescription('- [ ] Water plants ⏳ 2026-01-02 🔁 every week 📅 2026-01-01 🏁 delete', 'Feed cat')
		).toEqual({
			kind: 'line',
			line: '- [ ] Feed cat ⏳ 2026-01-02 🔁 every week 📅 2026-01-01 🏁 delete',
		});
	});

	it('treats a link as the last word of the description', () => {
		expect(replaceDescription('- [ ] Call bob [[Note]] #work', 'Call alice [[Note]]')).toEqual({
			kind: 'line',
			line: '- [ ] Call alice [[Note]] #work',
		});
	});

	it('handles ordered and indented lines', () => {
		expect(replaceDescription('\t2. [x] Buy milk', 'Buy bread')).toEqual({
			kind: 'line',
			line: '\t2. [x] Buy bread',
		});
	});

	it('writes the replacement text literally', () => {
		expect(replaceDescription('- [ ] Buy milk', 'Pay $& now')).toEqual({ kind: 'line', line: '- [ ] Pay $& now' });
	});

	it('returns a conflict for a tag before the last word', () => {
		expect(replaceDescription('- [ ] Buy #shop milk', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
		expect(replaceDescription('- [ ] #shop Buy milk', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
	});

	it('returns a conflict for a link before the last word', () => {
		expect(replaceDescription('- [ ] Call [[Bob]] today', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
		expect(replaceDescription('- [ ] Read [doc](https://x.io) now', 'x')).toEqual({
			kind: 'conflict',
			reason: 'mid-sentence',
		});
		expect(replaceDescription('- [ ] Open https://x.io now', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
	});

	it('returns a conflict for an unmapped signifier before the last word', () => {
		expect(replaceDescription('- [ ] Buy ⏳ 2026-01-01 milk', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
		expect(replaceDescription('- [ ] ⛔ abc Buy milk', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
	});

	it('returns a conflict for a mapped signifier inside the description', () => {
		expect(replaceDescription('- [ ] Buy 📅 2026-01-01 milk', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
		expect(replaceDescription('- [ ] Buy 🔺 milk', 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
	});

	it('returns a conflict for a line with no description words', () => {
		expect(replaceDescription('- [ ] 📅 2026-01-01 🆔 td-x1', 'x')).toEqual({
			kind: 'conflict',
			reason: 'no-description',
		});
	});

	it('returns a conflict for the rich line (wikilink mid-sentence)', () => {
		expect(replaceDescription(RICH, 'x')).toEqual({ kind: 'conflict', reason: 'mid-sentence' });
	});

	it('returns null for a non-task line', () => {
		expect(replaceDescription('Buy milk', 'x')).toBeNull();
	});
});

/**
 * Round-trip rules: Todoist content written as a task description and parsed
 * back is unchanged unless it
 * 1. contains a newline (a task is one line),
 * 2. contains `#` (the parser may read a tag and strip it),
 * 3. contains a signifier emoji (📅 ⏳ 🛫 ➕ ✅ ❌ 🔺 ⏫ 🔼 🔽 ⏬ 🔁 🆔 ⛔ 🏁),
 * 4. would be collapsed (two or more whitespace chars in a row, or leading or
 *    trailing whitespace: the parser collapses and trims the description),
 * 5. is empty or whitespace only (the parser drops a task with no text).
 */
describe('contentRoundTripProblem', () => {
	it('accepts plain content', () => {
		expect(contentRoundTripProblem('Buy milk')).toBeNull();
		expect(contentRoundTripProblem('Deploy 🚀 v2 [[Note]]')).toBeNull();
	});

	it('flags a newline', () => {
		expect(contentRoundTripProblem('Buy\nmilk')).toBe('newline');
		expect(contentRoundTripProblem('Buy\r\nmilk')).toBe('newline');
	});

	it('flags a #', () => {
		expect(contentRoundTripProblem('Fix #12')).toBe('hash');
		expect(contentRoundTripProblem('C# docs')).toBe('hash');
	});

	it('flags every signifier emoji, 🆔 included', () => {
		for (const emoji of ['📅', '⏳', '🛫', '➕', '✅', '❌', '🔺', '⏫', '🔼', '🔽', '⏬', '🔁', '🆔', '⛔', '🏁']) {
			expect(contentRoundTripProblem(`Buy ${emoji} milk`)).toBe('signifier');
		}
	});

	it('flags content the parser would collapse or trim', () => {
		expect(contentRoundTripProblem('Buy  milk')).toBe('whitespace');
		expect(contentRoundTripProblem(' Buy milk')).toBe('whitespace');
		expect(contentRoundTripProblem('Buy milk ')).toBe('whitespace');
		expect(contentRoundTripProblem('Buy\t\tmilk')).toBe('whitespace');
	});

	it('flags empty or whitespace-only content', () => {
		expect(contentRoundTripProblem('')).toBe('empty');
		expect(contentRoundTripProblem('   ')).toBe('empty');
	});
});
