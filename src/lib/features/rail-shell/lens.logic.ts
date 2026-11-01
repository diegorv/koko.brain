import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { LayoutSettings } from '#lib/core/settings/settings.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import {
	getFileExtension,
	getFileName,
	getRelativePath,
	isCanvasFile,
	isCollectionFile,
	isKanbanFile,
	isMarkdownFile,
	isViewFile,
} from '#lib/core/filesystem/fs.logic.js';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { noteDateKey } from '#lib/utils/note-date.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { getTypeMetadataFallback } from '#lib/features/type-definitions/type-definitions.logic.js';
import {
	buildTypeSections,
	collectViewFiles,
	excludeSystemFolder,
	getNotesForSelection,
	getNotesForViewPaths,
	getViewLabel,
	getViewSort,
	sortViewFiles,
	type TypeSidebarSelection,
} from '#lib/features/type-definitions/type-sidebar.logic.js';
import { buildOverriddenQuery, resolveViewListSort, seedToolbarStateFromDefinition } from '#lib/features/type-definitions/type-note-list.logic.js';
import { executeQuery } from '#lib/features/collection/collection.logic.js';
import { filterRowToExpression } from '#lib/features/collection/toolbar/filter.logic.js';
import type { CollectionDefinition, CollectionViewDef, NoteRecord, SortDef } from '#lib/features/collection/collection.types.js';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
import type {
	FileKind,
	Lens,
	LensContext,
	LensNote,
	NewNoteContext,
	NewNoteRule,
	PlainNewNoteRule,
	RailLensProvider,
	ResolvedLens,
	TypeNavigatorRow,
} from './rail-shell.types';

/** The Inbox rail item's lens. */
export const INBOX_LENS: Lens = { kind: 'inbox' };

/** The Favorites rail item's lens. */
export const FAVORITES_LENS: Lens = { kind: 'favorites' };

/** The Archive rail item's lens. */
export const ARCHIVE_LENS: Lens = { kind: 'archive' };

/** The Untyped row of the Types navigator: notes with no type. */
export const UNTYPED_LENS: Lens = { kind: 'untyped' };

/**
 * The Types rail item's lens before a navigator row is picked. It has no
 * target, so it resolves to no list; `pickedTypesLens` replaces it.
 */
export const TYPES_LENS: Lens = { kind: 'type' };

/** The lens kind of a `.view` file; its target is the file's absolute path. */
export const VIEW_LENS_KIND = 'view';

/** The lens kind of a Files navigator folder; its target is the folder's absolute path, none is the vault root. */
export const FOLDER_LENS_KIND = 'folder';

/** The Files rail item's lens before a folder is picked: the vault root. */
export const FILES_LENS: Lens = { kind: FOLDER_LENS_KIND };

/** The rail item shown when nothing valid is saved. */
export const DEFAULT_RAIL_ITEM = 'inbox';

/** The rail item that opens the Types navigator. */
export const TYPES_RAIL_ITEM = 'types';

/** The rail item that opens the Files navigator. */
export const FILES_RAIL_ITEM = 'files';

/** Each built-in rail item key and the lens it sets. */
const RAIL_ITEM_LENSES = new Map<string, Lens>([
	[DEFAULT_RAIL_ITEM, INBOX_LENS],
	['favorites', FAVORITES_LENS],
	[TYPES_RAIL_ITEM, TYPES_LENS],
	[FILES_RAIL_ITEM, FILES_LENS],
	['archive', ARCHIVE_LENS],
]);

/**
 * The rail item saved in `layout.railItem` and its lens. The value comes from
 * settings.json, so anything the rail does not know (an old or hand-edited
 * key, a non-string) falls back to the default item.
 */
export function restoreRailItem(saved: unknown): { item: string; lens: Lens } {
	const lens = typeof saved === 'string' ? RAIL_ITEM_LENSES.get(saved) : undefined;
	if (lens) return { item: saved as string, lens };
	return { item: DEFAULT_RAIL_ITEM, lens: INBOX_LENS };
}

/**
 * The row's second line: the note's type (or "Note"), its note date and its
 * vault-relative folder. Parts that are unknown or at the vault root are left out.
 */
