import dayjs from 'dayjs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { CollectionDefinition, CollectionFilter } from '#lib/features/collection/collection.types.js';
import { viewIndexByName } from '#lib/features/collection/yaml-parser.js';
import type { TypeMetadata } from './type-definitions.logic';
import { getTypeMetadataFallback } from './type-definitions.logic';
import { isViewFile, naturalCompare } from '#lib/core/filesystem/fs.logic.js';
import { extractViewIcon, parseIconValuePermissive } from '#lib/features/file-icons/file-icons.logic.js';

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
	favorite: boolean;
	modifiedAt: number;
	createdAt: number;
	frontmatter: Record<string, import('#lib/types/vault-v2.types.js').FrontmatterValue>;
}

/** Filter mode for the type sidebar. */
export type SidebarFilter = 'all' | 'inbox' | 'archived';

/** Identifiers for the top nav items in the type sidebar. */
export type NavItemId = 'inbox' | 'all' | 'archive' | 'favorites';

/** What is currently selected in the type sidebar. */
export type TypeSidebarSelection =
	| { kind: 'type'; name: string }
	| { kind: 'nav'; id: NavItemId }
	| { kind: 'untyped' }
	| { kind: 'view'; path: string };

/**
 * Returns a new array containing only entries whose `path` is outside the
 * configured system folder. Use this as an upstream filter before any sidebar
 * logic call (counts, lists, sections); it takes any record with a `path`, so
 * QueryJS filters property-index records with it too. A blank `systemFolder`
 * or a missing `vaultPath` disables exclusion and returns the input array
 * unchanged.
 */
export function excludeSystemFolder<T extends { path: string }>(
	entries: T[],
	vaultPath: string | null | undefined,
	systemFolder: string,
): T[] {
	const folder = systemFolder.trim().replace(/^\/+|\/+$/g, '');
	if (!vaultPath || !folder) return entries;
	const base = vaultPath.replace(/\/+$/, '');
	const prefix = `${base}/${folder}/`;
	return entries.filter((e) => !e.path.startsWith(prefix));
}

/**
 * True when an entry may be listed as a note: not a `.view` file and not a
 * type definition (`_type: Type`). A `.view` file is indexed like a note (Rust
 * counts `.view` as markdown, see `is_markdown_filename` in
 * `src-tauri/src/utils/fs.rs`, with its raw YAML as frontmatter), so a query
 * can match it, but it is a view, not a note; a type definition describes a
 * type. Every rail lens but Favorites, and QueryJS `kb.pages()`, apply it.
 */
export function isListableNote(entry: NoteEntryV2): boolean {
	return entry.isA !== 'Type' && !isViewFile(entry.path);
}

/**
 * Returns the notes matching the current sidebar selection (type, untyped
 * and the nav lists other than Archive leave archived notes out),
 * most-recently-modified first, with `_order` pins on top.
 */
export function getNotesForSelection(
	entries: NoteEntryV2[],
	selection: TypeSidebarSelection,
): TypeSidebarNote[] {
	let filtered: NoteEntryV2[];

	switch (selection.kind) {
		case 'type':
			filtered = entries.filter((e) => e.isA === selection.name && !e.archived && isListableNote(e));
			break;
		case 'untyped':
			filtered = entries.filter((e) => !e.isA && !e.archived && isListableNote(e));
			break;
		case 'nav':
			filtered = filterByNavItem(entries, selection.id);
			break;
		case 'view':
			filtered = [];
			break;
	}

	const notes = filtered.map(toSidebarNote);
	sortNotes(notes, 'modified');
	return notes;
}

/**
 * Converts the entries matching a set of paths into sidebar notes, archived
 * ones left out unless `includeArchived`. A `sort` mode (default `modified`,
 * newest first) re-sorts them with `_order` pins on top; `null` keeps the
 * iteration order of `matchingPaths` (the view query's order).
 */
