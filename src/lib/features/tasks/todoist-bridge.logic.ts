import type { AddTaskArgs } from '@doist/todoist-api-typescript';
import type { TaskMetadata, TaskPriority } from './task-metadata.types';

/**
 * Maps our 5-level priority to Todoist's 4-level priority.
 *
 * | TaskPriority | Todoist priority | Todoist UI label |
 * |-------------|---------|---------------|
 * | highest     | 4       | Very Urgent   |
 * | high        | 3       | Urgent        |
 * | medium      | 2       | High          |
 * | low/lowest  | 1       | Normal        |
 * | none/undef  | 1       | Normal        |
 */
export function mapPriorityToTodoist(priority?: TaskPriority): number {
	switch (priority) {
		case 'highest':
			return 4;
		case 'high':
			return 3;
		case 'medium':
			return 2;
		case 'low':
		case 'lowest':
		case 'none':
		default:
			return 1;
	}
}

/**
 * Maps Todoist's 4-level priority back to our TaskPriority.
 *
 * | Todoist priority | TaskPriority |
 * |---------|-------------|
 * | 4       | highest     |
 * | 3       | high        |
 * | 2       | medium      |
 * | 1       | none        |
 */
export function mapPriorityFromTodoist(priority: number): TaskPriority {
	switch (priority) {
		case 4:
			return 'highest';
		case 3:
			return 'high';
		case 2:
			return 'medium';
		default:
			return 'none';
	}
}

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
