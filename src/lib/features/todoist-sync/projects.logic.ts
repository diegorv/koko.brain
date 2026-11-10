/**
 * Project sync, as pure planning: which project notes are renamed after a
 * Todoist rename, which Todoist projects are renamed after a note rename,
 * which new notes of the sync folder become Todoist projects, and which
 * project notes detach. Design: `.scratch/todoist-bisync/research/design.md`
 * Project model, rules 2, 8c and 10.
 *
 * The state lives in the `todoist_kv` row {@link PROJECT_STATE_KEY} as JSON:
 * per project the name and note path last seen on both sides (the base),
 * the brain-born projects whose `project_add` is not acknowledged yet, and
 * the notes Todoist refused to create.
 */

import type { TodoistKvEntry, TodoistSyncLogInput } from '#lib/contracts/index.js';
import { isInSyncScope } from './anchor.logic.js';
import { isLiveOutsideTree } from './detach.logic.js';
import { projectNoteBaseName, type ScannedNote } from './pull.logic.js';
import type { ScopeProject } from './sync-scope.logic.js';

/** The `todoist_kv` key holding the {@link ProjectState} JSON. */
export const PROJECT_STATE_KEY = 'projects';

/** A project as last seen on both sides. */
export interface ProjectBase {
	/** The Todoist name. */
	name: string;
	/** Vault-relative path of the project note. */
	relPath: string;
	/** Set once the project was deleted or moved out of the tree: its note no longer syncs. */
	detached?: boolean;
	/** The temp id of a brain-born project's `project_add`, so a later resend naming it is sent with the real id. */
	tempId?: string;
}

/** A brain-born project whose `project_add` is stored before it is sent (design rule 2) and resent until acknowledged. */
export interface PendingProject {
	/** The note that becomes the project. */
	relPath: string;
	/** Command uuid; a resend with it is applied once (live-check 8). */
	uuid: string;
	/** Command temp id; the note's tasks are added with it as `projectId`. */
	tempId: string;
	/** The `project_add` arguments: the note's file name under the root project. */
	args: { name: string; parentId: string };
}

/** Everything kept between cycles about projects. */
export interface ProjectState {
	/** Project id -> base. */
	bases: Record<string, ProjectBase>;
	/** Brain-born projects sent and not acknowledged yet. */
	pending: PendingProject[];
	/** Notes whose `project_add` Todoist refused: never sent again under that path. */
	refused: string[];
}

/** A Todoist rename to apply to the note. */
export interface PlannedNoteRename {
	/** The renamed Todoist project. */
	projectId: string;
	/** The Todoist name the base takes once the note is renamed. */
	name: string;
	/** Vault-relative path of the note now. */
	from: string;
	/** Vault-relative path the note is renamed to. */
	to: string;
}

/** A note rename to push as `project_update`. */
export interface PlannedProjectUpdate {
	/** The Todoist project to rename. */
	projectId: string;
	/** Command uuid of the `project_update`. */
	uuid: string;
	/** The note's file name, the project's new name. */
	name: string;
	/** The note path the base takes. */
	relPath: string;
	/** The Todoist name, kept when Todoist refuses the update. */
	remoteName: string;
}

/** Everything {@link planProjects} reads. */
export interface ProjectInput {
	/** Normalized sync folder. */
	folder: string;
	/** Every project of the full pull and the incremental one, newest row per id. */
	projects: ScopeProject[];
	/** Project ids of the vault's tree. */
	treeIds: ReadonlySet<string>;
	/** The root project, parent of brain-born projects (design rule 8c). */
	rootId: string;
	/** Every indexed note. */
	notes: ScannedNote[];
	/** Notes the pull creates this cycle. */
	createdNotes: { projectId: string; relPath: string }[];
	/** The vault's templates folder (excluded, design rule 11). */
	templatesFolder: string;
	/** The project state stored by the last cycle. */
	state: ProjectState;
	/** False in rebuild mode: no project is created (design rule 1). */
	allowAdds: boolean;
	/** A fresh command uuid. */
	newUuid: () => string;
	/** A fresh command temp id. */
	newTempId: () => string;
}

