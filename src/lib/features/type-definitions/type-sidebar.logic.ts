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
		const parsed = typeof rawOrder === 'number' ? rawOrder : Number(rawOrder);
		const order = Number.isFinite(parsed) ? parsed : Infinity;
		const note: TypeSidebarNote = { path: entry.path, title: entry.title, order };
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
		notes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
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
