/**
 * Deletion sync, as pure planning: a task deleted on either side is
 * detached, never deleted on the other (design: Deletion, rules 8c and 9 of
 * `.scratch/todoist-bisync/research/design.md`). A detached link keeps its
 * row, so the anchor stays owned: the pull never inserts its Todoist task
 * again, and the anchor is never sent as a create. The line and the Todoist
 * task are left as they are; both just stop syncing.
 */

import type { TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import type { PullItem, ScannedLine } from './pull.logic.js';
import type { ScopeProject } from './sync-scope.logic.js';

/** Consecutive scans without the line before its link detaches; also the `miss_count` of a detached link. */
export const DETACH_AFTER_MISSES = 3;

/** Whether a link is detached: it no longer syncs either way. */
export function isDetached(link: TodoistTaskLink): boolean {
	return link.missCount >= DETACH_AFTER_MISSES;
}

/** Everything {@link planDetach} reads. */
export interface DetachInput {
	/** The stored links, with this cycle's `frozen` flags. */
	links: TodoistTaskLink[];
	/** Anchor -> every in-scope line carrying it, from a scan on a ready index. */
	occurrences: Map<string, ScannedLine[]>;
	/** Todoist items reported this cycle by id (full and incremental pulls). */
	items: Map<string, PullItem>;
	/** Project ids of the vault's tree. */
	treeIds: ReadonlySet<string>;
	/** Every project of the full and incremental pulls, archived and deleted ones included. */
	projects: ScopeProject[];
	/** Anchors whose line was moved out of sync scope (`outOfScopeAnchors`). */
	outOfScope?: ReadonlySet<string>;
}

/**
 * Whether `projectId` is a live project whose live ancestors never reach the
 * tree. An unknown project (created after the full pull) or one that is, or
 * sits under, an archived or deleted project is not: a link resumes on
 * unarchive, so neither may detach it for good.
 */
export function isLiveOutsideTree(projectId: string, projects: ScopeProject[], treeIds: ReadonlySet<string>): boolean {
	const byId = new Map(projects.map((p) => [p.id, p]));
	const visited = new Set<string>();
	let id: string | null | undefined = projectId;
	while (id) {
		if (treeIds.has(id) || visited.has(id)) return false;
		visited.add(id);
		const project = byId.get(id);
		if (!project || project.isDeleted || project.isArchived) return false;
		id = project.parentId;
	}
	return true;
}

/** What {@link planDetach} decided. */
export interface DetachPlan {
	/** Links whose `miss_count` changed (and, on a detach, whose `pending_cmd` was cleared). */
	links: TodoistTaskLink[];
	/** Anchors detached this cycle. */
	detached: string[];
	/** One `detach` entry per detached anchor. */
	log: TodoistSyncLogInput[];
}

/**
 * Plans the detaches of one cycle. Per link not yet detached:
 * - its item reported deleted, in a project reported deleted (the item's
 *   project, else the one in `remote_base`), or in a known, live project
 *   outside the vault's tree, or its line moved out of sync scope
 *   (`outOfScope`): detached at once;
 * - no line in the scan: one more miss, detached on the third in a row;
 * - its line back after a miss: the count resets.
 * A pending add (no Todoist id yet) has no item and no `remote_base`, so
 * only its misses count: a line deleted before Todoist got the task
 * detaches like any other. An item the pulls did not report counts as
 * unchanged, never as deleted. A detach clears `pending_cmd`, so nothing is
 * sent for it.
 */
export function planDetach(input: DetachInput): DetachPlan {
	const plan: DetachPlan = { links: [], detached: [], log: [] };
	const deletedProjects = new Set(input.projects.filter((p) => p.isDeleted).map((p) => p.id));
	for (const link of input.links) {
		if (isDetached(link)) continue;
		const item = link.todoistId === null ? undefined : input.items.get(link.todoistId);
		const hasLine = (input.occurrences.get(link.anchor)?.length ?? 0) > 0;
		const projectId = item?.projectId ?? (link.remoteBase ? (JSON.parse(link.remoteBase) as { projectId?: string }).projectId : undefined);
		let reason: string | null = null;
		if (item?.isDeleted) reason = `Todoist task ${link.todoistId} was deleted in Todoist`;
		else if (projectId !== undefined && deletedProjects.has(projectId)) reason = `The project of Todoist task ${link.todoistId} was deleted in Todoist`;
		else if (item && isLiveOutsideTree(item.projectId, input.projects, input.treeIds)) reason = `Todoist task ${link.todoistId} moved to a project outside the vault's tree`;
		else if (input.outOfScope?.has(link.anchor)) reason = 'The line moved to a note out of sync scope (no project note and no #todoist); the task is not moved in Todoist';
		else if (!hasLine && link.missCount + 1 >= DETACH_AFTER_MISSES) {
			reason = `The line was not found in the vault in ${DETACH_AFTER_MISSES} syncs in a row`;
		}
		if (reason !== null) {
			plan.links.push({ ...link, missCount: DETACH_AFTER_MISSES, pendingCmd: null });
			plan.detached.push(link.anchor);
			plan.log.push({ kind: 'detach', anchor: link.anchor, message: `${reason}; the link is detached and neither side is deleted` });
			continue;
		}
		const missCount = hasLine ? 0 : link.missCount + 1;
		if (missCount !== link.missCount) plan.links.push({ ...link, missCount });
	}
	return plan;
}

/**
 * The line brake of design rule 9: true when fewer than half of the active
 * (not detached) links have a line in the scan, which includes none at all.
 * A scan that lost most lines (a vault half synced, a folder moved away)
 * must not count as their deletion. Never true without active links.
 */
export function belowLineBrake(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>): boolean {
	const active = links.filter((l) => !isDetached(l));
	const seen = active.filter((l) => (occurrences.get(l.anchor)?.length ?? 0) > 0).length;
	return active.length > 0 && seen * 2 < active.length;
}
