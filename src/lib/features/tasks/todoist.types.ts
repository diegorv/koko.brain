/**
 * Lightweight project type for our store/UI.
 * Mapped from SDK's PersonalProject/WorkspaceProject response.
 */
export interface TodoistProject {
	id: string;
	name: string;
	color: string;
	is_favorite: boolean;
	child_order: number;
}

/**
 * Lightweight section type for our store/UI.
 * Mapped from SDK's Section response.
 */
export interface TodoistSection {
	id: string;
	project_id: string;
	name: string;
	section_order: number;
}

/** Tracks a task that was sent to Todoist (persisted to disk) */
export interface SentTaskEntry {
	/** Absolute file path of the source note */
	filePath: string;
	/** Task text used as secondary identifier */
	text: string;
	/** Todoist task ID returned by the API */
	todoistTaskId: string;
	/** Todoist web URL for the task */
	todoistUrl: string;
	/** Timestamp (ms) when the task was sent */
	sentAt: number;
	/** Whether the task is completed in Todoist (synced from API) */
	todoistCompleted?: boolean;
	/** Timestamp (ms) of last sync with Todoist API */
	syncedAt?: number;
}
