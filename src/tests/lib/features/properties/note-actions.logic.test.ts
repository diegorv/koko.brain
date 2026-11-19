import { describe, it, expect } from 'vitest';
import { noteActions } from '#lib/features/properties/note-actions.logic.js';

const ACTIVE = { organized: false, archived: false };

describe('noteActions', () => {
	it('lists Archive, Mark organized, History and Move to Trash for an active inbox note', () => {
		expect(noteActions('markdown', ACTIVE)).toEqual([
			{ id: 'archive', label: 'Archive', danger: false },
			{ id: 'organize', label: 'Mark organized', danger: false },
			{ id: 'history', label: 'History', danger: false },
			{ id: 'trash', label: 'Move to Trash', danger: true },
		]);
	});

	it('offers Restore on an archived note and Mark not organized on an organized one', () => {
		expect(noteActions('markdown', { organized: true, archived: true }).map((a) => a.label)).toEqual([
			'Restore',
			'Mark not organized',
			'History',
			'Move to Trash',
		]);
	});

	it('follows each flag on its own', () => {
		expect(noteActions('markdown', { organized: true, archived: false }).map((a) => a.label).slice(0, 2)).toEqual([
			'Archive',
			'Mark not organized',
		]);
		expect(noteActions('markdown', { organized: false, archived: true }).map((a) => a.label).slice(0, 2)).toEqual([
			'Restore',
			'Mark organized',
		]);
	});

	it.each(['canvas', 'view', 'pdf', 'kanban', 'image', 'other'])('offers only Move to Trash on a %s file, which has no frontmatter', (kind) => {
		expect(noteActions(kind, ACTIVE)).toEqual([{ id: 'trash', label: 'Move to Trash', danger: true }]);
	});

	it('marks only Move to Trash as danger', () => {
		const dangers = noteActions('markdown', ACTIVE).filter((a) => a.danger).map((a) => a.id);
		expect(dangers).toEqual(['trash']);
	});
});
