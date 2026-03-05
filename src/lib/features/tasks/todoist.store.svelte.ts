import type { TodoistProject, TodoistSection, SentTaskEntry } from './todoist.types';

/** Cached project list from Todoist API */
let projects = $state<TodoistProject[]>([]);
/** Sections for the currently selected project */
let sections = $state<TodoistSection[]>([]);
/** Tasks already sent to Todoist (persisted to disk) */
let sentTasks = $state<SentTaskEntry[]>([]);
/** Last-used project ID (remembered across sends) */
let lastProjectId = $state('');
/** Last-used section ID (remembered across sends) */
let lastSectionId = $state('');
/** Last-used priority (remembered across sends, default normal) */
let lastPriority = $state(1);
/** Whether projects are currently loading */
let isLoadingProjects = $state(false);
/** Whether sections are currently loading */
let isLoadingSections = $state(false);
/** Whether a task is currently being sent */
let isSending = $state(false);
/** Whether tasks are currently being synced from Todoist */
let isSyncing = $state(false);

/** Builds a Set of "filePath:text" keys for O(1) sent-task lookups */
function buildSentKeys(entries: SentTaskEntry[]): Set<string> {
	const keys = new Set<string>();
	for (const entry of entries) {
		keys.add(`${entry.filePath}:${entry.text}`);
	}
	return keys;
}

let sentTaskKeys = $state<Set<string>>(new Set());

/** Reactive store for Todoist integration state */
export const todoistStore = {
	get projects() { return projects; },
	get sections() { return sections; },
	get sentTasks() { return sentTasks; },
	get lastProjectId() { return lastProjectId; },
	get lastSectionId() { return lastSectionId; },
	get lastPriority() { return lastPriority; },
	get isLoadingProjects() { return isLoadingProjects; },
	get isLoadingSections() { return isLoadingSections; },
	get isSending() { return isSending; },
	get isSyncing() { return isSyncing; },

	/** Checks whether a task has already been sent to Todoist */
	isSent(filePath: string, text: string): boolean {
		return sentTaskKeys.has(`${filePath}:${text}`);
	},

	setProjects(value: TodoistProject[]) { projects = value; },
	setSections(value: TodoistSection[]) { sections = value; },
	setLastProjectId(id: string) { lastProjectId = id; },
	setLastSectionId(id: string) { lastSectionId = id; },
	setLastPriority(value: number) { lastPriority = value; },
	setLoadingProjects(loading: boolean) { isLoadingProjects = loading; },
	setLoadingSections(loading: boolean) { isLoadingSections = loading; },
	setSending(sending: boolean) { isSending = sending; },
	setSyncing(syncing: boolean) { isSyncing = syncing; },

	/** Replaces the full sent-tasks list (used on load from disk) */
	setSentTasks(entries: SentTaskEntry[]) {
		sentTasks = entries;
		sentTaskKeys = buildSentKeys(entries);
	},

	/** Checks whether a sent task is completed in Todoist */
	isCompletedInTodoist(filePath: string, text: string): boolean {
		const entry = sentTasks.find(
			(e) => e.filePath === filePath && e.text === text,
		);
		return entry?.todoistCompleted === true;
	},

	/** Gets the Todoist URL for a sent task */
	getTodoistUrl(filePath: string, text: string): string | undefined {
		const entry = sentTasks.find(
			(e) => e.filePath === filePath && e.text === text,
		);
		return entry?.todoistUrl;
	},

	/** Updates a sent task entry by Todoist task ID */
	updateSentTask(todoistTaskId: string, updates: Partial<SentTaskEntry>) {
		sentTasks = sentTasks.map((entry) =>
			entry.todoistTaskId === todoistTaskId
				? { ...entry, ...updates }
				: entry,
		);
		sentTaskKeys = buildSentKeys(sentTasks);
	},

	/** Adds a single sent-task entry and updates the lookup set */
	addSentTask(entry: SentTaskEntry) {
		sentTasks = [...sentTasks, entry];
		sentTaskKeys = new Set(sentTaskKeys);
		sentTaskKeys.add(`${entry.filePath}:${entry.text}`);
	},

	/** Resets all Todoist state */
	reset() {
		projects = [];
		sections = [];
		sentTasks = [];
		sentTaskKeys = new Set();
		lastProjectId = '';
		lastSectionId = '';
		lastPriority = 1;
		isLoadingProjects = false;
		isLoadingSections = false;
		isSending = false;
		isSyncing = false;
	},
};
