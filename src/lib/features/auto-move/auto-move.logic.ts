import type { AutoMoveRule } from './auto-move.types';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import { evaluateExpression, type EvalContext } from '$lib/features/collection/expression/evaluator';
import { parse } from '$lib/features/collection/expression/parser';

/**
 * Evaluates all rules against a NoteRecord and returns the first matching rule.
 * Uses first-match-wins semantics (rules are evaluated in order).
 * Only evaluates enabled rules. Invalid expressions are skipped gracefully.
 */
export function findMatchingRule(
	rules: AutoMoveRule[],
	record: NoteRecord,
): AutoMoveRule | null {
	for (const rule of rules) {
		if (!rule.enabled) continue;
		try {
			const ctx: EvalContext = { record, formulas: {} };
			const result = evaluateExpression(rule.expression, ctx);
			if (result) return rule;
		} catch {
			// Skip rules with invalid expressions
			continue;
		}
	}
	return null;
}

/**
 * Checks if a file path is inside any excluded folder.
 * Comparison is case-insensitive and matches folder prefix.
 */
export function isInExcludedFolder(
	filePath: string,
	vaultPath: string,
	excludedFolders: string[],
): boolean {
	if (excludedFolders.length === 0) return false;

	// Get vault-relative folder of the file
	const relPath = filePath.startsWith(vaultPath + '/')
		? filePath.slice(vaultPath.length + 1)
		: filePath;
	const lastSlash = relPath.lastIndexOf('/');
	const folder = lastSlash > 0 ? relPath.substring(0, lastSlash) : '';

	return excludedFolders.some((excluded) => {
		const normalizedExcluded = excluded.toLowerCase();
		const normalizedFolder = folder.toLowerCase();
		return (
			normalizedFolder === normalizedExcluded ||
			normalizedFolder.startsWith(normalizedExcluded + '/')
		);
	});
}

/**
 * Checks if a file is already in the rule's destination folder.
 * Prevents unnecessary moves.
 */
export function isAlreadyInDestination(
	filePath: string,
	vaultPath: string,
	destination: string,
): boolean {
	const relPath = filePath.startsWith(vaultPath + '/')
		? filePath.slice(vaultPath.length + 1)
		: filePath;
	const lastSlash = relPath.lastIndexOf('/');
	const folder = lastSlash > 0 ? relPath.substring(0, lastSlash) : '';

	return folder.toLowerCase() === destination.toLowerCase();
}

/**
 * Validates a rule's expression by attempting to parse it.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateExpression(expression: string): string | null {
	if (!expression.trim()) return 'Expression cannot be empty';
	try {
		parse(expression);
		return null;
	} catch (err) {
		return err instanceof Error ? err.message : 'Invalid expression';
	}
}

/**
 * Generates a unique rule ID based on timestamp + random suffix.
 */
export function generateRuleId(): string {
	return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
