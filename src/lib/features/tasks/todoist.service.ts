import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import type { AddTaskArgs } from '@doist/todoist-api-typescript';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { debug, error } from '$lib/utils/debug';
import { todoistStore } from './todoist.store.svelte';
import { createTodoistClient } from './todoist-client';
import type { TodoistProject, TodoistSection, SentTaskEntry } from './todoist.types';
import type { TaskMetadata } from './task-metadata.types';
import { buildTodoistArgs } from './todoist-bridge.logic';

const SENT_TASKS_FILE = '.kokobrain/todoist-sent.json';

/**
 * Fetches all projects from the Todoist API via SDK.
 * Maps SDK response to our lightweight TodoistProject type.
 * @throws Error if the request fails or token is invalid
 */
export async function fetchProjects(token: string): Promise<TodoistProject[]> {
	debug('TODOIST', 'fetchProjects: requesting...');
	const client = createTodoistClient(token);
	const { results } = await client.getProjects();
	const projects: TodoistProject[] = results.map((p) => ({
		id: p.id,
		name: p.name,
		color: p.color,
		is_favorite: p.isFavorite,
		child_order: p.childOrder,
	}));
	debug('TODOIST', 'fetchProjects: received', projects.length, 'projects');
	return projects;
}

/**
 * Fetches sections for a specific project from the Todoist API via SDK.
 * Maps SDK response to our lightweight TodoistSection type.
 * @throws Error if the request fails
 */
export async function fetchSections(token: string, projectId: string): Promise<TodoistSection[]> {
	debug('TODOIST', 'fetchSections: requesting for project', projectId);
	const client = createTodoistClient(token);
	const { results } = await client.getSections({ projectId });
	const sections: TodoistSection[] = results.map((s) => ({
		id: s.id,
		project_id: s.projectId,
		name: s.name,
		section_order: s.sectionOrder,
	}));
	debug('TODOIST', 'fetchSections: received', sections.length, 'sections');
	return sections;
}

/**
 * Creates a new task in Todoist via SDK.
 * @returns Object with task id and url
 * @throws Error if the request fails
 */
export async function createTodoistTask(
	token: string,
	args: AddTaskArgs,
): Promise<{ id: string; url: string }> {
	debug('TODOIST', 'createTask: sending', args);
	const client = createTodoistClient(token);
	const task = await client.addTask(args);
	debug('TODOIST', 'createTask: created', task.id, task.url);
	return { id: task.id, url: task.url };
}

/**
 * Fetches a single task from Todoist by ID via SDK.
 * Returns the task's checked status or null if not found (deleted).
 * @throws Error if the request fails with a non-404 status
 */
export async function fetchTaskById(
	token: string,
	taskId: string,
): Promise<{ id: string; checked: boolean } | null> {
	debug('TODOIST', 'fetchTaskById:', taskId);
	try {
		const client = createTodoistClient(token);
		const task = await client.getTask(taskId);
		debug('TODOIST', 'fetchTaskById:', taskId, 'checked:', task.checked);
		return { id: task.id, checked: task.checked };
	} catch (err) {
		// SDK throws on HTTP errors — treat 404 as "not found"
		if (err instanceof Error && (err.message.includes('404') || err.message.includes('not found'))) {
			debug('TODOIST', 'fetchTaskById: not found (deleted?)', taskId);
			return null;
		}
		throw err;
	}
}

/** Returns the full path to the sent-tasks JSON file within the vault */
function sentTasksPath(): string {
	return `${vaultStore.path}/${SENT_TASKS_FILE}`;
}

/**
 * Loads previously sent tasks from disk.
 * Returns an empty array if the file doesn't exist or fails to parse.
 */
export async function loadSentTasks(): Promise<SentTaskEntry[]> {
	try {
		const path = sentTasksPath();
		if (!(await exists(path))) {
			debug('TODOIST', 'loadSentTasks: no file found at', path);
			return [];
		}
		const raw = await readTextFile(path);
		const entries = JSON.parse(raw) as SentTaskEntry[];
		debug('TODOIST', 'loadSentTasks: loaded', entries.length, 'entries');
		return entries;
	} catch (err) {
		error('TODOIST', 'Failed to load sent tasks:', err);
		return [];
	}
}

/**
 * Persists the sent-tasks list to disk.
 * Creates the `.kokobrain/` directory if it doesn't exist.
 */
export async function saveSentTasks(entries: SentTaskEntry[]): Promise<void> {
	const dirPath = `${vaultStore.path}/.kokobrain`;
	if (!(await exists(dirPath))) {
		await mkdir(dirPath);
	}
	await writeTextFile(sentTasksPath(), JSON.stringify(entries, null, '\t'));
	debug('TODOIST', 'saveSentTasks: persisted', entries.length, 'entries');
}

/**
 * Loads projects from Todoist API and caches them in the store.
 * Skips fetching if projects are already cached.
 */
