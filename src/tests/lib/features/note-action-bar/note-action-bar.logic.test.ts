import { describe, it, expect } from 'vitest';
import { getActionBarState } from '#lib/features/note-action-bar/note-action-bar.logic.js';

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