export function noteSubtitle(entry: NoteEntryV2, vaultPath: string | null): string {
	const day = noteDateKey({
		date: entry.frontmatter['date'],
		created: entry.frontmatter['created'],
		// Entries carry seconds; the note-date rule takes milliseconds.
		diskCreatedAt: entry.createdAt * 1000,
	});
	return [entry.isA ?? 'Note', day, vaultFolder(entry.path, vaultPath)].filter(Boolean).join(' · ');
}

function vaultFolder(path: string, vaultPath: string | null): string {
	if (!vaultPath) return '';
	const prefix = vaultPath.replace(/\/+$/, '') + '/';
	if (!path.startsWith(prefix)) return '';
	const relative = path.slice(prefix.length);
	const slash = relative.lastIndexOf('/');
	return slash === -1 ? '' : relative.slice(0, slash);
}

function toLensNote(entry: NoteEntryV2, vaultPath: string | null): LensNote {
	return {
		path: entry.path,
		title: entry.title,
		favorite: entry.favorite,
		modifiedAt: entry.modifiedAt,
		createdAt: entry.createdAt,
		frontmatter: entry.frontmatter,
		isA: entry.isA,
		subtitle: noteSubtitle(entry, vaultPath),
		italic: isInboxEntry(entry),
		kind: 'markdown',
	};
}

/** A built-in lens: its header, the predicate over the entries snapshot and its "+ New here" frontmatter. */
interface BuiltInLens {
	label: string;
	rule: string;
	includes: (entry: NoteEntryV2) => boolean;
	/** Frontmatter a plain note created from this lens starts with; absent means no button */
	newNote?: PlainNewNoteRule['frontmatter'];
}

const BUILT_IN_LENSES = new Map<string, BuiltInLens>([
	[INBOX_LENS.kind, { label: 'Inbox', rule: 'not organized, not archived', includes: isInboxEntry, newNote: { _organized: false } }],
	[
		FAVORITES_LENS.kind,
		{ label: 'Favorites', rule: 'favorite, not archived', includes: (e) => e.favorite && !e.archived, newNote: { _favorite: true } },
	],
	[ARCHIVE_LENS.kind, { label: 'Archive', rule: 'archived', includes: (e) => e.archived }],
]);

/** Lists a built-in lens: system folder excluded, newest change first. */
function resolveBuiltIn(lens: BuiltInLens, ctx: LensContext): ResolvedLens {
	const notes = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder)
		.filter(lens.includes)
		.sort((a, b) => b.modifiedAt - a.modifiedAt || a.title.localeCompare(b.title))
		.map((e) => toLensNote(e, ctx.vaultPath));
	return { label: lens.label, rule: lens.rule, notes };
}

/**
 * Lists a type (or Untyped) lens with the classic Types list's rule, so the
 * notes and their order match its Open tab: not archived, `_order` pins on top,
 * then newest change. Null for the Types item before a pick (no target).
 */
function resolveTypeLens(lens: Lens, ctx: LensContext): ResolvedLens | null {
	let selection: TypeSidebarSelection;
	let label: string;
	let rule: string;
	if (lens.kind === UNTYPED_LENS.kind) {
		selection = { kind: 'untyped' };
		label = 'Untyped';
		rule = 'no type, not archived';
	} else {
		if (!lens.target) return null;
		selection = { kind: 'type', name: lens.target };
		label = getTypeMetadataFallback(lens.target, ctx.typeMetadataMap).sidebarLabel;
		rule = `type is ${lens.target}, not archived`;
	}
	const entries = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder);
	const byPath = new Map(entries.map((e) => [e.path, e]));
	const notes = getNotesForSelection(entries, selection, ctx.typeMetadataMap).flatMap((n) => {
		const entry = byPath.get(n.path);
		return entry ? [toLensNote(entry, ctx.vaultPath)] : [];
	});
	return { label, rule, notes };
}

/**
 * Turns a lens into the note list's label, rule and notes. Inbox, Favorites,
 * Archive, Type, Untyped and Folder are built in; any other kind goes to the
 * provider registered for it. Returns null when no provider knows the kind,
 * the provider cannot resolve the target, a type lens has no target, or a
 * folder lens's folder is not in the tree.
 */