export function getNotesForViewPaths(
	entries: NoteEntryV2[],
	matchingPaths: ReadonlySet<string>,
	sort: string | null = 'modified',
	includeArchived = false,
): TypeSidebarNote[] {
	if (sort === null) {
		const byPath = new Map(entries.map((e) => [e.path, e]));
		const notes: TypeSidebarNote[] = [];
		for (const path of matchingPaths) {
			const entry = byPath.get(path);
			if (entry && (includeArchived || !entry.archived)) notes.push(toSidebarNote(entry));
		}
		return notes;
	}
	const filtered = entries.filter((e) => matchingPaths.has(e.path) && (includeArchived || !e.archived));
	const notes = filtered.map(toSidebarNote);
	sortNotes(notes, sort);
	return notes;
}

function toSidebarNote(entry: NoteEntryV2): TypeSidebarNote {
	const rawOrder = entry.frontmatter['_order'];
	// A number, or a quoted one (`"2"`). Number() reads null, '', '  ' and false as 0 and true as 1, which would pin the note.
	const parsedOrder = typeof rawOrder === 'number' ? rawOrder : typeof rawOrder === 'string' && rawOrder.trim() !== '' ? Number(rawOrder) : NaN;
	const order = Number.isFinite(parsedOrder) ? parsedOrder : Infinity;
	return {
		path: entry.path,
		title: entry.title,
		order,
		favorite: entry.favorite,
		modifiedAt: entry.modifiedAt,
		createdAt: entry.createdAt,
		frontmatter: entry.frontmatter,
	};
}

