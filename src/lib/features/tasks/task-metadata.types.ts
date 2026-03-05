/** Task priority levels extracted from emoji signifiers */
export type TaskPriority = 'highest' | 'high' | 'medium' | 'none' | 'low' | 'lowest';

/**
 * Task status parsed from the checkbox character.
 * Extends standard `[ ]`/`[x]` with custom status chars used by Tasks plugin.
 */
export type TaskStatus =
	| 'todo'
	| 'done'
	| 'cancelled'
	| 'in-progress'
	| 'question'
	| 'forwarded'
	| 'important';

/** Recurrence rule extracted from the 🔁 signifier */
export interface RecurrenceRule {
	/** Raw recurrence text (e.g. "every week", "every 3 days") */
	text: string;
}

/**
 * Structured metadata extracted from a task's raw text.
 * Parsed from emoji signifiers following the Tasks plugin convention.
 */
export interface TaskMetadata {
	/** Clean task text with all signifiers stripped */
	description: string;
	/** Due date in YYYY-MM-DD format (📅) */
	dueDate?: string;
	/** Scheduled date in YYYY-MM-DD format (⏳) */
	scheduledDate?: string;
	/** Start date in YYYY-MM-DD format (🛫) */
	startDate?: string;
	/** Created date in YYYY-MM-DD format (➕) */
	createdDate?: string;
	/** Done date in YYYY-MM-DD format (✅) */
	doneDate?: string;
	/** Cancelled date in YYYY-MM-DD format (❌) */
	cancelledDate?: string;
	/** Priority level from emoji signifier */
	priority?: TaskPriority;
	/** Recurrence rule (🔁) */
	recurrence?: RecurrenceRule;
	/** Task ID (🆔) */
	id?: string;
	/** Task IDs this task depends on (⛔) */
	dependsOn?: string[];
	/** Action on completion (🏁) */
	onCompletion?: string;
	/** Tags extracted from the description (e.g. #work, #home) */
	tags: string[];
}
