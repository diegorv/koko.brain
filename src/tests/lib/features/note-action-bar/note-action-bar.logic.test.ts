import { describe, it, expect } from 'vitest';
import {
	ACTION_SLOT_WIDTH,
	BAR_RESERVED_WIDTH,
	FOLD_ORDER,
	FOLDABLE_ACTIONS,
	foldActions,
	getActionBarState,
	resolveHubAction,
	type NoteHubAction,
} from '#lib/features/note-action-bar/note-action-bar.logic.js';

const PATH = '/vault/Projects/Launch plan.md';

describe('getActionBarState', () => {
	it('reads type, file name and the three lifecycle flags from the frontmatter', () => {
		const content = '---\n_type: project\n_favorite: true\n_organized: true\n---\nBody\n';

		expect(getActionBarState(PATH, content)).toEqual({
			typeLabel: 'Project',
			typeName: 'Project',
			fileName: 'Launch plan.md',
			favorite: true,
			organized: true,
			archived: false,
		});
	});

	it('accepts the `type` alias and reports an archived note', () => {
		const content = '---\ntype: Person\n_archived: true\n---\n';

		// A missing _organized reads as organized, as in the Rust index.
		expect(getActionBarState(PATH, content)).toMatchObject({ typeLabel: 'Person', archived: true, organized: true });
	});

	it('falls back to "Note" with favorite and archived off for a note without frontmatter', () => {
		expect(getActionBarState(PATH, 'Just text\n')).toEqual({
			typeLabel: 'Note',
			typeName: null,
			fileName: 'Launch plan.md',
			favorite: false,
			// A missing _organized reads as organized, as in the Rust index.
			organized: true,
			archived: false,
		});
	});

	it('falls back to "Note" for empty content and a blank or non-text type', () => {
		expect(getActionBarState(PATH, '').typeLabel).toBe('Note');
		expect(getActionBarState(PATH, '---\n_type: "  "\n---\n').typeLabel).toBe('Note');
		expect(getActionBarState(PATH, '---\n_type: [a, b]\n---\n').typeLabel).toBe('Note');
		expect(getActionBarState(PATH, '').typeName).toBeNull();
		expect(getActionBarState(PATH, '---\n_type: "  "\n---\n').typeName).toBeNull();
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
	const ALL = ['neighbourhood', 'width', 'toc', 'reveal', 'copy-path'];

	it('keeps every foldable action in the bar, in bar order with Neighbourhood first, when there is room for all', () => {
		expect(foldActions(widthFor(5))).toEqual({ inline: ALL, folded: [] });
		expect(foldActions(3000)).toEqual({ inline: ALL, folded: [] });
	});

	it('folds the actions into More one by one in the fixed order: Copy path, Reveal, TOC, width, Neighbourhood', () => {
		expect(foldActions(widthFor(5) - 1)).toEqual({ inline: ['neighbourhood', 'width', 'toc', 'reveal'], folded: ['copy-path'] });
		expect(foldActions(widthFor(3))).toEqual({ inline: ['neighbourhood', 'width', 'toc'], folded: ['reveal', 'copy-path'] });
		expect(foldActions(widthFor(1))).toEqual({ inline: ['neighbourhood'], folded: ['width', 'toc', 'reveal', 'copy-path'] });
		expect(foldActions(widthFor(0))).toEqual({ inline: [], folded: ALL });
	});

	it('folds everything when the bar is narrower than its fixed part', () => {
		expect(foldActions(BAR_RESERVED_WIDTH - 100)).toEqual({ inline: [], folded: ALL });
	});

	it('brings the actions back when space returns', () => {
		const narrow = foldActions(widthFor(1));
		const wide = foldActions(widthFor(4));

		expect(narrow.folded).toEqual(['width', 'toc', 'reveal', 'copy-path']);
		expect(wide).toEqual({ inline: ['neighbourhood', 'width', 'toc', 'reveal'], folded: ['copy-path'] });
	});

	it('folds everything for an unmeasured bar (width 0)', () => {
		expect(foldActions(0)).toEqual({ inline: [], folded: ALL });
	});

	it('keeps every foldable action in More on a bar under 992 px, a typical editor pane', () => {
		expect(BAR_RESERVED_WIDTH).toBe(960);
		for (const width of [400, 600, 900, 991]) {
			expect(foldActions(width)).toEqual({ inline: [], folded: ALL });
		}
		expect(foldActions(992)).toEqual({ inline: ['neighbourhood'], folded: ['width', 'toc', 'reveal', 'copy-path'] });
		expect(foldActions(1120)).toEqual({ inline: ALL, folded: [] });
	});

	it('the fold order lists every foldable action exactly once', () => {
		expect([...FOLD_ORDER].sort()).toEqual([...FOLDABLE_ACTIONS].sort());
		expect(new Set(FOLD_ORDER).size).toBe(FOLD_ORDER.length);
	});
});

describe('resolveHubAction', () => {
	const newOneOnOne: NoteHubAction = { id: 'new-one-on-one', label: 'New 1:1', typeName: 'Person', run: async () => {} };

	it('offers a registered action on notes of its type', () => {
		expect(resolveHubAction('Person', false, [newOneOnOne])).toEqual({ kind: 'registered', action: newOneOnOne });
	});

	it('prefers the registered action over New linked note on a hub type', () => {
		expect(resolveHubAction('Person', true, [newOneOnOne])).toEqual({ kind: 'registered', action: newOneOnOne });
	});

	it('offers New linked note on a hub type with no registered action', () => {
		expect(resolveHubAction('Project', true, [newOneOnOne])).toEqual({ kind: 'linked-note' });
		expect(resolveHubAction('Person', true, [])).toEqual({ kind: 'linked-note' });
	});

	it('offers nothing on other notes', () => {
		expect(resolveHubAction('Project', false, [newOneOnOne])).toBeNull();
		expect(resolveHubAction('Person', false, [])).toBeNull();
		expect(resolveHubAction(null, false, [newOneOnOne])).toBeNull();
	});
});
