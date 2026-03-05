import type { FormulaEntry } from './toolbar.types';
import { parse } from '../expression/parser';

let nextId = 0;

/** Generates a unique ID for formula entry keying */
function uid(): string {
	return `fe_${++nextId}`;
}

/**
 * Converts a formulas Record (from CollectionDefinition) into FormulaEntry[] for the UI.
 * Returns an empty array for undefined/null input.
 */
export function formulasToEntries(
	formulas: Record<string, string> | undefined,
): FormulaEntry[] {
	if (!formulas) return [];
	return Object.entries(formulas).map(([name, expression]) => ({
		id: uid(),
		name,
		expression,
		editing: false,
	}));
}

/**
 * Converts FormulaEntry[] (from the UI) back into a Record<string, string>.
 * Skips entries with empty names. Returns undefined if no valid formulas.
 */
export function entriesToFormulas(
	entries: FormulaEntry[],
): Record<string, string> | undefined {
	const result: Record<string, string> = {};
	for (const entry of entries) {
		const trimmedName = entry.name.trim();
		if (trimmedName) {
			result[trimmedName] = entry.expression;
		}
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Creates a new empty FormulaEntry for the "Add formula" action.
 * Starts in editing mode so the user can immediately type.
 */
export function createEmptyFormulaEntry(): FormulaEntry {
	return {
		id: uid(),
		name: '',
		expression: '',
		editing: true,
	};
}

/**
 * Adds a new formula entry to the list.
 * Returns the updated entries array with the new entry appended.
 */
export function addFormulaEntry(entries: FormulaEntry[]): FormulaEntry[] {
	return [...entries, createEmptyFormulaEntry()];
}

/**
 * Removes a formula entry by ID.
 */
export function removeFormulaEntry(
	entries: FormulaEntry[],
	id: string,
): FormulaEntry[] {
	return entries.filter((e) => e.id !== id);
}

/**
 * Updates a formula entry's name and/or expression.
 * Validates the expression and sets the error field if invalid.
 */
export function updateFormulaEntry(
	entries: FormulaEntry[],
	id: string,
	updates: Partial<Pick<FormulaEntry, 'name' | 'expression' | 'editing'>>,
): FormulaEntry[] {
	return entries.map((e) => {
		if (e.id !== id) return e;
		const updated = { ...e, ...updates };
		if ('expression' in updates) {
			updated.error = validateFormulaExpression(updated.expression);
		}
		return updated;
	});
}

/**
 * Validates a formula expression by attempting to parse it.
 * Returns undefined if valid, or an error message string if invalid.
 */
export function validateFormulaExpression(
	expression: string,
): string | undefined {
	if (!expression.trim()) return undefined;
	try {
		parse(expression);
		return undefined;
	} catch (e) {
		return e instanceof Error ? e.message : 'Invalid expression';
	}
}

/**
 * Validates a formula name.
 * Returns undefined if valid, or an error message string if invalid.
 */
export function validateFormulaName(
	name: string,
	existingEntries: FormulaEntry[],
	currentId: string,
): string | undefined {
	const trimmed = name.trim();
	if (!trimmed) return 'Name is required';
	if (/\s/.test(trimmed)) return 'Name cannot contain spaces';
	if (/[.()]/.test(trimmed)) return 'Name cannot contain dots or parentheses';
	const duplicate = existingEntries.find(
		(e) =>
			e.id !== currentId &&
			e.name.trim().toLowerCase() === trimmed.toLowerCase(),
	);
	if (duplicate) return 'A formula with this name already exists';
	return undefined;
}

/**
 * Sets a formula entry into editing mode, and takes all other entries out of editing mode.
 * Ensures only one formula is being edited at a time.
 */
export function setFormulaEditing(
	entries: FormulaEntry[],
	id: string,
): FormulaEntry[] {
	return entries.map((e) => ({
		...e,
		editing: e.id === id,
	}));
}

/**
 * Finishes editing on all entries (sets editing to false).
 */
export function finishAllEditing(entries: FormulaEntry[]): FormulaEntry[] {
	return entries.map((e) => ({ ...e, editing: false }));
}
