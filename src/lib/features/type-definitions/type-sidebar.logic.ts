import dayjs from 'dayjs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import type { TypeMetadata } from './type-definitions.logic';
import { getTypeMetadataFallback } from './type-definitions.logic';
import { isViewFile } from '$lib/core/filesystem/fs.logic';

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
	| { kind: 'untyped' }
	| { kind: 'view'; path: string };

/** Counts for each top nav item. */
export interface NavItemCounts {
	inbox: number;
	all: number;
	archive: number;
	favorites: number;
}

/**
 * Returns true when the given absolute note path lives inside the configured
 * vault-relative system folder. Empty `systemFolder` or missing `vaultPath`
 * disables exclusion (returns false for every input).
 */
export function isInsideSystemFolder(
	notePath: string,
	vaultPath: string | null | undefined,
	systemFolder: string,
): boolean {
	if (!vaultPath) return false;
	const folder = systemFolder.trim().replace(/^\/+|\/+$/g, '');
	if (!folder) return false;
	const base = vaultPath.replace(/\/+$/, '');
	const prefix = `${base}/${folder}/`;
	return notePath.startsWith(prefix);
}

/**
 * Returns a new array containing only entries whose `path` is outside the
 * configured system folder. Use this as an upstream filter before any sidebar
 * logic call (counts, lists, sections).
 */
export function excludeSystemFolder(
	entries: NoteEntryV2[],
	vaultPath: string | null | undefined,
	systemFolder: string,
): NoteEntryV2[] {
	const folder = systemFolder.trim().replace(/^\/+|\/+$/g, '');
	if (!vaultPath || !folder) return entries;
	const base = vaultPath.replace(/\/+$/, '');
	const prefix = `${base}/${folder}/`;
	return entries.filter((e) => !e.path.startsWith(prefix));
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
	if (selection.kind === 'view') return true;
	return false;
}

/**
 * Counts sub-filter buckets for a pre-resolved set of paths (typically the result
 * of a .view collection query). Distinct from countSubFilters, which buckets by
 * matchesSelection — that path returns false for view selections because views
 * are not derivable from a single entry.
 */
export function countSubFiltersForPaths(
	entries: NoteEntryV2[],
	matchingPaths: ReadonlySet<string>,
): { open: number; archived: number; favorites: number } {
	let open = 0;
	let archived = 0;
	let favorites = 0;
	for (const e of entries) {
		if (!matchingPaths.has(e.path)) continue;
		if (e.archived) archived++;
		else {
			open++;
			if (e.favorite) favorites++;
		}
	}
	return { open, archived, favorites };
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
			return !entry.isA;
		case 'nav':
			return entry.isA !== 'Type';
		case 'view':
			return false;
	}
}

/**
 * Returns notes matching the current sidebar selection. Type and Untyped
 * sections always sort most-recently-modified first (the Favorites tab keeps
 * the type's configured `_sort`); nav items sort by modified. `_order` pins
 * always float to the top.
 */
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
			// The type note list always shows the most recently modified notes
			// first, regardless of the type's `_sort`. `_order` pins still float
			// to the top (handled in sortNotes). The Favorites tab keeps the
			// type's configured ordering.
			sort = subFilter === 'favorites'
				? getTypeMetadataFallback(selection.name, typeMetadataMap).sort
				: 'modified';
			break;
		}
		case 'untyped':
			filtered = entries.filter((e) => !e.isA && matchesSubFilter(e, subFilter));
			// Same rule as type sections: most-recently-modified first, except
			// the Favorites tab (which keeps the default title ordering).
			if (subFilter !== 'favorites') sort = 'modified';
			break;
		case 'nav':
			filtered = filterByNavItem(entries, selection.id, subFilter);
			sort = 'modified';
			break;
		case 'view':
			filtered = [];
			break;
	}

	const notes = filtered.map(toSidebarNote);
	sortNotes(notes, sort, 'all');
	return notes;
}

/** Converts entries matching a set of paths into sidebar notes, sorted by modified (newest first). */
export function getNotesForViewPaths(
	entries: NoteEntryV2[],
	matchingPaths: ReadonlySet<string>,
	sort = 'modified',
	subFilter?: NoteListSubFilter,
): TypeSidebarNote[] {
	const filtered = entries.filter((e) => matchingPaths.has(e.path) && matchesSubFilter(e, subFilter));
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
	const untyped: TypeSidebarNote[] = [];

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
		sections.push({ metadata, definitionPath: metadata.path, notes });
		seen.add(typeName);
	}

	for (const [typeName, metadata] of typeMetadataMap) {
		if (seen.has(typeName) || !metadata.visible) continue;
		sections.push({ metadata, definitionPath: metadata.path, notes: [] });
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

/** Formats an epoch-seconds timestamp as a short date. Omits year if same as current. */
export function formatNoteDate(epochSeconds: number): string {
	if (epochSeconds === 0) return '';
	const d = dayjs(epochSeconds * 1000);
	const now = dayjs();
	if (d.year() === now.year()) return d.format('MMM D');
	return d.format('MMM D, YYYY');
}

/** Formats an epoch-seconds timestamp as relative time (e.g. "9m ago"). */
export function formatRelativeTime(epochSeconds: number, nowMs?: number): string {
	if (epochSeconds === 0) return '';
	const diffMs = (nowMs ?? Date.now()) - epochSeconds * 1000;
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return formatNoteDate(epochSeconds);
}

/** Formats modified + created timestamps as a single display string. */
export function formatDatePair(modifiedAt: number, createdAt: number): string {
	if (!modifiedAt && !createdAt) return '';
	const mod = formatRelativeTime(modifiedAt);
	const cre = formatNoteDate(createdAt);
	if (mod && cre) return `${mod} · created ${cre}`;
	if (mod) return mod;
	return `created ${cre}`;
}

/** Formats a frontmatter value for display. */
export function formatPropertyValue(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) return value.map(formatPropertyValue).filter(Boolean).join(', ');
	return '';
}