export function resolveLens(lens: Lens, ctx: LensContext, providers: readonly RailLensProvider[] = []): ResolvedLens | null {
	const builtIn = BUILT_IN_LENSES.get(lens.kind);
	if (builtIn) return resolveBuiltIn(builtIn, ctx);
	if (lens.kind === TYPES_LENS.kind || lens.kind === UNTYPED_LENS.kind) return resolveTypeLens(lens, ctx);
	if (lens.kind === FOLDER_LENS_KIND) return resolveFolderLens(lens, ctx);
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider ? provider.resolve(lens, ctx) : null;
}

/**
 * The Types navigator's rows: the visible types in sidebar order, each with the
 * number of notes its lens lists, then Untyped when `showUntyped` is on. The
 * counts come from the classic sidebar's sections, which apply the same
 * not-archived rule over the same system-folder-excluded entries.
 */
export function typeNavigatorRows(ctx: LensContext, showUntyped: boolean): TypeNavigatorRow[] {
	const entries = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder);
	const { sections, untyped } = buildTypeSections(entries, ctx.typeMetadataMap, 'all');
	const rows: TypeNavigatorRow[] = sections.map((s) => ({
		lens: { kind: TYPES_LENS.kind, target: s.metadata.name },
		label: s.metadata.sidebarLabel,
		count: s.notes.length,
		typeName: s.metadata.name,
		definitionPath: s.definitionPath,
	}));
	if (showUntyped) {
		rows.push({ lens: { ...UNTYPED_LENS }, label: 'Untyped', count: untyped.length, typeName: null, definitionPath: null });
	}
	return rows;
}

/**
 * The Types navigator pick saved in `layout.railTypesLens`. The value comes
 * from settings.json, so anything but a view or type lens with a target or the
 * Untyped lens reads as no pick.
 */
export function parseTypesPick(saved: unknown): Lens | null {
	if (typeof saved !== 'object' || saved === null) return null;
	const { kind, target } = saved as { kind?: unknown; target?: unknown };
	if (kind === UNTYPED_LENS.kind) return { ...UNTYPED_LENS };
	if ((kind === TYPES_LENS.kind || kind === VIEW_LENS_KIND) && typeof target === 'string' && target) return { kind, target };
	return null;
}

/**
 * The lens the Types rail item shows: the saved pick (kept even when the
 * snapshot does not list it yet, as right after New type or a rename), else
 * the first row, else the bare Types lens.
 */
export function pickedTypesLens(saved: unknown, rows: readonly TypeNavigatorRow[]): Lens {
	return parseTypesPick(saved) ?? rows[0]?.lens ?? TYPES_LENS;
}

/** True when two lenses pick the same thing. */
export function sameLens(a: Lens, b: Lens): boolean {
	return a.kind === b.kind && (a.target ?? '') === (b.target ?? '');
}

/**
 * The layout change that drops a saved Types pick the navigator no longer
 * lists (a deleted view or type, or Untyped with untyped notes hidden): the pick is
 * cleared and, when the Types item is active, the rail goes back to the
 * default item. Null when there is nothing to fix. Meant to run once the
 * entries of a newly opened vault have loaded, not on every refresh: the
 * refresh is throttled, so a type just created or renamed is missing for a
 * few seconds.
 */
export function staleTypesPickFix(
	railItem: unknown,
	saved: unknown,
	rows: readonly TypeNavigatorRow[],
): Pick<Partial<LayoutSettings>, 'railItem' | 'railTypesLens'> | null {
	const pick = parseTypesPick(saved);
	if (!pick || rows.some((r) => sameLens(r.lens, pick))) return null;
	return railItem === TYPES_RAIL_ITEM ? { railItem: DEFAULT_RAIL_ITEM, railTypesLens: null } : { railTypesLens: null };
}

/** Where the once-per-vault-open stale Types pick check stands. */
export interface TypesPickCheck {
	/** The vault this state belongs to */
	vaultPath: string | null;
	/** True once this vault's index was seen not ready (teardown or first open), so a later ready is its own */
	armed: boolean;
	/** The entries version seen when this vault's index turned ready; null before that */
	readyAtVersion: number | null;
	/** True once the check ran for this vault open */
	done: boolean;
}