/** Filters entries by nav item selection. */
function filterByNavItem(entries: NoteEntryV2[], id: NavItemId): NoteEntryV2[] {
	switch (id) {
		case 'all':
			return entries.filter((e) => e.isA !== 'Type' && !e.archived);
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
		if (!isListableNote(entry)) continue;
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
		sortNotes(notes, metadata.sort);
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
function sortNotes(notes: TypeSidebarNote[], sort: string): void {
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
	}
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

/** Collects .view files from the file tree, sorted by name in natural order ("Week 2" before "Week 10"). */
export function collectViewFiles(tree: FileTreeNode[]): ViewFileEntry[] {
	const views: ViewFileEntry[] = [];
	collectViewFilesWalk(tree, views);
	views.sort((a, b) => naturalCompare(a.name, b.name));
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

/**
 * Builds the YAML of a new `.view`: the name as its label and as the name of
 * its one table view, sorted by title. `filters`, when given, become that
 * view's own filters (the note list's Filter panel shows them under "This
 * view"); without them the file has no `filters` key. Serialized rather than
 * templated so a name YAML reads as another type (`123`, `true`, `#tag`,
 * `- x`) stays a string and a filter expression keeps its quotes;
 * `lineWidth: 0` keeps a long name on one line.
 */
export function buildNewViewYaml(name: string, filters?: CollectionFilter | string): string {
	const view = filters === undefined ? { type: 'table', name } : { type: 'table', name, filters };
	return stringifyYaml({ _sidebar_label: name, _sort: 'title', views: [view] }, { lineWidth: 0 });
}

/**
 * Whether a click on the view's row opens the `.view` in the editor instead of
 * picking it as the note list's lens. Only the YAML boolean `true` turns it on.
 */
export function getViewOpensInEditor(entry: NoteEntryV2 | undefined): boolean {
	return entry?.frontmatter['_open_in_editor'] === true;
}

/**
 * The subheading the view is listed under in Views: its trimmed `_group`.
 * Null (ungrouped) when the key is missing, blank or not text.
 */
export function getViewGroup(entry: NoteEntryV2 | undefined): string | null {
	const group = entry?.frontmatter['_group'];
	if (typeof group !== 'string') return null;
	return group.trim() || null;
}

/**
 * Whether Views lists the view. Only the YAML boolean `false` hides it (Rust
 * reads the `visible` alias as `_visible`); a hidden view is still a file.
 */
export function getViewVisible(entry: NoteEntryV2 | undefined): boolean {
	return entry?.frontmatter['_visible'] !== false;
}

/** A reserved frontmatter key and the value shape its reader uses; any other value is ignored. */
export interface ReservedKeyRule {
	/** The frontmatter key, e.g. `_order` */
	key: string;
	/** True for a value the key's reader uses; `frontmatter` is the whole record the value came from */
	check: (value: unknown, frontmatter: Record<string, unknown>) => boolean;
	/** The expected value in words, for the note, e.g. "a number" */
	expected: string;
	/** The note for a refused value, when it should say more than "expected ..., got ..."; null keeps that default */
	note?: (value: unknown) => string | null;
}

/** The `_sort` values a view's list orders by (`sortNotes`); any other value is ignored. */
export const VIEW_SORTS: readonly string[] = ['modified', 'created', 'modified-asc', 'created-asc', 'title'];

/** True for a `_sort` value a view's list orders by. */
export function isViewSort(value: unknown): value is string {
	return typeof value === 'string' && VIEW_SORTS.includes(value);
}

/**
 * The reserved keys whose ignored values are reported. Each check only
 * reports: the readers (`getViewOrder`, `getViewOpensInEditor`, `getViewSort`,
 * `getViewVisible`, `getViewGroup`, `pinnedRailItems` for `_rail`, and
 * `railViewIndex` for `_rail_view`) decide which values work.
 */
export const RESERVED_KEY_RULES: readonly ReservedKeyRule[] = [
	{ key: '_order', check: (v) => typeof v === 'number', expected: 'a number' },
	{ key: '_open_in_editor', check: (v) => typeof v === 'boolean', expected: 'true or false' },
	{ key: '_sort', check: isViewSort, expected: `one of ${VIEW_SORTS.join(', ')}` },
	{ key: '_visible', check: (v) => typeof v === 'boolean', expected: 'true or false' },
	{ key: '_group', check: (v) => typeof v === 'string', expected: 'text' },
	{ key: '_rail', check: (v) => typeof v === 'boolean', expected: 'true or false' },
	{
		key: '_rail_view',
		// Only a record with `views` (a `.view`) runs a view; a type definition has none, so the key means nothing there.
		// The parse keeps only a non-blank string, and a blank one names no view either. Rust projects each view of the
		// entry to null, so the entry cannot tell whether a string names a view: `railViewNameNote` reads the parse for that.
		check: (v, fm) => !Array.isArray(fm.views) || (typeof v === 'string' && v.trim() !== ''),
		expected: 'the name of one of its views',
		note: (v) => (typeof v === 'string' ? railViewMissNote(v) : null),
	},
];

/** The note for a `_rail_view` that names no view. */
function railViewMissNote(name: string): string {
	return `Ignored key _rail_view: ${JSON.stringify(name)} names no view; the first view runs`;
}

/**
 * The note for a parsed `.view` whose `_rail_view` picks no view: a name none
 * of its views has, or a value that is not text (which the entry can miss, as
 * Rust projects an unquoted `[[Board]]` to a string). Null when it names a view
 * or sets none.
 */
export function railViewNameNote(definition: Pick<CollectionDefinition, 'views' | 'railView' | 'railViewIgnored'>): string | null {
	if (definition.railViewIgnored !== undefined) return ignoredKeyNotes({ _rail_view: definition.railViewIgnored, views: definition.views })[0] ?? null;
	const name = definition.railView;
	return name !== undefined && viewIndexByName(definition.views, name) < 0 ? railViewMissNote(name) : null;
}

/** One note per reserved key the frontmatter sets to a value its reader ignores, e.g. `_order: "1"`. */
export function ignoredKeyNotes(frontmatter: Record<string, unknown>): string[] {
	return RESERVED_KEY_RULES.flatMap((rule) => {
		const value = frontmatter[rule.key];
		if (!(rule.key in frontmatter) || rule.check(value, frontmatter)) return [];
		return [rule.note?.(value) ?? `Ignored key ${rule.key}: expected ${rule.expected}, got ${JSON.stringify(value)}`];
	});
}

/** Extracts _order from a view entry's frontmatter. Defaults to 50. */
export function getViewOrder(entry: NoteEntryV2 | undefined): number {
	const order = entry?.frontmatter['_order'];
	return typeof order === 'number' ? order : 50;
}

/**
 * Extracts _sort from a view entry's frontmatter. Defaults to 'modified' when
 * it is absent or not one of `VIEW_SORTS` (`ignoredKeyNotes` reports that).
 */
export function getViewSort(entry: NoteEntryV2 | undefined): string {
	const sort = entry?.frontmatter['_sort'];
	return isViewSort(sort) ? sort : 'modified';
}

/**
 * The Sort panel's text for a view list that no sort of the view's own
 * orders: its `_sort`, or the default when it has none or one that is ignored.
 */
export function effectiveViewSortLabel(entry: NoteEntryV2 | undefined): string {
	const sort = entry?.frontmatter['_sort'];
	return isViewSort(sort) ? `Sorted by _sort: ${sort}` : 'Sorted by the default: modified, newest first';
}

/** Extracts _list_properties_display from a view entry's frontmatter. */
export function getViewListProperties(entry: NoteEntryV2 | undefined): string[] {
	const raw = entry?.frontmatter['_list_properties_display'];
	if (!Array.isArray(raw)) return [];
	return raw.filter((v): v is string => typeof v === 'string');
}

/**
 * Sorts view files by _order from the entries index, then by the label the
 * row shows (`getViewLabel`) in natural order, then by path. Takes the
 * path → entry Map so the comparator resolves in O(1) instead of scanning the
 * entries array once per comparison.
 */
export function sortViewFiles(views: ViewFileEntry[], entriesByPath: Map<string, NoteEntryV2>): ViewFileEntry[] {
	return [...views].sort((a, b) => {
		const ea = entriesByPath.get(a.path);
		const eb = entriesByPath.get(b.path);
		const oa = getViewOrder(ea);
		const ob = getViewOrder(eb);
		if (oa !== ob) return oa - ob;
		const byLabel = naturalCompare(getViewLabel(ea, a.name), getViewLabel(eb, b.name));
		if (byLabel !== 0) return byLabel;
		return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
	});
}

/** Sets `key`, or removes it when `value` is absent, and always drops its alias, which `extractViewIcon` folds onto it. */
function setViewIconKey(raw: Record<string, unknown>, key: string, alias: string, value: string | undefined): void {
	delete raw[alias];
	if (value !== undefined) {
		raw[key] = value;
	} else {
		delete raw[key];
	}
}

/**
 * Updates _icon, _color, and _title_color in a .view YAML string, dropping their
 * aliases, so an absent value removes the key in either spelling. Returns the updated YAML.
 * An `icon` and colors `extractViewIcon` already resolves the file to return the
 * input as it is, since re-serialising drops its comments and formatting, and
 * the file keeps its spelling (`_icon: star` for `lucide:star`). No `icon` always
 * removes the keys: one the parser rejects resolves to nothing but is still there.
 */
export function updateViewIconYaml(yamlString: string, icon?: string, color?: string, titleColor?: string): string {
	const requested = icon === undefined ? null : parseIconValuePermissive(icon);
	if (requested) {
		const current = extractViewIcon(yamlString);
		if (
			current?.iconPack === requested.iconPack &&
			current.iconName === requested.iconName &&
			current.color === color &&
			current.titleColor === titleColor
		) {
			return yamlString;
		}
	}
	let raw: Record<string, unknown>;
	try {
		raw = (parseYaml(yamlString) as Record<string, unknown>) ?? {};
	} catch {
		return yamlString;
	}
	setViewIconKey(raw, '_icon', 'icon', icon);
	setViewIconKey(raw, '_color', 'color', color);
	setViewIconKey(raw, '_title_color', 'title_color', titleColor);
	return stringifyYaml(raw);
}

/**
 * Updates the colors in a .view YAML string, leaving the icon keys as they are:
 * the picker saves colors alone also when `extractViewIcon` rejected the `_icon`
 * value, which is still the user's. A color that does not differ from what the
 * file resolves to keeps its keys, in whichever spelling. With no difference at
 * all the input comes back as it is, since re-serialising drops its comments and
 * formatting; so does YAML that does not parse or is not a mapping.
 */
export function updateViewColorsYaml(yamlString: string, color?: string, titleColor?: string): string {
	let raw: unknown;
	try {
		raw = parseYaml(yamlString) ?? {};
	} catch {
		return yamlString;
	}
	if (typeof raw !== 'object' || Array.isArray(raw)) return yamlString;
	const fields = raw as Record<string, unknown>;

	const current = extractViewIcon(yamlString);
	const colorChanged = current?.color !== color;
	const titleColorChanged = current?.titleColor !== titleColor;
	if (!colorChanged && !titleColorChanged) return yamlString;
	if (colorChanged) setViewIconKey(fields, '_color', 'color', color);
	if (titleColorChanged) setViewIconKey(fields, '_title_color', 'title_color', titleColor);
	return stringifyYaml(fields);
}

/**
 * Pins a `.view` to the rail (`_rail: true`) or unpins it (the key deleted,
 * whatever its value). Throws on YAML that does not parse or whose top level
 * is not a mapping, so the Pin click can say why nothing changed. The file is
 * re-serialised, so its comments and formatting are lost, as with
 * `updateViewIconYaml`.
 */
export function updateViewRailYaml(yamlString: string, on: boolean): string {
	let parsed: unknown;
	try {
		parsed = parseYaml(yamlString) ?? {};
	} catch (err) {
		throw new Error(`The .view file's YAML does not parse: ${err instanceof Error ? err.message : String(err)}`);
	}
	if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error("The .view file's YAML is not a mapping of keys");
	const raw = parsed as Record<string, unknown>;
	if (on) raw._rail = true;
	else delete raw._rail;
	return stringifyYaml(raw);
}

/**
 * Shows a hidden `.view` in Views: deletes `_visible` (and its alias
 * `visible`, which Rust folds onto it) and `_open_in_editor`. Gives back the
 * bytes unchanged when none of them is there, so nothing is written. Throws on
 * YAML that does not parse or whose top level is not a mapping, as
 * `updateViewRailYaml` does. The file is re-serialised, so its comments and
 * formatting are lost.
 */
export function showViewInViewsYaml(yamlString: string): string {
	let parsed: unknown;
	try {
		parsed = parseYaml(yamlString) ?? {};
	} catch (err) {
		throw new Error(`The .view file's YAML does not parse: ${err instanceof Error ? err.message : String(err)}`);
	}
	if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error("The .view file's YAML is not a mapping of keys");
	const raw = parsed as Record<string, unknown>;
	const keys = ['_visible', 'visible', '_open_in_editor'].filter((key) => key in raw);
	if (keys.length === 0) return yamlString;
	for (const key of keys) delete raw[key];
	return stringifyYaml(raw);
}

/**
 * Sets the property columns the rail note list shows (`_list_properties_display`,
 * in display order), or deletes the key for an empty list. Throws on YAML that
 * does not parse or whose top level is not a mapping, as `updateViewRailYaml`
 * does. The file is re-serialised, so its comments and formatting are lost.
 */
export function updateViewListPropertiesYaml(yamlString: string, properties: readonly string[]): string {
	let parsed: unknown;
	try {
		parsed = parseYaml(yamlString) ?? {};
	} catch (err) {
		throw new Error(`The .view file's YAML does not parse: ${err instanceof Error ? err.message : String(err)}`);
	}
	if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error("The .view file's YAML is not a mapping of keys");
	const raw = parsed as Record<string, unknown>;
	// Rust folds the alias onto the key, so a kept alias could override this save.
	delete raw.list_properties_display;
	if (properties.length > 0) raw._list_properties_display = [...properties];
	else delete raw._list_properties_display;
	return stringifyYaml(raw);
}
