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
}

/** Filter mode for the type sidebar. */
export type SidebarFilter = 'all' | 'inbox' | 'archived' | 'favorites';

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
		const rawOrder = entry.frontmatter['_order'];
		const parsedOrder = typeof rawOrder === 'number' ? rawOrder : Number(rawOrder);
		const order = Number.isFinite(parsedOrder) ? parsedOrder : Infinity;
		const rawFavIdx = entry.frontmatter['_favorite_index'];
		const parsedFavIdx = typeof rawFavIdx === 'number' ? rawFavIdx : Number(rawFavIdx);
		const favoriteIndex = Number.isFinite(parsedFavIdx) ? parsedFavIdx : Infinity;
		const note: TypeSidebarNote = {
			path: entry.path, title: entry.title, order, favoriteIndex,
			favorite: entry.favorite, modifiedAt: entry.modifiedAt, createdAt: entry.createdAt,
		};
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