export async function loadProjects(forceRefresh = false): Promise<void> {
	const token = settingsStore.todoist.apiToken;
	if (!token) throw new Error('Todoist API token not configured');

	if (todoistStore.projects.length > 0 && !forceRefresh) {
		debug('TODOIST', 'loadProjects: using cached', todoistStore.projects.length, 'projects');
		return;
	}

	todoistStore.setLoadingProjects(true);
	try {
		const projects = await fetchProjects(token);
		todoistStore.setProjects(projects);
		debug('TODOIST', 'loadProjects: cached', projects.length, 'projects');
	} finally {
		todoistStore.setLoadingProjects(false);
	}
}

/**
 * Loads sections for a project from Todoist API and caches them in the store.
 */
export async function loadSections(projectId: string): Promise<void> {
	const token = settingsStore.todoist.apiToken;
	if (!token) throw new Error('Todoist API token not configured');

	todoistStore.setLoadingSections(true);
	try {
		const sections = await fetchSections(token, projectId);
		todoistStore.setSections(sections);
		debug('TODOIST', 'loadSections: cached', sections.length, 'sections for project', projectId);
	} finally {
		todoistStore.setLoadingSections(false);
	}
}

/**
 * Orchestrates sending a task to Todoist:
 * 1. Builds args from metadata (if provided) as defaults
 * 2. Applies manual overrides from the popover (project, section, priority)
 * 3. Creates the task via SDK
 * 4. Marks it as sent in the store
 * 5. Persists to disk
 */
export async function sendTaskToTodoist(
	filePath: string,
	text: string,
	projectId?: string,
	sectionId?: string,
	priority?: number,
	metadata?: TaskMetadata,
): Promise<void> {
	const token = settingsStore.todoist.apiToken;
	if (!token) throw new Error('Todoist API token not configured');

	debug('TODOIST', 'sendTaskToTodoist:', { filePath, text, projectId, sectionId, priority });
	todoistStore.setSending(true);
	try {
		// Start with metadata-derived args as defaults, then apply manual overrides
		const metadataArgs = metadata ? buildTodoistArgs(metadata) : {};
		const args: AddTaskArgs = {
			...metadataArgs,
			// Fall back to raw text when metadata description is empty
			content: metadataArgs.content || text,
			// Manual overrides from the popover take precedence
			...(projectId && { projectId }),
			...(sectionId && { sectionId }),
			...(priority !== undefined && { priority }),
		} as AddTaskArgs;

		const result = await createTodoistTask(token, args);

		const entry: SentTaskEntry = {
			filePath,
			text,
			todoistTaskId: result.id,
			todoistUrl: result.url,
			sentAt: Date.now(),
		};

		todoistStore.addSentTask(entry);
		await saveSentTasks(todoistStore.sentTasks);

		// Remember selections for next time
		if (projectId) todoistStore.setLastProjectId(projectId);
		if (sectionId) todoistStore.setLastSectionId(sectionId);
		if (priority) todoistStore.setLastPriority(priority);

		debug('TODOIST', 'sendTaskToTodoist: success, id:', result.id, 'url:', result.url);
	} finally {
		todoistStore.setSending(false);
	}
}

/** Initializes Todoist state by loading sent tasks from disk */
export async function initTodoist(): Promise<void> {
	if (!vaultStore.path) return;
	debug('TODOIST', 'initTodoist: loading sent tasks from', vaultStore.path);
	const entries = await loadSentTasks();
	todoistStore.setSentTasks(entries);
	debug('TODOIST', 'initTodoist: ready,', entries.length, 'previously sent tasks');
}

/**
 * Syncs completion status for all sent tasks from the Todoist API.
 * Fetches each task in parallel and updates the store + disk.
 */
export async function syncTodoistTasks(): Promise<void> {
	const token = settingsStore.todoist.apiToken;
	if (!token) throw new Error('Todoist API token not configured');

	const tasks = todoistStore.sentTasks;
	if (tasks.length === 0) {
		debug('TODOIST', 'syncTodoistTasks: no sent tasks to sync');
		return;
	}

	debug('TODOIST', 'syncTodoistTasks: syncing', tasks.length, 'tasks');
	todoistStore.setSyncing(true);
	try {
		const results = await Promise.allSettled(
			tasks.map((entry) => fetchTaskById(token, entry.todoistTaskId)),
		);

		const now = Date.now();
		for (let i = 0; i < tasks.length; i++) {
			const result = results[i];
			if (result.status === 'fulfilled') {
				const task = result.value;
				todoistStore.updateSentTask(tasks[i].todoistTaskId, {
					todoistCompleted: task?.checked ?? false,
					syncedAt: now,
				});
			} else {
				debug('TODOIST', 'syncTodoistTasks: failed for', tasks[i].todoistTaskId, result.reason);
			}
		}

		await saveSentTasks(todoistStore.sentTasks);
		debug('TODOIST', 'syncTodoistTasks: done');
	} finally {
		todoistStore.setSyncing(false);
	}
}
