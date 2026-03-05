import { describe, it, expect } from 'vitest';
import {
	formatShortcut,
	filterAndRankCommands,
} from '$lib/features/command-palette/command-palette.logic';
import type { AppCommand } from '$lib/features/command-palette/command-palette.types';

function makeCommand(id: string, label: string, category = 'Test'): AppCommand {
	return { id, label, category, action: () => {} };
}

describe('formatShortcut', () => {
	it('formats meta + key', () => {
		expect(formatShortcut({ meta: true, key: 's' })).toBe('⌘S');
	});

	it('formats meta + shift + key', () => {
		expect(formatShortcut({ meta: true, shift: true, key: 'f' })).toBe('⌘⇧F');
	});

	it('formats meta + shift + code (BracketLeft)', () => {
		expect(formatShortcut({ meta: true, shift: true, code: 'BracketLeft' })).toBe('⌘⇧[');
	});

	it('formats meta + shift + code (BracketRight)', () => {
		expect(formatShortcut({ meta: true, shift: true, code: 'BracketRight' })).toBe('⌘⇧]');
	});

	it('formats alt + key', () => {
		expect(formatShortcut({ alt: true, key: 'n' })).toBe('⌥N');
	});

	it('formats key only', () => {
		expect(formatShortcut({ key: 'p' })).toBe('P');
	});

	it('formats meta + key without shift or alt', () => {
		expect(formatShortcut({ meta: true, key: 'g' })).toBe('⌘G');
	});

	it('formats all modifiers', () => {
		expect(formatShortcut({ meta: true, shift: true, alt: true, key: 'x' })).toBe('⌘⇧⌥X');
	});

	it('formats meta + code (Backquote)', () => {
		expect(formatShortcut({ meta: true, code: 'Backquote' })).toBe('⌘`');
	});

	it('formats meta + code (Comma)', () => {
		expect(formatShortcut({ meta: true, code: 'Comma' })).toBe('⌘,');
	});
});

describe('filterAndRankCommands', () => {
	const commands: AppCommand[] = [
		makeCommand('save', 'Save File', 'Editor'),
		makeCommand('close', 'Close Tab', 'Editor'),
		makeCommand('search', 'Search in Vault', 'Navigation'),
		makeCommand('daily', 'Open Daily Note', 'Daily Notes'),
	];

	it('returns all commands sorted alphabetically for empty query', () => {
		const result = filterAndRankCommands('', commands, []);
		expect(result.map((c) => c.id)).toEqual(['close', 'daily', 'save', 'search']);
	});

	it('puts recent commands first for empty query', () => {
		const result = filterAndRankCommands('', commands, ['search', 'save']);
		expect(result[0].id).toBe('search');
		expect(result[1].id).toBe('save');
	});

	it('recent commands preserve their order', () => {
		const result = filterAndRankCommands('', commands, ['daily', 'close']);
		expect(result[0].id).toBe('daily');
		expect(result[1].id).toBe('close');
	});

	it('filters by fuzzy match', () => {
		const result = filterAndRankCommands('sav', commands, []);
		expect(result[0].id).toBe('save');
		expect(result.every((c) => c.id !== 'close')).toBe(true);
		expect(result.every((c) => c.id !== 'daily')).toBe(true);
	});

	it('returns empty array when nothing matches', () => {
		const result = filterAndRankCommands('xyz', commands, []);
		expect(result).toHaveLength(0);
	});

	it('ranks prefix matches higher', () => {
		const result = filterAndRankCommands('cl', commands, []);
		expect(result[0].id).toBe('close');
	});

	it('ignores recent IDs that do not exist in commands', () => {
		const result = filterAndRankCommands('', commands, ['nonexistent', 'save']);
		expect(result[0].id).toBe('save');
		expect(result).toHaveLength(4);
	});

	it('gives recency bonus when searching with query', () => {
		// Both 'Save File' and 'Search in Vault' match 'sa'
		const result = filterAndRankCommands('sa', commands, ['search']);
		const ids = result.map((c) => c.id);
		expect(ids).toContain('save');
		expect(ids).toContain('search');
	});
});
