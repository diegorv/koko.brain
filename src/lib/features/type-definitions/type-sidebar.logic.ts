import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { TypeMetadata } from './type-definitions.logic';
import { getTypeMetadataFallback } from './type-definitions.logic';

/** A section in the type-grouped sidebar. */
export interface TypeSection {
	/** Type metadata (icon, color, order, label). */
	metadata: TypeMetadata;
	/** Path to the type definition note (if it exists). */
	definitionPath: string | null;
	/** Notes of this type, sorted. */
	notes: TypeSidebarNote[];
}

/** A note entry in the type sidebar. */
export interface TypeSidebarNote {
	path: string;
	title: string;
	order: number;
	favoriteIndex: number;
	favorite: boolean;
	modifiedAt: number;
	createdAt: number;
	frontmatter: Record<string, import('$lib/types/vault-v2.types').FrontmatterValue>;
}

/** Filter mode for the type sidebar. */
export type SidebarFilter = 'all' | 'inbox' | 'archived' | 'favorites';

/** Identifiers for the top nav items in the type sidebar. */
export type NavItemId = 'inbox' | 'all' | 'archive' | 'favorites';

/** What is currently selected in the type sidebar. */
export type TypeSidebarSelection =
	| { kind: 'type'; name: string }
	| { kind: 'nav'; id: NavItemId }
	| { kind: 'untyped' };

/** Counts for each top nav item. */
export interface NavItemCounts {
	inbox: number;
	all: number;
	archive: number;
	favorites: number;
}

/** Computes counts for each top nav item (cross-type). */
export function countNavItems(entries: NoteEntryV2[]): NavItemCounts {
	let inbox = 0;
	let all = 0;
	let archive = 0;
	let favorites = 0;
	for (const e of entries) {
		if (e.isA === 'Type') continue;
		if (e.archived) {
			archive++;
		} else {
			all++;
			if (!e.organized) inbox++;
		}
		if (e.favorite && !e.archived) favorites++;
	}
	return { inbox, all, archive, favorites };
}

/** Sub-filter for tabs in the middle panel. */
export type NoteListSubFilter = 'open' | 'archived' | 'favorites';

/** Whether the Open/Archived bottom tabs should be shown for a given selection. */
export function shouldShowSubFilter(selection: TypeSidebarSelection): boolean {
	if (selection.kind === 'type' || selection.kind === 'untyped') return true;
	if (selection.kind === 'nav') return selection.id === 'all';
	return false;
}

/** Counts notes per sub-filter for a selection. */
export function countSubFilters(
	entries: NoteEntryV2[],
	selection: TypeSidebarSelection,
): { open: number; archived: number; favorites: number } {
	let open = 0;
	let archived = 0;
	let favorites = 0;
	for (const e of entries) {
		if (!matchesSelection(e, selection)) continue;
		if (e.archived) archived++;
		else {
			open++;
			if (e.favorite) favorites++;
		}
	}
	return { open, archived, favorites };
}

function matchesSelection(entry: NoteEntryV2, selection: TypeSidebarSelection): boolean {
	switch (selection.kind) {
		case 'type':
			return entry.isA === selection.name;
		case 'untyped':
			return !entry.isA && entry.isA !== 'Type';
		case 'nav':
			return entry.isA !== 'Type';
	}
}

/** Returns notes matching the current sidebar selection, sorted by the type's sort setting. */
export function getNotesForSelection(
	entries: NoteEntryV2[],
	selection: TypeSidebarSelection,
	typeMetadataMap: Map<string, TypeMetadata>,
	subFilter?: NoteListSubFilter,
): TypeSidebarNote[] {
	let filtered: NoteEntryV2[];
	let sort = 'title';

	switch (selection.kind) {
		case 'type': {
			filtered = entries.filter((e) => e.isA === selection.name && matchesSubFilter(e, subFilter));
			const meta = getTypeMetadataFallback(selection.name, typeMetadataMap);
			sort = meta.sort;
			break;
		}
		case 'untyped':
			filtered = entries.filter((e) => !e.isA && e.isA !== 'Type' && matchesSubFilter(e, subFilter));
			break;
		case 'nav':
			filtered = filterByNavItem(entries, selection.id, subFilter);
			sort = 'modified';
			break;
	}

	const notes = filtered.map(toSidebarNote);
	sortNotes(notes, sort, 'all');
	return notes;
}

function toSidebarNote(entry: NoteEntryV2): TypeSidebarNote {
	const rawOrder = entry.frontmatter['_order'];
	const parsedOrder = typeof rawOrder === 'number' ? rawOrder : Number(rawOrder);
	const order = Number.isFinite(parsedOrder) ? parsedOrder : Infinity;
	const rawFavIdx = entry.frontmatter['_favorite_index'];
	const parsedFavIdx = typeof rawFavIdx === 'number' ? rawFavIdx : Number(rawFavIdx);
	const favoriteIndex = Number.isFinite(parsedFavIdx) ? parsedFavIdx : Infinity;
	return {
		path: entry.path,
		title: entry.title,
		order,
		favoriteIndex,
		favorite: entry.favorite,
		modifiedAt: entry.modifiedAt,
		createdAt: entry.createdAt,
		frontmatter: entry.frontmatter,
	};
}