/** The check state before any vault is seen. */
export const INITIAL_TYPES_PICK_CHECK: TypesPickCheck = { vaultPath: null, armed: false, readyAtVersion: null, done: false };

/**
 * Advances the stale Types pick check by one observation and says whether to
 * run `staleTypesPickFix` now. It runs once per vault open, on the first
 * entries snapshot that lands after THIS vault's index is ready. On a vault
 * switch the store still holds the previous vault's entries, and a tail
 * `vault-index-updated` from it can refill the store after teardown; both come
 * before the new vault's index is ready, or are the snapshot already there
 * when it turns ready, so neither counts. While `enabled` is false (the classic
 * shell, whose rows are empty) a due check waits instead of running.
 */
export function stepTypesPickCheck(
	prev: TypesPickCheck,
	now: { vaultPath: string | null; indexReady: boolean; entriesVersion: number; enabled: boolean },
): { next: TypesPickCheck; run: boolean } {
	if (!now.vaultPath) return { next: INITIAL_TYPES_PICK_CHECK, run: false };
	if (now.vaultPath !== prev.vaultPath || !now.indexReady) {
		return { next: { vaultPath: now.vaultPath, armed: !now.indexReady, readyAtVersion: null, done: false }, run: false };
	}
	if (!prev.armed || prev.done) return { next: prev, run: false };
	if (prev.readyAtVersion === null) return { next: { ...prev, readyAtVersion: now.entriesVersion }, run: false };
	if (now.enabled && now.entriesVersion > prev.readyAtVersion) return { next: { ...prev, done: true }, run: true };
	return { next: prev, run: false };
}

/**
 * The one lens-to-new-note rule behind "+ New here". Inbox and Favorites create
 * a plain note where Cmd+N puts one, marked `_organized: false` or
 * `_favorite: true`; Untyped creates a plain note there with no frontmatter; a
 * type lens creates a note of its type; a folder lens creates a plain note
 * with no frontmatter in its folder (the vault root before a pick); a view lens creates a note of
 * `ctx.viewTypeName` when set, else a plain note; Archive creates nothing; any
 * other kind uses its provider's `newNote`. Returns null (no button) without a
 * vault, or when the kind has no creation rule.
 */
export function newNoteRule(lens: Lens, ctx: NewNoteContext, providers: readonly RailLensProvider[] = []): NewNoteRule | null {
	const vaultPath = ctx.vaultPath;
	if (!vaultPath) return null;
	const plainNote = (frontmatter: PlainNewNoteRule['frontmatter']): PlainNewNoteRule => ({
		folder: buildCaptureFolder(vaultPath, ctx.captureBaseFolder, ctx.captureFolderFormat, ctx.now),
		frontmatter: { ...frontmatter },
	});
	const builtIn = BUILT_IN_LENSES.get(lens.kind);
	if (builtIn) return builtIn.newNote ? plainNote(builtIn.newNote) : null;
	if (lens.kind === UNTYPED_LENS.kind) return plainNote({});
	if (lens.kind === TYPES_LENS.kind) return lens.target ? { typeName: lens.target } : null;
	if (lens.kind === FOLDER_LENS_KIND) return { folder: lens.target || vaultPath, frontmatter: {} };
	if (lens.kind === VIEW_LENS_KIND) {
		if (!lens.target) return null;
		return ctx.viewTypeName ? { typeName: ctx.viewTypeName } : plainNote({});
	}
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider?.newNote?.(lens, ctx) ?? null;
}

/** The new note's initial content: the rule's frontmatter block, or empty when it sets none. */
export function newNoteContent(rule: PlainNewNoteRule): string {
	const keys = Object.entries(rule.frontmatter);
	if (keys.length === 0) return '';
	return `---\n${keys.map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n`;
}

/**
 * The Views part of the Types navigator: every `.view` file in the tree, by
 * `_order` then name, labelled by its `_sidebar_label`. Counts are null: they
 * need each view's query run (`countViewNotes`).
 */
export function viewNavigatorRows(tree: FileTreeNode[], entriesByPath: Map<string, NoteEntryV2>): TypeNavigatorRow[] {
	return sortViewFiles(collectViewFiles(tree), entriesByPath).map((v) => ({
		lens: { kind: VIEW_LENS_KIND, target: v.path },
		label: getViewLabel(entriesByPath.get(v.path), v.name),
		count: null,
		typeName: null,
		definitionPath: null,
	}));
}

