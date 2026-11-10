import type { AddTaskArgs } from '@doist/todoist-sdk';
import { mapPriorityToTodoist } from '#lib/features/todoist-sync/priority.logic.js';
import type { TaskMetadata } from './task-metadata.types';

/**
 * Builds Todoist AddTaskArgs from parsed task metadata.
 * Only includes fields that have values, letting Todoist use its defaults for the rest.
 *
 * - `content` comes from the clean description (without emoji signifiers)
 * - `priority` is mapped from our 5-level to Todoist's 4-level
 * - `dueDate` is set if present and there's no recurrence
 * - `dueString` is set from recurrence text (overrides dueDate — Todoist parses natural language)
 * - `labels` are set from tags
 */
export function buildTodoistArgs(metadata: TaskMetadata): Partial<AddTaskArgs> {
	const args: Partial<AddTaskArgs> = {
		content: metadata.description,
	};

	const todoistPriority = mapPriorityToTodoist(metadata.priority);
	if (todoistPriority > 1) {
		args.priority = todoistPriority;
	}

	// Recurrence overrides dueDate — Todoist parses dueString as natural language
	if (metadata.recurrence) {
		args.dueString = metadata.recurrence.text;
	} else if (metadata.dueDate) {
		args.dueDate = metadata.dueDate;
	}

	if (metadata.tags.length > 0) {
		args.labels = metadata.tags;
	}

	return args;
}

/**
 * Appends a label to an existing label list, deduplicated.
 *
 * - The label is trimmed; an empty/whitespace-only label leaves the list unchanged.
 * - A label already present (exact match) is not added again.
 * - When `labels` is undefined, returns a new single-element list.
 */
export function mergeLabel(labels: string[] | undefined, label: string): string[] {
	const trimmed = label.trim();
	const existing = labels ?? [];
	if (!trimmed || existing.includes(trimmed)) {
		return existing;
	}
	return [...existing, trimmed];
}