/** What {@link planProjects} decided. */
export interface ProjectPlan {
	/** The state with bases adopted, moved and detached, pending adds of gone notes dropped; new adds not in it. */
	state: ProjectState;
	/** New brain-born projects; stored in `state.pending` only when they are sent. */
	adds: PendingProject[];
	/** Pending adds of earlier cycles, sent again as stored. */
	resends: PendingProject[];
	/** Projects named by two or more notes: nothing of them syncs (design rule 10). */
	frozenProjectIds: Set<string>;
	renames: PlannedNoteRename[];
	updates: PlannedProjectUpdate[];
	log: TodoistSyncLogInput[];
}

/** Reads the project state from the kv rows; empty when absent or unreadable. */
export function readProjectState(kv: TodoistKvEntry[]): ProjectState {
	const raw = kv.find((e) => e.key === PROJECT_STATE_KEY)?.value;
	const empty: ProjectState = { bases: {}, pending: [], refused: [] };
	if (raw === undefined) return empty;
	try {
		const value = JSON.parse(raw) as Partial<ProjectState> | null;
		return {
			bases: value?.bases && typeof value.bases === 'object' ? value.bases : {},
			pending: Array.isArray(value?.pending) ? value.pending : [],
			refused: Array.isArray(value?.refused) ? value.refused : [],
		};
	} catch {
		return empty;
	}
}

/** The note's file name without its Markdown extension. */
export function noteBaseName(relPath: string): string {
	return relPath.slice(relPath.lastIndexOf('/') + 1).replace(/\.(md|markdown)$/iu, '');
}

function parentOf(relPath: string): string {
	const i = relPath.lastIndexOf('/');
	return i < 0 ? '' : relPath.slice(0, i);
}

/**
 * Tree projects with no note whose name matches a brain-born project still
 * pending under the root: its `project_add` may have been applied with the
 * response lost, so the pull must not give it a second note before the
 * resend returns its id.
 */
export function heldProjectIds(state: ProjectState, projects: ScopeProject[], treeIds: ReadonlySet<string>, notes: ScannedNote[]): Set<string> {
	const named = new Set(notes.map((n) => n.projectId));
	const held = new Set<string>();
	for (const project of projects) {
		if (!treeIds.has(project.id) || named.has(project.id) || state.bases[project.id]) continue;
		if (state.pending.some((p) => p.args.name === project.name && p.args.parentId === project.parentId)) held.add(project.id);
	}
	return held;
}

/**
 * Plans the project side of one cycle. Per live tree project named by
 * exactly one note:
 * - no base, or a detached one (the project is back in the tree): the
 *   current name and path are adopted, nothing is sent;
 * - Todoist name changed: the note is renamed to it (filename cleaned, a
 *   suffix on collision); when the note was renamed too, Todoist wins and
 *   the brain name is logged;
 * - only the note's file name changed: `project_update` with it as the name;
 * - only its folder changed: the base follows.
 * The Inbox is never renamed. A project named by two or more notes is
 * frozen. A base whose project was deleted, or moved to a live project
 * outside the tree, detaches (logged; the note is kept); an archived or
 * unknown project keeps its base, so unarchiving resumes it.
 *
 * A note directly in the sync folder, in sync scope, with no
 * `todoist_project`, becomes a brain-born project under the root unless
 * Todoist refused it before. A pending add whose note is gone or got an id
 * is dropped.
 */