/** The Sort and Filter toolbar state that replaces a view's saved filters and sort. */
export interface ViewQueryOverrides {
	/** Filters over every view of the `.view` (its top-level `filters`) */
	globalFilters: FilterGroup[];
	/** Filters of the first view */
	viewFilters: FilterGroup[];
	/** Sort of the first view; empty keeps the saved sort */
	sort: SortDef[];
}

/** A view's query, run. */
export interface ViewQueryResult {
	/** Paths the query matched, in the query's order */
	paths: string[];
	/** The view as run, its sort included */
	view: CollectionViewDef;
	/** The global then view filter groups the query ran with */
	filterGroups: FilterGroup[];
}

/**
 * Runs the first view of a parsed `.view` over the property index, with the
 * toolbar overrides when given (else its saved filters and sort). Null when the
 * definition has no view.
 */
export function queryViewLens(
	definition: CollectionDefinition,
	overrides: ViewQueryOverrides | null,
	propertyIndex: Map<string, NoteRecord>,
): ViewQueryResult | null {
	const view = definition.views[0];
	const state = overrides ?? seedToolbarStateFromDefinition(definition, view);
	const query = buildOverriddenQuery(definition, view, state.globalFilters, state.viewFilters, state.sort);
	if (!query) return null;
	const records = executeQuery(query.definition, query.view, propertyIndex).records;
	return { paths: records.map((r) => r.path), view: query.view, filterGroups: [...state.globalFilters, ...state.viewFilters] };
}

/**
 * Turns a view's query result into the note list: the view's label, its
 * filters in words, and the matched notes that are not archived and not in the
 * system folder, in the order its Sort shows (`resolveViewListSort`: the view's
 * sort keeps the query order, else its `_sort`). A null result (the query could
 * not run) lists nothing.
 */
export function resolveViewLens(viewPath: string, result: ViewQueryResult | null, ctx: LensContext): ResolvedLens {
	const viewEntry = ctx.entries.find((e) => e.path === viewPath);
	const label = getViewLabel(viewEntry, getFileName(viewPath).replace(/\.view$/i, ''));
	if (!result) return { label, rule: '', notes: [] };
	const entries = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder);
	const byPath = new Map(entries.map((e) => [e.path, e]));
	const sort = resolveViewListSort(result.view, getViewSort(viewEntry));
	const notes = getNotesForViewPaths(entries, new Set(result.paths), sort).flatMap((n) => {
		const entry = byPath.get(n.path);
		return entry ? [toLensNote(entry, ctx.vaultPath)] : [];
	});
	return { label, rule: describeViewFilters(result.filterGroups), notes };
}

/** A view's filter groups in words, e.g. "_type == 'Project' and status == 'active', not archived". */
export function describeViewFilters(groups: readonly FilterGroup[]): string {
	const parts = groups.flatMap((g) => {
		const rows = g.rows.map(filterRowToExpression);
		if (rows.length === 0) return [];
		if (g.conjunction === 'not') return rows.map((r) => `not ${r}`);
		if (g.conjunction === 'or') return [rows.length > 1 ? `(${rows.join(' or ')})` : rows[0]];
		return rows;
	});
	return `${parts.length > 0 ? parts.join(' and ') : 'every note'}, not archived`;
}

/** The filter keys that read a note's type (`type` is the engine's alias of `_type`). */
const TYPE_FILTER_KEYS = new Set(['_type', 'type']);

/** True when a filter property reads the type field, bare or as `note.` / `property.` (the engine's `isTypeIdentifier`). */
function isTypeFilterKey(property: string): boolean {
	return TYPE_FILTER_KEYS.has(property.replace(/^(note|property)\./, ''));
}

/**
 * The type a view's "+ New here" note gets: the value of its one `_type`
 * equality filter, in the casing of the matching known type. Null (a plain
 * note) when no filter or several pin the type, or when a `_type` filter sits
 * in an OR or NOT group, where it no longer says every note has that type.
 */
