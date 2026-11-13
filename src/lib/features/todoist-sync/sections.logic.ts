/**
 * Sections and task moves, as pure planning: a Todoist section is a `##`
 * heading of its project note (`todoist_section_link` ties the two), and a
 * task's place (its project and section) is the note its line sits in and
 * the `##` heading above it, synced both ways. Section order is not synced.
 * Design: `.scratch/todoist-bisync/research/design.md` Sections, rules 3, 9
 * and 10.
 */

import type { TaskLineInsert, TodoistSectionLink, TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import { readAnchor } from './anchor.logic.js';
import { isDetached } from './detach.logic.js';
import type { LocalBase, PullItem, RemoteBase, ScannedLine, TaskPlace } from './pull.logic.js';
import { codeFence, headingIndexes } from './task-line-edits.logic.js';
import { taskLineText } from './task-line.logic.js';

/** The scope tag: a line carrying it may sit in any note (design Scope). */
const SCOPE_TAG = 'todoist';

/** A section as the pulls report it (SDK `Section`, the fields read). */
export interface PullSection {
	id: string;
	projectId: string;
	name: string;
	/** Position among the project's sections; only orders the headings appended in one cycle. */
	sectionOrder: number;
	isArchived: boolean;
	isDeleted: boolean;
}

/** The `##` headings of a project note and where its task lines sit. */
export interface NoteOutline {
	/** Every `##` heading text, in order; a text may repeat. */
	headings: string[];
	/** `##` heading texts with at least one task line under them. */
	withTasks: Set<string>;
	/** 1-based line number of each task line -> the `##` heading above it; null above the first one or after a `#` heading. */
	lineHeadings: Map<number, string | null>;
	/** Anchor -> the heading above its first line (as `lineHeadings`). */
	anchorHeadings: Map<string, string | null>;
	/** Anchor -> its first line, whole. */
	anchorLines: Map<string, string>;
}

/**
 * Reads a note's outline, skipping frontmatter and code fences as the
 * task-line writer does. A `###` or deeper heading does not end a section;
 * a `#` heading does.
 */
export function noteOutline(content: string): NoteOutline {
	const lines = content.split('\n');
	const headings = new Map(headingIndexes(lines).map(([i, level, text]) => [i, { level, text }]));
	const outline: NoteOutline = { headings: [], withTasks: new Set(), lineHeadings: new Map(), anchorHeadings: new Map(), anchorLines: new Map() };
	let current: string | null = null;
	let fence: string | null = null;
	lines.forEach((line, i) => {
		const heading = headings.get(i);
		if (heading) {
			if (heading.level === 1) current = null;
			if (heading.level === 2) {
				current = heading.text;
				outline.headings.push(heading.text);
			}
			return;
		}
		const marker = codeFence(line);
		if (marker !== null) {
			if (fence === null) fence = marker;
			else if (fence === marker) fence = null;
			return;
		}
		if (fence !== null) return;
		const text = taskLineText(line);
		if (text === null) return;
		if (current !== null) outline.withTasks.add(current);
		outline.lineHeadings.set(i + 1, current);
		const anchor = readAnchor(text);
		if (anchor !== null && !outline.anchorLines.has(anchor)) {
			outline.anchorHeadings.set(anchor, current);
			outline.anchorLines.set(anchor, line);
		}
	});
	return outline;
}

/** A project note the sections sync reads: the one note of a tree project, not frozen. */
export interface SectionNote {
	projectId: string;
	relPath: string;
	outline: NoteOutline;
}

/** Everything {@link planSections} reads. */
export interface SectionInput {
	/** Every section of the full pull and the incremental one, newest row per id. */
	sections: PullSection[];
	/** The stored section links. */
	links: TodoistSectionLink[];
	/** The project notes of the tree, including the ones created this cycle (empty outline). */
	notes: SectionNote[];
	/** False in rebuild mode: headings are only paired, never written, and no section is created (design rule 1). */
	allowWrites: boolean;
	/** A fresh command uuid. */
	newUuid: () => string;
	/** A fresh command temp id. */
	newTempId: () => string;
}

/** A heading to append at the end of a note for a new Todoist section. */
export interface PlannedHeadingAppend {
	relPath: string;
	/** The link to store once the heading is written; `heading` is its text. */
	link: TodoistSectionLink;
}

/** A heading to rename after its section was renamed in Todoist. */
export interface PlannedHeadingRename {
	relPath: string;
	/** The heading text now. */
	from: string;
	/** The link to store once the heading is renamed; `heading` is the new text. */
	link: TodoistSectionLink;
}

/** A brain heading to create as a Todoist section. */
export interface PlannedSectionAdd {
	projectId: string;
	relPath: string;
	heading: string;
	uuid: string;
	tempId: string;
	/**
	 * For a brain rename (a section of the project whose heading is gone),
	 * the row that says the old links stay. Written only once Todoist creates
	 * the section: a refused add is planned again every cycle.
	 */
	renamed: TodoistSyncLogInput | null;
}

/** What {@link planSections} decided. */
export interface SectionPlan {
	/** Links of sections paired with a heading of the same text (or whose stored text follows a brain rename to the Todoist name); stored with the cycle's state. */
	paired: TodoistSectionLink[];
	appends: PlannedHeadingAppend[];
	renames: PlannedHeadingRename[];
	/** `section_add` commands, sent after the writes; a lost response pairs by name next cycle. */
	adds: PlannedSectionAdd[];
	/** Project id -> heading text -> live section, for the headings as the scan read them (text once in the note, one live link naming it). */
	scannedSections: Map<string, Map<string, string>>;
	/** Live section id -> its heading text once this cycle's headings are written. */
	targetHeadings: Map<string, string>;
}

/** A section name as a heading text: trimmed; null when empty or holding a line break. */
function headingText(name: string): string | null {
	const text = name.trim();
	return text === '' || /[\r\n]/u.test(text) ? null : text;
}

/**
 * Plans the sections of one cycle (design Sections). Per live (not deleted,
 * not archived) Todoist section of a project with a note:
 * - no link: paired with the note's one heading of that text when no other
 *   live link names it, else (normal mode) a heading `## <name>` is
 *   appended at the end of the note;
 * - renamed in Todoist: the note's heading is renamed when it is there once
 *   and the new text is not; a note that already has the new text instead
 *   of the old one just moves the stored text.
 * Then per `##` heading of a note that appears once, has a text and a task
 * line under it, and that no link of the project names, a `section_add`
 * (normal mode).
 * A brain rename is such a heading: the old link stays, and the add
 * carries the row that logs it.
 */
export function planSections(input: SectionInput): SectionPlan {
	const plan: SectionPlan = { paired: [], appends: [], renames: [], adds: [], scannedSections: new Map(), targetHeadings: new Map() };
	const live = input.sections
		.filter((s) => !s.isDeleted && !s.isArchived)
		.sort((a, b) => a.sectionOrder - b.sectionOrder || a.id.localeCompare(b.id));
	const liveIds = new Set(live.map((s) => s.id));
	const notes = new Map(input.notes.map((n) => [n.projectId, n]));
	const count = (note: SectionNote, text: string) => note.outline.headings.filter((h) => h === text).length;
	// Section id -> link with the heading text the note has now.
	const current = new Map(input.links.map((l) => [l.todoistSectionId, l]));
	const named = (projectId: string, text: string, liveOnly: boolean) =>
		[...current.values()].filter((l) => l.projectId === projectId && l.heading === text && (!liveOnly || liveIds.has(l.todoistSectionId)));

	for (const section of live) {
		const note = notes.get(section.projectId);
		const text = headingText(section.name);
		if (!note || text === null || current.has(section.id)) continue;
		if (count(note, text) === 1 && named(section.projectId, text, true).length === 0) {
			const link = { todoistSectionId: section.id, projectId: section.projectId, heading: text };
			current.set(section.id, link);
			plan.paired.push(link);
		}
	}

	const appended = new Set<string>();
	for (const section of live) {
		const note = notes.get(section.projectId);
		const text = headingText(section.name);
		if (!note || text === null) continue;
		const link = current.get(section.id);
		if (!link) {
			const key = `${note.relPath}\n${text}`;
			if (!input.allowWrites || count(note, text) > 0 || appended.has(key)) continue;
			appended.add(key);
			plan.appends.push({ relPath: note.relPath, link: { todoistSectionId: section.id, projectId: section.projectId, heading: text } });
			plan.targetHeadings.set(section.id, text);
			continue;
		}
		if (link.projectId !== section.projectId) continue;
		if (link.heading !== text) {
			if (count(note, link.heading) === 1 && count(note, text) === 0) {
				if (!input.allowWrites) continue;
				plan.renames.push({ relPath: note.relPath, from: link.heading, link: { ...link, heading: text } });
				plan.targetHeadings.set(section.id, text);
				continue;
			}
			if (count(note, text) === 1 && count(note, link.heading) === 0) {
				const moved = { ...link, heading: text };
				current.set(section.id, moved);
				plan.paired.push(moved);
			}
		}
		const now = current.get(section.id)!;
		if (count(note, now.heading) === 1 && named(section.projectId, now.heading, true).length === 1) plan.targetHeadings.set(section.id, now.heading);
	}

	for (const note of input.notes) {
		const byHeading = new Map<string, string>();
		for (const text of new Set(note.outline.headings)) {
			if (count(note, text) !== 1) continue;
			const links = named(note.projectId, text, true);
			if (links.length === 1) {
				byHeading.set(text, links[0].todoistSectionId);
				continue;
			}
			// A heading with no text has no section name (Todoist refuses an empty one): its lines stay where they are.
			if (!input.allowWrites || text === '' || !note.outline.withTasks.has(text) || named(note.projectId, text, false).length > 0) continue;
			const gone = [...current.values()].filter((l) => l.projectId === note.projectId && liveIds.has(l.todoistSectionId) && count(note, l.heading) === 0);
			const renamed: TodoistSyncLogInput | null =
				gone.length > 0
					? {
							kind: 'section-renamed',
							anchor: null,
							message: `${note.relPath}: the heading ${JSON.stringify(text)} has no Todoist section, so it is created as a new one; the sections whose heading is gone keep their link: ${gone.map((l) => JSON.stringify(l.heading)).join(', ')}`,
						}
					: null;
			plan.adds.push({ projectId: note.projectId, relPath: note.relPath, heading: text, uuid: input.newUuid(), tempId: input.newTempId(), renamed });
		}
		plan.scannedSections.set(note.projectId, byHeading);
	}
	return plan;
}

/** Where an anchored line's note puts it: a project note (with its outline), or another note in sync scope. */
export type LineNote = { kind: 'project'; projectId: string; outline: NoteOutline } | { kind: 'other' };

/**
 * The anchors whose one line sits in a note that is no project note and
 * whose line has no `#todoist` (design Scope): such a line is out of sync
 * scope and detaches; it is never moved in Todoist. A note missing from
 * `notes` (a project note that does not sync this cycle, a note about to
 * become a project) is not judged.
 */
export function outOfScopeAnchors(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>, notes: ReadonlyMap<string, LineNote>): Set<string> {
	const out = new Set<string>();
	for (const link of links) {
		if (link.frozen || isDetached(link) || link.todoistId === null) continue;
		const lines = occurrences.get(link.anchor) ?? [];
		if (lines.length !== 1 || lines[0].fields === null) continue;
		if (notes.get(lines[0].relPath)?.kind !== 'other') continue;
		if (!lines[0].fields.tags.some((t) => t.toLowerCase() === SCOPE_TAG)) out.add(link.anchor);
	}
	return out;
}

/** Everything {@link planMoves} reads. */
export interface MoveInput {
	/** The attached links, with this cycle's other updates. */
	links: TodoistTaskLink[];
	/** Anchors with another line change or push this cycle: their move waits for the next one. */
	skip: ReadonlySet<string>;
	/** Anchor -> every in-scope line carrying it. */
	occurrences: Map<string, ScannedLine[]>;
	/** Todoist items seen this cycle by id. */
	items: Map<string, PullItem>;
	/** Project ids of the vault's tree, frozen projects left out. */
	treeIds: ReadonlySet<string>;
	/** Note path -> what it is to a line; a note not in it is skipped. */
	notes: ReadonlyMap<string, LineNote>;
	/** {@link SectionPlan.scannedSections}. */
	scannedSections: ReadonlyMap<string, ReadonlyMap<string, string>>;
	/** {@link SectionPlan.targetHeadings}. */
	targetHeadings: ReadonlyMap<string, string>;
	/** Project id -> its note, the ones created this cycle included. */
	projectNotes: ReadonlyMap<string, string>;
	/** A fresh command uuid. */
	newUuid: () => string;
}

/** A line to move to where Todoist has its task. */
export interface PlannedLineMove {
	anchor: string;
	/** The note the line is in. */
	from: string;
	/** The note it goes to; equal to `from` for a move within the note. */
	to: string;
	/** The `##` heading it goes under; null for above the sections. */
	heading: string | null;
	/** The whole line, as read with the outline. */
	line: string;
	/** The link to store once the line is in its new place. */
	link: TodoistTaskLink;
}

/** An `item_move` for a line the brain moved. */
export interface PlannedMove {
	anchor: string;
	todoistId: string;
	uuid: string;
	/** One of `sectionId` (moves the task into it and its project) or `projectId` (to the project root). */
	args: { id: string; sectionId: string } | { id: string; projectId: string };
	/** Stored on `ok`: both bases at the line's place. */
	okLink: TodoistTaskLink;
	/** Stored on a terminal refusal: the local base at the line's place, so it is not retried. */
	refusedLink: TodoistTaskLink;
}

/** What {@link planMoves} decided. */
export interface MovePlan {
	/** Links whose bases moved without a write or a push. */
	links: TodoistTaskLink[];
	lineMoves: PlannedLineMove[];
	pushes: PlannedMove[];
	log: TodoistSyncLogInput[];
}

function samePlace(a: TaskPlace | undefined, b: TaskPlace): boolean {
	return a !== undefined && a.projectId === b.projectId && a.sectionId === b.sectionId;
}

/** The link with its local place, remote place and note path set. */
function placed(link: TodoistTaskLink, local: TaskPlace, remote: TaskPlace, relPath: string): TodoistTaskLink {
	const localBase: LocalBase = { ...(JSON.parse(link.localBase!) as LocalBase), location: { ...local } };
	const remoteBase: RemoteBase = { ...(JSON.parse(link.remoteBase!) as RemoteBase), projectId: remote.projectId, sectionId: remote.sectionId };
	return { ...link, noteRelPath: relPath, localBase: JSON.stringify(localBase), remoteBase: JSON.stringify(remoteBase) };
}

/**
 * Plans the moves of one cycle. Per attached link with one top-level line,
 * both bases, and an open, top-level task in the tree:
 * - in a note that is no project note (a `#todoist` line): the line stays
 *   where it is, whatever Todoist does; the bases follow Todoist.
 * - in a project note, under no `##` heading or under one linked to a live
 *   section (else skipped, a link with no place yet taking Todoist's place
 *   as its base): that is the line's place. When it equals
 *   Todoist's, only the bases move. When Todoist moved the task since
 *   `remote_base`, or the line has no place in `local_base` yet, the line
 *   moves to Todoist's place (Todoist wins; a brain move too is logged),
 *   once the target note and heading are known. When only the brain moved
 *   it, an `item_move` goes out.
 */
export function planMoves(input: MoveInput): MovePlan {
	const plan: MovePlan = { links: [], lineMoves: [], pushes: [], log: [] };
	for (const link of input.links) {
		if (link.frozen || isDetached(link) || link.todoistId === null || link.localBase === null || link.remoteBase === null) continue;
		if (input.skip.has(link.anchor)) continue;
		const lines = input.occurrences.get(link.anchor) ?? [];
		if (lines.length !== 1 || lines[0].indent > 0) continue;
		const line = lines[0];
		const item = input.items.get(link.todoistId);
		if (!item || item.checked || item.isDeleted || item.parentId !== null || !input.treeIds.has(item.projectId)) continue;
		const note = input.notes.get(line.relPath);
		if (!note) continue;
		const local = JSON.parse(link.localBase) as LocalBase;
		const remote = JSON.parse(link.remoteBase) as RemoteBase;
		const there: TaskPlace = { projectId: item.projectId, sectionId: item.sectionId };
		const before: TaskPlace = { projectId: remote.projectId, sectionId: remote.sectionId ?? null };
		const remoteMoved = !samePlace(before, there);

		if (note.kind === 'other') {
			if (!samePlace(local.location, there) || remoteMoved) plan.links.push(placed(link, there, there, line.relPath));
			continue;
		}
		const heading = note.outline.anchorHeadings.get(link.anchor);
		const raw = note.outline.anchorLines.get(link.anchor);
		if (heading === undefined || raw === undefined) continue;
		const sectionId = heading === null ? null : input.scannedSections.get(note.projectId)?.get(heading);
		if (sectionId === undefined) {
			// A link with no place yet (made before places were stored, or paired in a rebuild) under a heading with
			// no section: Todoist's place becomes the base, so once the heading is linked the line pushes an
			// `item_move` instead of being pulled back to Todoist's place.
			if (local.location === undefined && !remoteMoved) plan.links.push(placed(link, there, there, line.relPath));
			continue;
		}
		const here: TaskPlace = { projectId: note.projectId, sectionId };

		if (samePlace(here, there)) {
			if (!samePlace(local.location, here) || remoteMoved) plan.links.push(placed(link, here, there, line.relPath));
			continue;
		}
		if (local.location === undefined || remoteMoved) {
			const to = input.projectNotes.get(there.projectId);
			const target = there.sectionId === null ? null : input.targetHeadings.get(there.sectionId);
			if (to === undefined || target === undefined) continue;
			if (local.location !== undefined && !samePlace(local.location, here)) {
				plan.log.push({
					kind: 'conflict',
					anchor: link.anchor,
					message: `The task moved on both sides; Todoist wins. Brain place: ${line.relPath}${heading === null ? '' : ` under ${JSON.stringify(heading)}`}`,
				});
			}
			plan.lineMoves.push({ anchor: link.anchor, from: line.relPath, to, heading: target, line: raw, link: placed(link, there, there, to) });
			continue;
		}
		if (samePlace(local.location, here)) continue;
		plan.pushes.push({
			anchor: link.anchor,
			todoistId: link.todoistId,
			uuid: input.newUuid(),
			args: here.sectionId !== null ? { id: link.todoistId, sectionId: here.sectionId } : { id: link.todoistId, projectId: here.projectId },
			okLink: placed(link, here, here, line.relPath),
			refusedLink: placed(link, here, before, line.relPath),
		});
	}
	return plan;
}

/**
 * Where a pulled task's line goes in its note: under the heading of its
 * section when that is known this cycle, else above the sections. The
 * link's `local_base` gets the place the line takes; a line put above the
 * sections only because its section's heading is not known gets none, so a
 * later cycle moves it once the heading is there.
 */
export function placeInsert(
	line: string,
	link: TodoistTaskLink,
	targetHeadings: ReadonlyMap<string, string>,
): { insert: TaskLineInsert; link: TodoistTaskLink } {
	const remote = JSON.parse(link.remoteBase!) as RemoteBase;
	const sectionId = remote.sectionId ?? null;
	const heading = sectionId === null ? undefined : targetHeadings.get(sectionId);
	const insert: TaskLineInsert = heading === undefined ? { afterHeading: null, beforeSections: true, lines: [line] } : { afterHeading: heading, lines: [line] };
	if (sectionId !== null && heading === undefined) return { insert, link };
	const local = { ...(JSON.parse(link.localBase!) as LocalBase), location: { projectId: remote.projectId, sectionId } };
	return { insert, link: { ...link, localBase: JSON.stringify(local) } };
}