export function planProjects(input: ProjectInput): ProjectPlan {
	const bases: Record<string, ProjectBase> = { ...input.state.bases };
	const plan: ProjectPlan = {
		state: { bases, pending: [], refused: [] },
		adds: [],
		resends: [],
		frozenProjectIds: new Set(),
		renames: [],
		updates: [],
		log: [],
	};
	const byId = new Map(input.projects.map((p) => [p.id, p]));
	const notesById = new Map<string, ScannedNote[]>();
	for (const note of input.notes) {
		if (note.projectId !== null) notesById.set(note.projectId, [...(notesById.get(note.projectId) ?? []), note]);
	}
	const taken = new Set([...input.notes.map((n) => n.relPath), ...input.createdNotes.map((n) => n.relPath)].map((p) => p.toLowerCase()));

	for (const created of input.createdNotes) {
		bases[created.projectId] = { name: byId.get(created.projectId)!.name, relPath: created.relPath };
	}
	for (const id of input.treeIds) {
		const project = byId.get(id);
		const notes = notesById.get(id) ?? [];
		if (!project || notes.length !== 1) {
			if (notes.length > 1) plan.frozenProjectIds.add(id);
			continue;
		}
		const note = notes[0];
		const base = bases[id];
		if (!base || base.detached) {
			bases[id] = { name: project.name, relPath: note.relPath, ...(base?.tempId ? { tempId: base.tempId } : {}) };
			continue;
		}
		const localName = noteBaseName(note.relPath);
		const localRenamed = localName !== noteBaseName(base.relPath);
		const remoteRenamed = project.name !== base.name;
		if (project.inboxProject || (!remoteRenamed && !localRenamed)) {
			bases[id] = { ...base, relPath: note.relPath };
			continue;
		}
		if (!remoteRenamed) {
			plan.updates.push({ projectId: id, uuid: input.newUuid(), name: localName, relPath: note.relPath, remoteName: project.name });
			continue;
		}
		if (localRenamed) {
			plan.log.push({
				kind: 'conflict',
				anchor: null,
				message: `Project ${id} was renamed on both sides; Todoist wins with ${JSON.stringify(project.name)}, the note name ${JSON.stringify(localName)} is dropped`,
			});
		}
		const target = projectNoteBaseName(project.name);
		const ext = /\.(md|markdown)$/iu.exec(note.relPath)?.[0] ?? '.md';
		const dir = parentOf(note.relPath);
		const pathFor = (name: string) => `${dir === '' ? '' : `${dir}/`}${name}${ext}`;
		const own = note.relPath.toLowerCase();
		let to = pathFor(target);
		for (let n = 2; to.toLowerCase() !== own && taken.has(to.toLowerCase()); n++) to = pathFor(`${target} ${n}`);
		// A case-only change keeps the path: the vault's disk may be case-insensitive, where the rename would find its own file.
		if (to.toLowerCase() === own) {
			bases[id] = { ...base, name: project.name, relPath: note.relPath };
			continue;
		}
		taken.add(to.toLowerCase());
		plan.renames.push({ projectId: id, name: project.name, from: note.relPath, to });
	}

	for (const [id, base] of Object.entries(bases)) {
		if (base.detached || input.treeIds.has(id)) continue;
		const project = byId.get(id);
		const reason = project?.isDeleted
			? 'was deleted in Todoist'
			: project && isLiveOutsideTree(id, input.projects, input.treeIds)
				? "moved to a project outside the vault's tree"
				: null;
		if (reason === null) continue;
		bases[id] = { ...base, detached: true };
		plan.log.push({
			kind: 'detach',
			anchor: null,
			message: `Project ${id} ${reason}; its note ${base.relPath} and its tasks are detached and kept`,
		});
	}

	// A note a base points at is a project already, even while the index has not seen its new `todoist_project` yet.
	const known = new Set(Object.values(bases).filter((b) => !b.detached).map((b) => b.relPath));
	const candidates = new Set(
		input.notes
			.filter(
				(n) => n.projectId === null && !known.has(n.relPath) && parentOf(n.relPath) === input.folder && isInSyncScope(n.relPath, input.templatesFolder),
			)
			.map((n) => n.relPath),
	);
	plan.state.refused = input.state.refused.filter((p) => candidates.has(p));
	for (const pending of input.state.pending) {
		if (!candidates.has(pending.relPath)) continue;
		plan.state.pending.push(pending);
		if (input.allowAdds) plan.resends.push(pending);
	}
	if (input.allowAdds) {
		const busy = new Set([...plan.state.refused, ...plan.state.pending.map((p) => p.relPath)]);
		for (const relPath of candidates) {
			if (busy.has(relPath)) continue;
			plan.adds.push({ relPath, uuid: input.newUuid(), tempId: input.newTempId(), args: { name: noteBaseName(relPath), parentId: input.rootId } });
		}
	}
	return plan;
}

/** The kv row of a project state. */
export function projectStateEntry(state: ProjectState): TodoistKvEntry {
	return { key: PROJECT_STATE_KEY, value: JSON.stringify(state) };
}