export function viewNoteType(groups: readonly FilterGroup[], knownTypes: Iterable<string>): string | null {
	const found: string[] = [];
	for (const group of groups) {
		for (const row of group.rows) {
			if (row.raw !== undefined || !isTypeFilterKey(row.property)) continue;
			if (group.conjunction !== 'and') return null;
			if (row.operator === 'is' && row.value) found.push(row.value);
		}
	}
	if (found.length !== 1) return null;
	const value = found[0];
	const lower = value.toLowerCase();
	for (const name of knownTypes) if (name.toLowerCase() === lower) return name;
	return value;
}

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
	'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif', '.heic', '.tiff', '.tif',
]);

/** The kind of a file, from its name's extension (case-insensitive). */
export function fileKind(name: string): FileKind {
	if (isMarkdownFile(name)) return 'markdown';
	if (isCanvasFile(name)) return 'canvas';
	if (isKanbanFile(name)) return 'kanban';
	if (isViewFile(name)) return 'view';
	if (isCollectionFile(name)) return 'collection';
	const ext = getFileExtension(name).toLowerCase();
	if (ext === '.pdf') return 'pdf';
	if (IMAGE_EXTENSIONS.has(ext)) return 'image';
	return 'other';
}

/** The row subtitle of a file the entries snapshot does not describe. */
const FILE_KIND_LABELS: Record<FileKind, string> = {
	markdown: 'Note',
	canvas: 'Canvas',
	kanban: 'Kanban',
	view: 'View',
	collection: 'Collection',
	pdf: 'PDF',
	image: 'Image',
	other: 'File',
};

/** Dot-prefixed names are hidden, as in the file tree (the Rust scan skips them too). */
function isHiddenName(name: string): boolean {
	return name.startsWith('.');
}

/** The folders of a tree level the Files navigator shows: directories, hidden ones left out, in tree order. */
export function navigatorFolders(nodes: readonly FileTreeNode[] | undefined): FileTreeNode[] {
	return (nodes ?? []).filter((n) => n.isDirectory && !isHiddenName(n.name));
}

/** The navigator folder at `path`, descending only through folders the navigator shows. */
function findNavigatorFolder(nodes: readonly FileTreeNode[], path: string): FileTreeNode | null {
	for (const node of navigatorFolders(nodes)) {
		if (node.path === path) return node;
		if (path.startsWith(node.path + '/')) return findNavigatorFolder(node.children ?? [], path);
	}
	return null;
}

/** The vault path without a trailing slash, the form tree paths start with. */
function vaultRoot(vaultPath: string): string {
	return vaultPath.replace(/\/+$/, '');
}

/** A folder lens row: a markdown file from its entry, any other file (or a note not yet indexed) from its tree node. */
function fileToLensNote(node: FileTreeNode, entry: NoteEntryV2 | undefined, vaultPath: string): LensNote {
	const kind = fileKind(node.name);
	if (kind === 'markdown' && entry) return toLensNote(entry, vaultPath);
	const dot = node.name.lastIndexOf('.');
	return {
		path: node.path,
		title: dot > 0 ? node.name.slice(0, dot) : node.name,
		favorite: false,
		// Tree times are milliseconds; rows take seconds.
		modifiedAt: Math.floor((node.modifiedAt ?? 0) / 1000),
		createdAt: Math.floor((node.createdAt ?? 0) / 1000),
		frontmatter: {},
		isA: null,
		subtitle: FILE_KIND_LABELS[kind],
		italic: false,
		kind,
	};
}

/**
 * Lists a folder lens: the folder's direct files of every kind, hidden ones
 * left out, in the tree's order. Subfolders are not rows (the navigator shows
 * them). Archived notes stay: the folder rule is only "in <folder>/". Null
 * without a vault or when the folder is not in the tree.
 */
function resolveFolderLens(lens: Lens, ctx: LensContext): ResolvedLens | null {
	if (!ctx.vaultPath) return null;
	const root = vaultRoot(ctx.vaultPath);
	let children: readonly FileTreeNode[];
	let label: string;
	let rule: string;
	if (!lens.target || lens.target === root) {
		children = ctx.fileTree;
		label = getFileName(root);
		rule = 'in the vault root';
	} else {
		const folder = findNavigatorFolder(ctx.fileTree, lens.target);
		if (!folder) return null;
		children = folder.children ?? [];
		label = folder.name;
		rule = `in ${getRelativePath(root, folder.path)}/`;
	}
	const byPath = new Map(ctx.entries.map((e) => [e.path, e]));
	const notes = children
		.filter((n) => !n.isDirectory && !isHiddenName(n.name))
		.map((n) => fileToLensNote(n, byPath.get(n.path), root));
	return { label, rule, notes };
}