function matchesSubFilter(entry: NoteEntryV2, subFilter?: NoteListSubFilter): boolean {
	switch (subFilter) {
		case 'archived': return entry.archived;
		case 'favorites': return entry.favorite && !entry.archived;
		default: return !entry.archived;
	}
}

/** Filters entries by nav item selection. */
function filterByNavItem(entries: NoteEntryV2[], id: NavItemId, subFilter?: NoteListSubFilter): NoteEntryV2[] {
	switch (id) {
		case 'all':
			return entries.filter((e) => e.isA !== 'Type' && matchesSubFilter(e, subFilter));
		case 'inbox':
			return entries.filter((e) => e.isA !== 'Type' && !e.organized && !e.archived);
		case 'archive':
			return entries.filter((e) => e.isA !== 'Type' && e.archived);
		case 'favorites':
			return entries.filter((e) => e.isA !== 'Type' && e.favorite && !e.archived);
	}
}

/** Builds type-grouped sections from vault entries. */
export function buildTypeSections(
	entries: NoteEntryV2[],
	typeMetadataMap: Map<string, TypeMetadata>,
	filter: SidebarFilter,
): { sections: TypeSection[]; untyped: TypeSidebarNote[] } {
	const filtered = applyFilter(entries, filter);
	const typeGroups = new Map<string, TypeSidebarNote[]>();
	const typeDefPaths = new Map<string, string>();
	const untyped: TypeSidebarNote[] = [];

	for (const entry of entries) {
		if (entry.isA === 'Type') typeDefPaths.set(entry.title, entry.path);
	}

	for (const entry of filtered) {
		if (entry.isA === 'Type') continue;
		const note = toSidebarNote(entry);
		if (entry.isA) {
			const group = typeGroups.get(entry.isA);
			if (group) {
				group.push(note);
			} else {
				typeGroups.set(entry.isA, [note]);
			}
		} else {
			untyped.push(note);
		}
	}

	const sections: TypeSection[] = [];
	const seen = new Set<string>();
	for (const [typeName, notes] of typeGroups) {
		const metadata = getTypeMetadataFallback(typeName, typeMetadataMap);
		if (!metadata.visible) continue;
		sortNotes(notes, metadata.sort, filter);
		sections.push({ metadata, definitionPath: typeDefPaths.get(typeName) ?? null, notes });
		seen.add(typeName);
	}

	for (const [typeName, metadata] of typeMetadataMap) {
		if (seen.has(typeName) || !metadata.visible) continue;
		sections.push({ metadata, definitionPath: typeDefPaths.get(typeName) ?? null, notes: [] });
	}

	sections.sort((a, b) => a.metadata.order - b.metadata.order);
	untyped.sort((a, b) => a.title.localeCompare(b.title));

	return { sections, untyped };
}

/** Sorts notes in place by the type's _sort setting, with _order as primary override. */
function sortNotes(notes: TypeSidebarNote[], sort: string, filter: SidebarFilter): void {
	if (filter === 'favorites') {
		notes.sort((a, b) => a.favoriteIndex - b.favoriteIndex || a.title.localeCompare(b.title));
		return;
	}
	const secondary = buildSecondaryComparator(sort);
	notes.sort((a, b) => a.order - b.order || secondary(a, b));
}

function buildSecondaryComparator(sort: string): (a: TypeSidebarNote, b: TypeSidebarNote) => number {
	switch (sort) {
		case 'modified':
			return (a, b) => b.modifiedAt - a.modifiedAt || a.title.localeCompare(b.title);
		case 'created':
			return (a, b) => b.createdAt - a.createdAt || a.title.localeCompare(b.title);
		case 'modified-asc':
			return (a, b) => a.modifiedAt - b.modifiedAt || a.title.localeCompare(b.title);
		case 'created-asc':
			return (a, b) => a.createdAt - b.createdAt || a.title.localeCompare(b.title);
		case 'title':
		default:
			return (a, b) => a.title.localeCompare(b.title);
	}
}

/** Applies the sidebar filter to entries. */
function applyFilter(entries: NoteEntryV2[], filter: SidebarFilter): NoteEntryV2[] {
	switch (filter) {
		case 'all':
			return entries.filter((e) => !e.archived);
		case 'inbox':
			return entries.filter((e) => !e.organized && !e.archived);
		case 'archived':
			return entries.filter((e) => e.archived);
		case 'favorites':
			return entries.filter((e) => e.favorite && !e.archived);
	}
}

/** Returns the inbox count (not organized, not archived). */
export function countInbox(entries: NoteEntryV2[]): number {
	let count = 0;
	for (const e of entries) {
		if (!e.organized && !e.archived && e.isA !== 'Type') count++;
	}
	return count;
}
