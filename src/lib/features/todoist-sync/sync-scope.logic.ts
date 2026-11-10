/**
 * What a vault syncs: the root project's tree plus, optionally, the Inbox
 * (design rule 8c), and the fixed messages for Todoist failures (rule 13).
 * Inputs are the SDK's camel-cased `/sync` resources, narrowed to the fields
 * read here.
 */

/** The project fields the scope reads (SDK `PersonalProject` / `WorkspaceProject`). */
export interface ScopeProject {
	id: string;
	name: string;
	/** Absent on workspace projects, which nest by folder instead. */
	parentId?: string | null;
	childOrder: number;
	isDeleted: boolean;
	isArchived: boolean;
	/** True only on the account's Inbox. */
	inboxProject?: boolean;
}

/** The item fields the scope reads (SDK `Task`). */
export interface ScopeItem {
	projectId: string;
	checked: boolean;
	isDeleted: boolean;
}

/** Counts of what a vault's sync covers. */
export interface SyncScopeCounts {
	/** Projects in the tree, the Inbox included when it is. */
	projects: number;
	/** Unchecked, undeleted items in those projects. */
	openTasks: number;
	/** Whether an Inbox was found and counted. */
	inboxIncluded: boolean;
}

/** One entry of the root project picker. */
export interface RootProjectChoice {
	id: string;
	/** The project's path from the top, e.g. `Work / Acme`. */
	label: string;
}

/** A Todoist failure reduced to what the user can act on. */
export type TodoistFailure =
	| { kind: 'invalid-token' }
	| { kind: 'rate-limit'; retryAfter?: number }
	| { kind: 'unreachable' };

const isLive = (p: ScopeProject) => !p.isDeleted && !p.isArchived;

/** Live child projects per parent id, each list in `childOrder`. */
function childrenByParent(projects: ScopeProject[]): Map<string, ScopeProject[]> {
	const children = new Map<string, ScopeProject[]>();
	for (const p of projects) {
		if (!isLive(p) || !p.parentId) continue;
		const list = children.get(p.parentId) ?? [];
		list.push(p);
		children.set(p.parentId, list);
	}
	for (const list of children.values()) list.sort((a, b) => a.childOrder - b.childOrder);
	return children;
}

/**
 * Ids of the live root project and every live project nested under it, plus
 * the Inbox when `includeInbox`. A project under an archived or deleted one is
 * left out. Null when the root is empty, missing, archived or deleted.
 */
export function treeProjectIds(projects: ScopeProject[], rootId: string, includeInbox: boolean): Set<string> | null {
	const root = projects.find((p) => p.id === rootId);
	if (!rootId || !root || !isLive(root)) return null;
	const children = childrenByParent(projects);
	const ids = new Set<string>();
	const queue = [rootId];
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (ids.has(id)) continue;
		ids.add(id);
		for (const child of children.get(id) ?? []) queue.push(child.id);
	}
	if (includeInbox) {
		const inbox = projects.find((p) => p.inboxProject && isLive(p));
		if (inbox) ids.add(inbox.id);
	}
	return ids;
}

/** Counts the projects and open tasks a vault syncs; null when the root is not found. */
export function countSyncScope(
	projects: ScopeProject[],
	items: ScopeItem[],
	rootId: string,
	includeInbox: boolean,
): SyncScopeCounts | null {
	const ids = treeProjectIds(projects, rootId, includeInbox);
	if (!ids) return null;
	const openTasks = items.filter((i) => !i.checked && !i.isDeleted && ids.has(i.projectId)).length;
	const inboxIncluded = includeInbox && projects.some((p) => p.inboxProject && isLive(p) && ids.has(p.id));
	return { projects: ids.size, openTasks, inboxIncluded };
}

/**
 * Live projects other than the Inbox, in tree order (parents before their
 * children, siblings by `childOrder`), labelled with their path. A project
 * under an archived or deleted one is left out; one whose parent is not in
 * the list at all is listed at the top level.
 */
export function rootProjectChoices(projects: ScopeProject[]): RootProjectChoice[] {
	const known = new Set(projects.map((p) => p.id));
	const children = childrenByParent(projects);
	const tops = projects
		.filter((p) => isLive(p) && !p.inboxProject && (!p.parentId || !known.has(p.parentId)))
		.sort((a, b) => a.childOrder - b.childOrder);
	const choices: RootProjectChoice[] = [];
	const seen = new Set<string>();
	const visit = (p: ScopeProject, prefix: string) => {
		if (seen.has(p.id) || p.inboxProject) return;
		seen.add(p.id);
		const label = prefix ? `${prefix} / ${p.name}` : p.name;
		choices.push({ id: p.id, label });
		for (const child of children.get(p.id) ?? []) visit(child, label);
	};
	for (const top of tops) visit(top, '');
	return choices;
}

/**
 * Reduces a thrown value to a failure kind: HTTP 401/403 is an invalid token,
 * 429 a rate limit (with `responseData.error_extra.retry_after` seconds when
 * it is a number), anything else (5xx, network, timeout, unparsable) unreachable.
 */
export function classifyTodoistError(err: unknown): TodoistFailure {
	if (typeof err !== 'object' || err === null) return { kind: 'unreachable' };
	const { httpStatusCode, responseData } = err as { httpStatusCode?: unknown; responseData?: unknown };
	if (httpStatusCode === 401 || httpStatusCode === 403) return { kind: 'invalid-token' };
	if (httpStatusCode === 429) {
		const retryAfter = (responseData as { error_extra?: { retry_after?: unknown } } | null | undefined)?.error_extra?.retry_after;
		return typeof retryAfter === 'number' ? { kind: 'rate-limit', retryAfter } : { kind: 'rate-limit' };
	}
	return { kind: 'unreachable' };
}

/** The fixed user-facing message of a failure kind. */
export function syncErrorMessage(failure: TodoistFailure): string {
	switch (failure.kind) {
		case 'invalid-token':
			return 'Todoist rejected the API token. Check it in Settings > Todoist.';
		case 'rate-limit':
			if (failure.retryAfter === undefined) return 'Todoist rate limit reached. Try again later.';
			return `Todoist rate limit reached. Try again in ${plural(failure.retryAfter, 'second')}.`;
		case 'unreachable':
			return 'Could not reach Todoist. Check your connection and try again.';
	}
}

/** The success message of the connection check. */
export function formatCheckResult(counts: SyncScopeCounts): string {
	const inbox = counts.inboxIncluded ? ' (Inbox included)' : '';
	return `Todoist connection OK: ${plural(counts.projects, 'project')}, ${plural(counts.openTasks, 'open task')}${inbox}.`;
}

function plural(n: number, noun: string): string {
	return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