/** The Files navigator's pick saved in `layout.railFolder` as a lens; anything but a non-empty string is the vault root. */
export function pickedFolderLens(saved: unknown): Lens {
	return typeof saved === 'string' && saved ? { kind: FOLDER_LENS_KIND, target: saved } : { ...FILES_LENS };
}

/** The expanded folders saved in `layout.railExpandedFolders`; a hand-edited non-array reads as none, non-strings are dropped. */
export function parseExpandedFolders(saved: unknown): string[] {
	return Array.isArray(saved) ? saved.filter((p): p is string => typeof p === 'string' && p !== '') : [];
}

/**
 * The layout change that drops what the Files navigator saved but the tree no
 * longer holds: a picked folder that is gone clears the pick and, when Files
 * is the active item, sends the rail back to the default item; expanded
 * folders that are gone (or a hand-edited list) are pruned. Null when there is
 * nothing to fix. Meant to run once per vault open, as `staleTypesPickFix`.
 * An empty tree fixes nothing: `initializeVault` still marks the index ready
 * when the tree load fails, and that must not wipe the saved navigator state.
 */
export function staleFolderPickFix(
	railItem: unknown,
	savedPick: unknown,
	savedExpanded: unknown,
	tree: readonly FileTreeNode[],
	vaultPath: string,
): Pick<Partial<LayoutSettings>, 'railItem' | 'railFolder' | 'railExpandedFolders'> | null {
	if (tree.length === 0) return null;
	const fix: Pick<Partial<LayoutSettings>, 'railItem' | 'railFolder' | 'railExpandedFolders'> = {};
	const pick = pickedFolderLens(savedPick).target;
	if (pick && pick !== vaultRoot(vaultPath) && !findNavigatorFolder(tree, pick)) {
		if (railItem === FILES_RAIL_ITEM) fix.railItem = DEFAULT_RAIL_ITEM;
		fix.railFolder = null;
	}
	const expanded = parseExpandedFolders(savedExpanded);
	const kept = expanded.filter((p) => findNavigatorFolder(tree, p));
	if (!Array.isArray(savedExpanded) || kept.length !== savedExpanded.length) fix.railExpandedFolders = kept;
	return Object.keys(fix).length > 0 ? fix : null;
}

/** The expanded folder list after a chevron click on `path`: added when collapsed, removed when expanded. */
export function toggleExpandedFolder(savedExpanded: unknown, path: string): string[] {
	const expanded = parseExpandedFolders(savedExpanded);
	return expanded.includes(path) ? expanded.filter((p) => p !== path) : [...expanded, path];
}

/**
 * The layout change that makes the Files navigator follow a path change: a
 * renamed or moved folder re-roots the pick and every expanded path at or
 * under `from`; a deleted one (`to` null) sends a pick at or under it back to
 * the vault root and drops those expanded paths. Null when nothing changes.
 */
export function followFolderPathChange(
	savedPick: unknown,
	savedExpanded: unknown,
	from: string,
	to: string | null,
): Pick<Partial<LayoutSettings>, 'railFolder' | 'railExpandedFolders'> | null {
	const inside = (p: string) => p === from || p.startsWith(from + '/');
	const moved = (p: string) => to + p.slice(from.length);
	const fix: Pick<Partial<LayoutSettings>, 'railFolder' | 'railExpandedFolders'> = {};
	const pick = pickedFolderLens(savedPick).target;
	if (pick && inside(pick)) fix.railFolder = to === null ? null : moved(pick);
	const expanded = parseExpandedFolders(savedExpanded);
	if (expanded.some(inside)) {
		fix.railExpandedFolders = to === null ? expanded.filter((p) => !inside(p)) : expanded.map((p) => (inside(p) ? moved(p) : p));
	}
	return Object.keys(fix).length > 0 ? fix : null;
}