export interface PropertyPill {
	text: string;
	wikilink?: string;
}

/** Splits a property value into pills, extracting wikilinks as separate entries. */
export function splitPropertyIntoPills(value: unknown): PropertyPill[] {
	if (value == null) return [];
	if (Array.isArray(value)) return value.flatMap(splitPropertyIntoPills);
	const str = formatPropertyValue(value);
	if (!str) return [];
	const re = /\[\[([^\]]+)\]\]/g;
	const pills: PropertyPill[] = [];
	let last = 0;
	for (const m of str.matchAll(re)) {
		const before = str.slice(last, m.index).trim();
		if (before) pills.push({ text: before });
		const raw = m[1];
		const display = raw.includes('|') ? raw.split('|')[1] : raw;
		const target = raw.includes('|') ? raw.split('|')[0] : raw;
		pills.push({ text: display, wikilink: target });
		last = m.index + m[0].length;
	}
	const after = str.slice(last).trim();
	if (after) pills.push({ text: after });
	if (pills.length === 0 && str) pills.push({ text: str });
	return pills;
}

/** A .view file entry for sidebar rendering. */
export interface ViewFileEntry {
	/** Absolute path to the .view file. */
	path: string;
	/** Display name (filename without .view extension). */
	name: string;
}

/** Collects .view files from the file tree, sorted alphabetically. */
export function collectViewFiles(tree: FileTreeNode[]): ViewFileEntry[] {
	const views: ViewFileEntry[] = [];
	collectViewFilesWalk(tree, views);
	views.sort((a, b) => a.name.localeCompare(b.name));
	return views;
}

function collectViewFilesWalk(nodes: FileTreeNode[], out: ViewFileEntry[]): void {
	for (const node of nodes) {
		if (node.isDirectory) {
			if (node.children) collectViewFilesWalk(node.children, out);
		} else if (isViewFile(node.name)) {
			out.push({
				path: node.path,
				name: node.name.replace(/\.view$/i, ''),
			});
		}
	}
}

/** Extracts _sidebar_label from a view entry's frontmatter. Falls back to the given name. */
export function getViewLabel(entry: NoteEntryV2 | undefined, fallbackName: string): string {
	const label = entry?.frontmatter['_sidebar_label'];
	return typeof label === 'string' && label ? label : fallbackName;
}

/** Extracts _order from a view entry's frontmatter. Defaults to 50. */
export function getViewOrder(entry: NoteEntryV2 | undefined): number {
	const order = entry?.frontmatter['_order'];
	return typeof order === 'number' ? order : 50;
}

/** Extracts _sort from a view entry's frontmatter. Defaults to 'modified'. */
export function getViewSort(entry: NoteEntryV2 | undefined): string {
	const sort = entry?.frontmatter['_sort'];
	return typeof sort === 'string' ? sort : 'modified';
}

/** Extracts _list_properties_display from a view entry's frontmatter. */
export function getViewListProperties(entry: NoteEntryV2 | undefined): string[] {
	const raw = entry?.frontmatter['_list_properties_display'];
	if (!Array.isArray(raw)) return [];
	return raw.filter((v): v is string => typeof v === 'string');
}

/** Sorts view files by _order from entries, then alphabetically. */
export function sortViewFiles(views: ViewFileEntry[], entries: NoteEntryV2[]): ViewFileEntry[] {
	return [...views].sort((a, b) => {
		const ea = entries.find((e) => e.path === a.path);
		const eb = entries.find((e) => e.path === b.path);
		const oa = getViewOrder(ea);
		const ob = getViewOrder(eb);
		if (oa !== ob) return oa - ob;
		return a.name.localeCompare(b.name);
	});
}

/** Updates _icon, _color, and _title_color in a .view YAML string. Returns the updated YAML. */
export function updateViewIconYaml(yamlString: string, icon?: string, color?: string, titleColor?: string): string {
	let raw: Record<string, unknown>;
	try {
		raw = (parseYaml(yamlString) as Record<string, unknown>) ?? {};
	} catch {
		return yamlString;
	}
	if (icon !== undefined) {
		raw._icon = icon;
	} else {
		delete raw._icon;
	}
	if (color !== undefined) {
		raw._color = color;
	} else {
		delete raw._color;
	}
	if (titleColor !== undefined) {
		raw._title_color = titleColor;
	} else {
		delete raw._title_color;
	}
	return stringifyYaml(raw);
}
