import type { TaskPriority } from '#lib/contracts/index.js';

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
 * Maps a Todoist priority back to ours, the inverse of
 * {@link mapPriorityToTodoist} for 4, 3 and 2. Todoist's 1 (Normal), and
 * any other value, is no priority: null.
 */
export function mapPriorityFromTodoist(priority: number): TaskPriority | null {
	switch (priority) {
		case 4:
			return 'highest';
		case 3:
			return 'high';
		case 2:
			return 'medium';
		default:
			return null;
	}
}
