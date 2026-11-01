import { describe, it, expect } from 'vitest';
import {
	ACTION_SLOT_WIDTH,
	BAR_RESERVED_WIDTH,
	FOLD_ORDER,
	FOLDABLE_ACTIONS,
	foldActions,
	getActionBarState,
} from '#lib/features/note-action-bar/note-action-bar.logic.js';

const PATH = '/vault/Projects/Launch plan.md';

describe('getActionBarState', () => {
	it('reads type, file name and the three lifecycle flags from the frontmatter', () => {
		const content = '---\n_type: project\n_favorite: true\n_organized: true\n---\nBody\n';

		expect(getActionBarState(PATH, content)).toEqual({
			typeLabel: 'Project',
			fileName: 'Launch plan.md',
			favorite: true,
			organized: true,
			archived: false,
		});
	});

	it('accepts the `type` alias and reports an archived note', () => {
		const content = '---\ntype: Person\n_archived: true\n---\n';

		expect(getActionBarState(PATH, content)).toMatchObject({ typeLabel: 'Person', archived: true, organized: false });
	});

	it('falls back to "Note" with every flag off for a note without frontmatter', () => {
		expect(getActionBarState(PATH, 'Just text\n')).toEqual({
			typeLabel: 'Note',
			fileName: 'Launch plan.md',
			favorite: false,
			organized: false,
			archived: false,
		});
	});

	it('falls back to "Note" for empty content and a blank or non-text type', () => {
		expect(getActionBarState(PATH, '').typeLabel).toBe('Note');
		expect(getActionBarState(PATH, '---\n_type: "  "\n---\n').typeLabel).toBe('Note');
		expect(getActionBarState(PATH, '---\n_type: [a, b]\n---\n').typeLabel).toBe('Note');
	});

	it('treats unparseable frontmatter as no frontmatter', () => {
		expect(getActionBarState(PATH, '---\n_favorite: [unclosed\n---\n')).toMatchObject({
			typeLabel: 'Note',
			favorite: false,
		});
	});
});

describe('foldActions', () => {
	/** A bar wide enough for the label, the fixed buttons and `slots` foldable actions. */
	const widthFor = (slots: number) => BAR_RESERVED_WIDTH + slots * ACTION_SLOT_WIDTH;

	it('keeps every foldable action in the bar, in bar order, when there is room for all', () => {
		expect(foldActions(widthFor(4))).toEqual({ inline: ['width', 'toc', 'reveal', 'copy-path'], folded: [] });
		expect(foldActions(2000)).toEqual({ inline: ['width', 'toc', 'reveal', 'copy-path'], folded: [] });
	});

	it('folds the actions into More one by one in the fixed order: Copy path, Reveal, TOC, width', () => {
		expect(foldActions(widthFor(4) - 1)).toEqual({ inline: ['width', 'toc', 'reveal'], folded: ['copy-path'] });
		expect(foldActions(widthFor(2))).toEqual({ inline: ['width', 'toc'], folded: ['reveal', 'copy-path'] });
		expect(foldActions(widthFor(1))).toEqual({ inline: ['width'], folded: ['toc', 'reveal', 'copy-path'] });
		expect(foldActions(widthFor(0))).toEqual({ inline: [], folded: ['width', 'toc', 'reveal', 'copy-path'] });
	});

	it('folds everything when the bar is narrower than its fixed part', () => {
		expect(foldActions(BAR_RESERVED_WIDTH - 100)).toEqual({ inline: [], folded: ['width', 'toc', 'reveal', 'copy-path'] });
	});

	it('brings the actions back when space returns', () => {
		const narrow = foldActions(widthFor(1));
		const wide = foldActions(widthFor(3));

		expect(narrow.folded).toEqual(['toc', 'reveal', 'copy-path']);
		expect(wide).toEqual({ inline: ['width', 'toc', 'reveal'], folded: ['copy-path'] });
	});

	it('folds nothing for an unmeasured bar (width 0)', () => {
		expect(foldActions(0)).toEqual({ inline: ['width', 'toc', 'reveal', 'copy-path'], folded: [] });
	});

	it('the fold order lists every foldable action exactly once, so a new action (Neighbourhood) is one more entry', () => {
		expect([...FOLD_ORDER].sort()).toEqual([...FOLDABLE_ACTIONS].sort());
		expect(new Set(FOLD_ORDER).size).toBe(FOLD_ORDER.length);
	});
});
