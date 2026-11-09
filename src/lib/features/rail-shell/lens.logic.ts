import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { LayoutSettings } from '#lib/core/settings/settings.types.js';
import { TYPE_PIN_PREFIX, VIEW_PIN_PREFIX, typePinKey, viewPinKey } from '#lib/core/settings/rail-pin.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import {
	getFileExtension,
	getFileName,
	getRelativePath,
	isCanvasFile,
	isKanbanFile,
	isMarkdownFile,
	isViewFile,
	naturalCompare,
} from '#lib/core/filesystem/fs.logic.js';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { noteDateKey, parseDateKey } from '#lib/utils/note-date.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { buildResolutionCache, resolveWikilinkCached } from '#lib/core/filesystem/wikilink-resolution.logic.js';
import { getTypeMetadataFallback, type TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import {
	buildTypeSections,
	collectViewFiles,
	excludeSystemFolder,
	formatRelativeTime,
	getNotesForSelection,
	getNotesForViewPaths,
	getViewGroup,
	getViewLabel,
	getViewOpensInEditor,
	getViewOrder,
	getViewSort,
	getViewVisible,
	ignoredKeyNotes,
	isListableNote,
	sortViewFiles,
	type ArchivedFilter,
	type TypeSidebarSelection,
} from '#lib/features/type-definitions/type-sidebar.logic.js';
import { buildOverriddenQuery, resolveViewListSort, seedToolbarStateFromDefinition } from '#lib/features/type-definitions/type-note-list.logic.js';
import { executeQuery, filterCitesArchived } from '#lib/features/collection/collection.logic.js';
import { railViewIndex } from '#lib/features/collection/yaml-parser.js';
import { filterRowToExpression } from '#lib/features/collection/toolbar/filter.logic.js';
import type { CollectionDefinition, CollectionViewDef, PropertyIndexRecord, SortDef } from '#lib/features/collection/collection.types.js';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
import type {
	FileKind,
	Lens,
	LensContext,
	LensGroup,
	LensNote,
	NewNoteContext,
	NewNoteRule,
	PlainNewNoteRule,
	RailLensProvider,
	RailNavigator,
	RailPin,
	ResolvedLens,
	TypeNavigatorRow,
	ViewLensStatus,
} from './rail-shell.types';

/** The Inbox rail item's lens. */
export const INBOX_LENS: Lens = { kind: 'inbox' };

/** The lens kind of the Today rail item; its target is the day it lists, as a `YYYY-MM-DD` key. */
export const TODAY_LENS_KIND = 'today';

/**
 * The Today rail item's lens before the note list gives it the current day.
 * It lists no notes; `todayLens` replaces it.
 */
export const TODAY_LENS: Lens = { kind: TODAY_LENS_KIND };

/** The Today lens of a day (`todayKey`), which the note list keeps on the clock's day. */
export function todayLens(todayKey: string): Lens {
	return { kind: TODAY_LENS_KIND, target: todayKey };
}

/** The Today lens's day: its target when that is a valid `YYYY-MM-DD` key, else null. */
function todayLensDay(lens: Lens): string | null {
	return parseDateKey(lens.target) === lens.target ? (lens.target ?? null) : null;
}

/** The Today lens's group of the notes dated today; plugin sections (`railRegistryStore.todaySections`) show before it. */
export const TODAY_DATED_GROUP = 'today';

/** The Favorites rail item's lens. */
export const FAVORITES_LENS: Lens = { kind: 'favorites' };

/** The Archive rail item's lens. */
export const ARCHIVE_LENS: Lens = { kind: 'archive' };

/**
 * The Search rail item's lens. `resolveLens` does not know it: the shell fills
 * the note list with the search panel's input and result rows instead.
 */
export const SEARCH_LENS: Lens = { kind: 'search' };

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

/** The rail item that shows the Today lens. */
export const TODAY_RAIL_ITEM = 'today';

/** The rail item shown when nothing valid is saved, and where a lost rail item or lens falls back. */
export const DEFAULT_RAIL_ITEM = TODAY_RAIL_ITEM;

/** The rail item that shows Search. */
export const SEARCH_RAIL_ITEM = 'search';

/** The rail item that opens the Types navigator. */
export const TYPES_RAIL_ITEM = 'types';

/** The rail item that opens the Files navigator. */
export const FILES_RAIL_ITEM = 'files';

/** The lens kind of a note's neighbourhood; its target is the note's absolute path. */
export const NEIGHBOURHOOD_LENS_KIND = 'neighbourhood';

/**
 * The rail item key while the note list shows a neighbourhood. No rail button
 * has it: the action bar's Neighbourhood sets it, and it only restores while a
 * note is set for it this session.
 */
export const NEIGHBOURHOOD_RAIL_ITEM = 'neighbourhood';

/** The Neighbourhood lens of the note at `path`. */
export function neighbourhoodLens(path: string): Lens {
	return { kind: NEIGHBOURHOOD_LENS_KIND, target: path };
}

/** Each built-in rail item key and the lens it sets. */
const RAIL_ITEM_LENSES = new Map<string, Lens>([
	[SEARCH_RAIL_ITEM, SEARCH_LENS],
	['inbox', INBOX_LENS],
	[TODAY_RAIL_ITEM, TODAY_LENS],
	['favorites', FAVORITES_LENS],
	[TYPES_RAIL_ITEM, TYPES_LENS],
	[FILES_RAIL_ITEM, FILES_LENS],
	['archive', ARCHIVE_LENS],
]);

/** True when `item` is a pin key: a string with the view or type pin prefix, whatever follows it. */
function isPinKey(item: unknown): item is string {
	return typeof item === 'string' && (item.startsWith(VIEW_PIN_PREFIX) || item.startsWith(TYPE_PIN_PREFIX));
}

/** The lens of a pin key with a non-empty target, else null. The target is not checked to exist. */
function pinLens(key: string): Lens | null {
	if (key.startsWith(VIEW_PIN_PREFIX) && key.length > VIEW_PIN_PREFIX.length) {
		return { kind: VIEW_LENS_KIND, target: key.slice(VIEW_PIN_PREFIX.length) };
	}
	if (key.startsWith(TYPE_PIN_PREFIX) && key.length > TYPE_PIN_PREFIX.length) {
		return { kind: TYPES_LENS.kind, target: key.slice(TYPE_PIN_PREFIX.length) };
	}
	return null;
}

/**
 * The rail item saved in `layout.railItem` and its lens: a built-in item, a
 * navigator a plugin registered (its lens is the navigator's pick), or a pin
 * key (`view:<path>` or `type:<name>`, whose lens is that view or type; the
 * target is not checked, `staleRailPinFix` drops a lost one). The value comes
 * from settings.json, so anything the rail does not know (an old or
 * hand-edited key, a non-string, a plugin navigator not registered yet, a pin
 * key with nothing after its prefix) falls back to the default item. The
 * Neighbourhood item restores only with `neighbourhoodPath` (the note it was
 * opened on this session), so after a restart it falls back too. A built-in
 * item or navigator in `hidden` (the parsed `layout.railHidden`) falls back
 * while it is hidden, except Search and Today; the saved value is not touched,
 * so showing the item again brings it back. Pins and Neighbourhood cannot be
 * hidden, so `hidden` does not apply to them.
 */
export function restoreRailItem(
	saved: unknown,
	navigators: readonly RailNavigator[] = [],
	neighbourhoodPath: string | null = null,
	hidden: readonly string[] = [],
): { item: string; lens: Lens } {
	if (typeof saved === 'string') {
		if (saved === NEIGHBOURHOOD_RAIL_ITEM && neighbourhoodPath) return { item: saved, lens: neighbourhoodLens(neighbourhoodPath) };
		if (hidden.includes(saved) && saved !== SEARCH_RAIL_ITEM && saved !== TODAY_RAIL_ITEM && !isPinKey(saved)) {
			return { item: DEFAULT_RAIL_ITEM, lens: TODAY_LENS };
		}
		const lens = RAIL_ITEM_LENSES.get(saved);
		if (lens) return { item: saved, lens };
		const navigator = navigators.find((n) => n.id === saved);
		if (navigator) return { item: saved, lens: navigator.lens() };
		const pinned = pinLens(saved);
		if (pinned) return { item: saved, lens: pinned };
	}
	return { item: DEFAULT_RAIL_ITEM, lens: TODAY_LENS };
}

/**
 * The rail's pinned items: every `.view` and type definition in the entries
 * snapshot whose `_rail` is the YAML boolean `true` (only the canonical
 * spelling; `"true"` or `1` does not pin). The system folder is not excluded
 * and `_visible` is not read: pins follow the files the Types navigator reads,
 * hidden ones included. A view is labelled like its Views row (`getViewLabel`)
 * and a type by its `sidebarLabel`. Ordered by `_order` (a view's default is
 * 50, a type uses `TypeMetadata.order`), then label in natural order, then path.
 */
export function pinnedRailItems(entries: readonly NoteEntryV2[], typeMetadataMap: Map<string, TypeMetadata>): RailPin[] {
	const pinned: (RailPin & { order: number })[] = [];
	const byPath = new Map(entries.map((e) => [e.path, e] as const));
	for (const entry of entries) {
		if (!isViewFile(entry.path) || entry.frontmatter['_rail'] !== true) continue;
		pinned.push({
			key: viewPinKey(entry.path),
			label: getViewLabel(entry, getFileName(entry.path).replace(/\.view$/i, '')),
			path: entry.path,
			kind: 'view',
			opensInEditor: getViewOpensInEditor(entry),
			order: getViewOrder(entry),
		});
	}
	for (const meta of typeMetadataMap.values()) {
		if (!meta.path || byPath.get(meta.path)?.frontmatter['_rail'] !== true) continue;
		pinned.push({ key: typePinKey(meta.name), label: meta.sidebarLabel, path: meta.path, kind: 'type', opensInEditor: false, order: meta.order });
	}
	pinned.sort((a, b) => a.order - b.order || naturalCompare(a.label, b.label) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
	return pinned.map(({ order: _order, ...pin }) => pin);
}

/**
 * The layout change that sends a saved pin that is no longer pinned (file
 * gone, `_rail` removed) back to the default item: `{ railItem }` when
 * `railItem` is a pin key no item of `pinned` has, else null. Meant to run
 * once per vault open, with `staleTypesPickFix`, for the same reason.
 */
export function staleRailPinFix(railItem: unknown, pinned: readonly RailPin[]): Pick<Partial<LayoutSettings>, 'railItem'> | null {
	if (!isPinKey(railItem) || pinned.some((p) => p.key === railItem)) return null;
	return { railItem: DEFAULT_RAIL_ITEM };
}

/**
 * The row's second line: the note's modified time in relative form
 * (`formatRelativeTime`, the order most lists sort by) and its vault-relative
 * folder. Parts that are unknown or at the vault root are left out.
 * The relative time is read from the clock when the row is built; it does not tick.
 */
export function noteSubtitle(entry: NoteEntryV2, vaultPath: string | null): string {
	return [formatRelativeTime(entry.modifiedAt), vaultFolder(entry.path, vaultPath)].filter(Boolean).join(' · ');
}

/** An entry's note date (`noteDateKey`: frontmatter `date`, else `created`, else the disk creation time), or null. */
export function entryNoteDate(entry: NoteEntryV2): string | null {
	return noteDateKey({
		date: entry.frontmatter['date'],
		created: entry.frontmatter['created'],
		// Entries carry seconds; the note-date rule takes milliseconds.
		diskCreatedAt: entry.createdAt * 1000,
	});
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
		archived: entry.archived,
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
		{ label: 'Favorites', rule: 'favorite, not archived', includes: (e) => e.favorite && !e.archived && !isViewFile(e.path), newNote: { _favorite: true } },
	],
	[ARCHIVE_LENS.kind, { label: 'Archive', rule: 'archived', includes: (e) => e.archived && isListableNote(e) }],
]);

/** Lists a built-in lens: system folder excluded, newest change first. */
function resolveBuiltIn(lens: BuiltInLens, ctx: LensContext): ResolvedLens {
	return { label: lens.label, rule: lens.rule, notes: listEntries(ctx, lens.includes) };
}

/**
 * The entries `includes` keeps as note list rows: system folder excluded,
 * newest change first (the built-in lenses' order). Type definitions and
 * `.view` files are left out by each lens's `includes`, not here: Favorites
 * keeps a type definition.
 */
export function listEntries(ctx: LensContext, includes: (entry: NoteEntryV2) => boolean): LensNote[] {
	return excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder)
		.filter(includes)
		.sort((a, b) => b.modifiedAt - a.modifiedAt || a.title.localeCompare(b.title))
		.map((e) => toLensNote(e, ctx.vaultPath));
}

/**
 * Lists the Today lens: the notes whose note date is the lens's day (the Day
 * lens's rule, so archived notes stay), system-folder-excluded, without type
 * definitions and `.view` files (`isListableNote`), newest change first. A lens
 * without a day lists an empty group.
 */
function resolveTodayLens(lens: Lens, ctx: LensContext): ResolvedLens {
	const day = todayLensDay(lens);
	const notes = day ? listEntries(ctx, (e) => isListableNote(e) && entryNoteDate(e) === day) : [];
	const groups: LensGroup[] = [{ id: TODAY_DATED_GROUP, label: 'Today', notes }];
	return { label: 'Today', rule: 'note date is today', notes, groups };
}

/** The rule's ending for each archived filter of a type or Untyped list. */
const ARCHIVED_RULE_SUFFIX: Record<ArchivedFilter, string> = { active: ', not archived', all: '', archived: ', archived' };

/**
 * Lists a type (or Untyped) lens: the notes `archived` lets through (default:
 * not archived), `_order` pins on top, then newest change. Null for the Types
 * item before a pick (no target).
 */
function resolveTypeLens(lens: Lens, ctx: LensContext, archived: ArchivedFilter): ResolvedLens | null {
	let selection: TypeSidebarSelection;
	let label: string;
	let rule: string;
	if (lens.kind === UNTYPED_LENS.kind) {
		selection = { kind: 'untyped' };
		label = 'Untyped';
		rule = 'no type';
	} else {
		if (!lens.target) return null;
		selection = { kind: 'type', name: lens.target };
		label = getTypeMetadataFallback(lens.target, ctx.typeMetadataMap).sidebarLabel;
		rule = `type is ${lens.target}`;
	}
	rule += ARCHIVED_RULE_SUFFIX[archived];
	const entries = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder);
	const byPath = new Map(entries.map((e) => [e.path, e]));
	const notes = getNotesForSelection(entries, selection, archived).flatMap((n) => {
		const entry = byPath.get(n.path);
		return entry ? [toLensNote(entry, ctx.vaultPath)] : [];
	});
	return { label, rule, notes };
}

/**
 * Lists a note's neighbourhood in groups: the note itself, then the notes its
 * wikilinks resolve to (link order), the notes linking to it (newest change
 * first), then its `_belongs_to`, `_related_to`, `_has_many` and other
 * wikilink-bearing frontmatter fields (field order). Every group shows, empty
 * or not. Links resolve over the snapshot's paths like the graph view, so
 * broken links and non-note targets are left out; each group lists a note
 * once and never the note itself. Frontmatter wikilinks are links too, as in
 * Rust's backlinks. Nothing is excluded by folder or lifecycle: the rule is
 * "everything linked to it". The linked groups leave type definitions and
 * `.view` files out (`isListableNote`); "This note" lists the note even when
 * it is a type definition, as the lens's subject. Null when the note is not
 * in the snapshot.
 */
function resolveNeighbourhoodLens(lens: Lens, ctx: LensContext): ResolvedLens | null {
	const note = lens.target ? ctx.entries.find((e) => e.path === lens.target) : undefined;
	if (!note) return null;
	const cache = buildResolutionCache(ctx.entries.map((e) => e.path));
	const byPath = new Map(ctx.entries.map((e) => [e.path, e] as const));
	const linked = (targets: readonly string[]): LensNote[] => {
		const paths = new Set<string>();
		for (const target of targets) {
			const path = resolveWikilinkCached(target, cache, ctx.vaultPath);
			if (path && path !== note.path) paths.add(path);
		}
		return [...paths].flatMap((path) => {
			const entry = byPath.get(path);
			return entry && isListableNote(entry) ? [toLensNote(entry, ctx.vaultPath)] : [];
		});
	};
	const backlinks = ctx.entries
		.filter((e) => e.path !== note.path && isListableNote(e) && e.outgoingLinks.some((l) => resolveWikilinkCached(l.target, cache, ctx.vaultPath) === note.path))
		.sort((a, b) => b.modifiedAt - a.modifiedAt || a.title.localeCompare(b.title))
		.map((e) => toLensNote(e, ctx.vaultPath));
	const groups: LensGroup[] = [
		{ id: 'note', label: 'This note', notes: [toLensNote(note, ctx.vaultPath)] },
		{ id: 'outgoing', label: 'Outgoing links', notes: linked(note.outgoingLinks.map((l) => l.target)) },
		{ id: 'backlinks', label: 'Backlinks', notes: backlinks },
		{ id: 'belongs-to', label: 'Belongs to', notes: linked(note.belongsTo) },
		{ id: 'related-to', label: 'Related to', notes: linked(note.relatedTo) },
		{ id: 'has-many', label: 'Has many', notes: linked(note.hasMany) },
		{ id: 'other', label: 'Other relationships', notes: linked(Object.values(note.relationships).flat()) },
	];
	const unique = new Map(groups.flatMap((g) => g.notes).map((n) => [n.path, n] as const));
	return { label: note.title, rule: `${note.title} and everything linked to it`, notes: [...unique.values()], groups };
}

/**
 * Turns a lens into the note list's label, rule and notes. Inbox, Today,
 * Favorites, Archive, Type, Untyped, Folder and Neighbourhood are built in; any other kind goes to the
 * provider registered for it. Returns null when no provider knows the kind,
 * the provider cannot resolve the target, a type lens has no target, a
 * folder lens's folder is not in the tree, or a neighbourhood's note is not
 * in the snapshot. `archived` picks which notes a Type or Untyped lens lists
 * by lifecycle; every other kind ignores it.
 */
export function resolveLens(
	lens: Lens,
	ctx: LensContext,
	providers: readonly RailLensProvider[] = [],
	archived: ArchivedFilter = 'active',
): ResolvedLens | null {
	const builtIn = BUILT_IN_LENSES.get(lens.kind);
	if (builtIn) return resolveBuiltIn(builtIn, ctx);
	if (lens.kind === TODAY_LENS_KIND) return resolveTodayLens(lens, ctx);
	if (lens.kind === TYPES_LENS.kind || lens.kind === UNTYPED_LENS.kind) return resolveTypeLens(lens, ctx, archived);
	if (lens.kind === FOLDER_LENS_KIND) return resolveFolderLens(lens, ctx);
	if (lens.kind === NEIGHBOURHOOD_LENS_KIND) return resolveNeighbourhoodLens(lens, ctx);
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider ? provider.resolve(lens, ctx) : null;
}

/**
 * True when a lens's list comes from the entries snapshot, so before the first
 * snapshot it would say it is empty. Every kind reads it (Today's plugin
 * sections and a provider's `LensContext.entries` too) except a folder lens,
 * which lists the file tree. A view lens has its own rule, `viewEntriesLoaded`.
 */
export function lensListsEntries(lens: Lens): boolean {
	return lens.kind !== FOLDER_LENS_KIND;
}

/**
 * Whether this vault's entries have landed, for a `.view`'s row set
 * (`viewRowSet` drops a record with no entry). True for a vault with no notes.
 * The version starts at 0 and every write of the entries bumps it, an empty
 * snapshot included. A refresh left over from the previous vault can land after
 * teardown reset the version, and until the new scan commits Rust answers it
 * with that vault for the entries and the records alike, so the two sharing a
 * path says nothing: one entry must also sit under this vault. Not for a
 * built-in lens, which reads only the entries: a failed read of the records
 * would hold it back.
 */
export function viewEntriesLoaded(
	store: { readonly entries: readonly { path: string }[]; readonly entriesVersion: number },
	propertyIndex: ReadonlyMap<string, unknown>,
	vaultPath: string | null,
): boolean {
	if (store.entriesVersion === 0) return false;
	if (store.entries.length === 0) return true;
	if (!vaultPath) return false;
	const prefix = `${vaultRoot(vaultPath)}/`;
	return store.entries.some((e) => e.path.startsWith(prefix) && propertyIndex.has(e.path));
}

/**
 * The Types navigator's rows: the visible types in sidebar order, each with the
 * number of notes its lens lists, then Untyped when `showUntyped` is on. The
 * counts come from `buildTypeSections`, which applies the same not-archived
 * rule over the same system-folder-excluded entries. A type row notes the
 * reserved keys its definition sets to a value that is ignored
 * (`ignoredKeyNotes`), read from the definition's entry in `ctx.entries`, so a
 * definition in the system folder is read too.
 */
export function typeNavigatorRows(
	ctx: Pick<LensContext, 'entries' | 'vaultPath' | 'systemFolder' | 'typeMetadataMap'>,
	showUntyped: boolean,
): TypeNavigatorRow[] {
	const entries = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder);
	const { sections, untyped } = buildTypeSections(entries, ctx.typeMetadataMap, 'all');
	const byPath = new Map(ctx.entries.map((e) => [e.path, e] as const));
	const rows: TypeNavigatorRow[] = sections.map((s) => {
		const definition = s.metadata.path ? byPath.get(s.metadata.path) : undefined;
		return {
			lens: { kind: TYPES_LENS.kind, target: s.metadata.name },
			label: s.metadata.sidebarLabel,
			count: s.notes.length,
			typeName: s.metadata.name,
			definitionPath: s.definitionPath,
			opensInEditor: false,
			keyNotes: definition ? ignoredKeyNotes(definition.frontmatter) : [],
			group: null,
		};
	});
	if (showUntyped) {
		rows.push({ lens: { ...UNTYPED_LENS }, label: 'Untyped', count: untyped.length, typeName: null, definitionPath: null, opensInEditor: false, keyNotes: [], group: null });
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
 * The layout change that drops a saved Types pick that no longer exists (a
 * view gone from the tree, a deleted type, or Untyped with untyped notes
 * hidden): the pick is cleared and, when the Types item is active, the rail
 * goes back to the default item. A view pick is checked against `viewPaths`,
 * every `.view` in the tree, so a view hidden from Views (`_visible: false`)
 * stays picked; a type or Untyped pick is checked against the rows. Null when
 * there is nothing to fix. Meant to run once the entries of a newly opened
 * vault have loaded, not on every refresh: the refresh is throttled, so a type
 * just created or renamed is missing for a few seconds.
 */
export function staleTypesPickFix(
	railItem: unknown,
	saved: unknown,
	rows: readonly TypeNavigatorRow[],
	viewPaths: readonly string[],
): Pick<Partial<LayoutSettings>, 'railItem' | 'railTypesLens'> | null {
	const pick = parseTypesPick(saved);
	if (!pick) return null;
	if (pick.kind === VIEW_LENS_KIND ? viewPaths.includes(pick.target ?? '') : rows.some((r) => sameLens(r.lens, pick))) return null;
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
 * when it turns ready, so neither counts.
 */
export function stepTypesPickCheck(
	prev: TypesPickCheck,
	now: { vaultPath: string | null; indexReady: boolean; entriesVersion: number },
): { next: TypesPickCheck; run: boolean } {
	if (!now.vaultPath) return { next: INITIAL_TYPES_PICK_CHECK, run: false };
	if (now.vaultPath !== prev.vaultPath || !now.indexReady) {
		return { next: { vaultPath: now.vaultPath, armed: !now.indexReady, readyAtVersion: null, done: false }, run: false };
	}
	if (!prev.armed || prev.done) return { next: prev, run: false };
	if (prev.readyAtVersion === null) return { next: { ...prev, readyAtVersion: now.entriesVersion }, run: false };
	if (now.entriesVersion > prev.readyAtVersion) return { next: { ...prev, done: true }, run: true };
	return { next: prev, run: false };
}

/**
 * The one lens-to-new-note rule behind "+ New here". Inbox and Favorites create
 * a plain note where Cmd+N puts one, marked `_organized: false` or
 * `_favorite: true`; Today creates one there dated by the lens's day, or by
 * the creation instant before it has one (`date: <today>`), so the note lands
 * in the list shown even in the clock's lag after midnight; Untyped creates a plain note there with no frontmatter; a
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
	if (lens.kind === TODAY_LENS_KIND) return plainNote({ date: todayLensDay(lens) ?? ctx.now.format('YYYY-MM-DD') });
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
 * The Views part of the Types navigator: every `.view` file in the tree but
 * the hidden ones (`_visible: false`), labelled by its `_sidebar_label`,
 * marked to open in the editor by its `_open_in_editor`, with a note for each
 * reserved key it ignores. The ungrouped views come first, then each `_group`
 * in natural order of its name (compared exactly, so "work" and "Work" are two
 * groups); inside each part the views go by `_order`, then label, then path
 * (`sortViewFiles`). Counts are null: they need each view's query run
 * (`countViewNotes`).
 */
export function viewNavigatorRows(tree: FileTreeNode[], entriesByPath: Map<string, NoteEntryV2>): TypeNavigatorRow[] {
	const rows: TypeNavigatorRow[] = [];
	for (const v of sortViewFiles(collectViewFiles(tree), entriesByPath)) {
		const entry = entriesByPath.get(v.path);
		if (!getViewVisible(entry)) continue;
		rows.push({
			lens: { kind: VIEW_LENS_KIND, target: v.path },
			label: getViewLabel(entry, v.name),
			count: null,
			typeName: null,
			definitionPath: null,
			opensInEditor: getViewOpensInEditor(entry),
			keyNotes: entry ? ignoredKeyNotes(entry.frontmatter) : [],
			group: getViewGroup(entry),
		});
	}
	// Array.sort is stable: rows of one group keep their `sortViewFiles` order.
	return rows.sort((a, b) => {
		if (a.group === b.group) return 0;
		if (a.group === null) return -1;
		if (b.group === null) return 1;
		return naturalCompare(a.group, b.group);
	});
}

/**
 * The label of every `.view` in the tree, hidden ones included, except the
 * one at `exceptPath`: the names New view refuses, and Edit view with the
 * edited view's path, so it may keep its own label.
 */
export function viewLabels(tree: FileTreeNode[], entriesByPath: Map<string, NoteEntryV2>, exceptPath?: string): string[] {
	return collectViewFiles(tree)
		.filter((v) => v.path !== exceptPath)
		.map((v) => getViewLabel(entriesByPath.get(v.path), v.name));
}

/** The Sort and Filter toolbar state that replaces a view's saved filters and sort. */
export interface ViewQueryOverrides {
	/** Filters over every view of the `.view` (its top-level `filters`) */
	globalFilters: FilterGroup[];
	/** Filters of the view the rail runs (`railViewIndex`) */
	viewFilters: FilterGroup[];
	/** Sort of the view the rail runs; empty keeps the saved sort */
	sort: SortDef[];
}

/** What a `.view`'s row set reads besides the matched records. */
export type ViewRowContext = Pick<LensContext, 'entries' | 'vaultPath' | 'systemFolder'>;

/**
 * The one row set of a `.view` view, which the editor (through the collection
 * row-set port), the rail's view lens and the navigator count all use. Takes
 * the records the view's query matched (filters and the view's own sort
 * applied, `limit` not yet), keeps those whose entry is listable (not in the
 * system folder, neither a type definition nor a `.view`, and not archived
 * unless the query's filters cite archived: `queryCitesArchived`), orders
 * them (`resolveViewListSort`: the view's own sort keeps the query order and
 * applies no pins, else its `_sort` or the default, with `_order` pins on top)
 * and last applies `limit`. A record with no entry is dropped. `view` and
 * `definition` are the ones the query ran, toolbar overrides included.
 */
export function viewRowSet<T extends { path: string }>(
	records: readonly T[],
	view: CollectionViewDef,
	viewPath: string,
	ctx: ViewRowContext,
	definition: CollectionDefinition,
): T[] {
	const viewEntry = ctx.entries.find((e) => e.path === viewPath);
	const listable = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder).filter(isListableNote);
	const byPath = new Map(records.map((r) => [r.path, r]));
	const sort = resolveViewListSort(view, getViewSort(viewEntry));
	const includeArchived = queryCitesArchived(definition, view);
	const rows = getNotesForViewPaths(listable, new Set(byPath.keys()), sort, includeArchived).flatMap((n) => {
		const record = byPath.get(n.path);
		return record ? [record] : [];
	});
	return view.limit !== undefined && view.limit > 0 ? rows.slice(0, view.limit) : rows;
}

/** What an inline `collection` block's row set reads besides the matched records. */
export type BlockRowContext = Pick<LensContext, 'vaultPath' | 'systemFolder'>;

/**
 * The row set of an inline ` ```collection ` block: `viewRowSet`'s rule read
 * from the records alone. Takes the records the block's query matched
 * (filters and the view's own sort applied, `limit` not yet), drops those in
 * the system folder, `.view` files, type definitions (`_type: Type`) and
 * archived notes unless the query's filters cite archived
 * (`queryCitesArchived`), then applies `limit`. Records, not entries: the
 * entries land seconds after a save, so a just-created note would be missing
 * when the block refetches. Keeps the query order (no `_sort`, no pins).
 */
export function blockRowSet<T extends Pick<PropertyIndexRecord, 'path' | 'properties'>>(
	records: readonly T[],
	view: CollectionViewDef,
	definition: CollectionDefinition,
	ctx: BlockRowContext,
): T[] {
	const includeArchived = queryCitesArchived(definition, view);
	const rows = excludeSystemFolder([...records], ctx.vaultPath, ctx.systemFolder).filter(
		(r) =>
			!isViewFile(r.path) &&
			r.properties.get('_type') !== 'Type' &&
			(includeArchived || r.properties.get('archived') !== true),
	);
	return view.limit !== undefined && view.limit > 0 ? rows.slice(0, view.limit) : rows;
}

/**
 * Whether a view's query, its global or its own filters, cites archived
 * (`filterCitesArchived`), which lets the filters decide on archived notes
 * instead of the row set leaving them out.
 */
function queryCitesArchived(definition: CollectionDefinition, view: CollectionViewDef): boolean {
	return filterCitesArchived(definition.filters) || filterCitesArchived(view.filters);
}

/** A view's query, run. */
export interface ViewQueryResult {
	/** The view's row set (`viewRowSet`), in display order */
	paths: string[];
	/** The view as run, its sort included */
	view: CollectionViewDef;
	/** The global then view filter groups the query ran with */
	filterGroups: FilterGroup[];
	/** True when those filters cite archived, so the row set kept the archived notes they match */
	includesArchived: boolean;
	/** Number of views the `.view` holds; only the one at `railViewIndex` runs */
	viewCount: number;
	/** The view's name when `_rail_view` named the view that ran, else null (the first view ran by default) */
	railViewName: string | null;
	/** Why the filters could not run (`QueryResult.filterError`); `paths` is then empty */
	filterError?: string;
}

/**
 * Runs the view the rail runs (`railViewIndex`: the one `_rail_view` names,
 * else the first) of a parsed `.view` over the property index, with the
 * toolbar overrides when given (else its saved filters and sort), and keeps
 * its row set (`viewRowSet`). Null when the definition has no view.
 */
export function queryViewLens(
	definition: CollectionDefinition,
	overrides: ViewQueryOverrides | null,
	propertyIndex: Map<string, PropertyIndexRecord>,
	viewPath: string,
	ctx: ViewRowContext,
): ViewQueryResult | null {
	const view = definition.views[railViewIndex(definition)];
	const state = overrides ?? seedToolbarStateFromDefinition(definition, view);
	const query = buildOverriddenQuery(definition, view, state.globalFilters, state.viewFilters, state.sort);
	if (!query) return null;
	const { records, filterError } = executeQuery(query.definition, query.view, propertyIndex, (matched, v, d) =>
		viewRowSet(matched, v, viewPath, ctx, d),
	);
	return {
		paths: records.map((r) => r.path),
		view: query.view,
		filterGroups: [...state.globalFilters, ...state.viewFilters],
		includesArchived: queryCitesArchived(query.definition, query.view),
		viewCount: definition.views.length,
		railViewName: view.name === definition.railView ? view.name : null,
		filterError,
	};
}

/** Where a view lens's load got to: a status that has no list, or its query run. */
export type ViewLoad = ViewLensStatus | { kind: 'ran'; result: ViewQueryResult };

/** The load of a query run: `ran`, or an error when the definition has no view to run (`queryViewLens` gave null). */
export function viewLoadFromQuery(result: ViewQueryResult | null): ViewLoad {
	return result ? { kind: 'ran', result } : { kind: 'error', message: 'The .view has no views to run' };
}

/** The load of a `.view` whose read threw. */
export function viewReadError(err: unknown): ViewLoad {
	return { kind: 'error', message: `Could not read the view: ${err instanceof Error ? err.message : String(err)}` };
}

/**
 * Turns a view's load into the note list: the view's label, its filters in
 * words (ending in `view "<name>"` when `_rail_view` named the view that ran,
 * else in "first view" when the `.view` holds more than one view),
 * and the notes of its row set (`viewRowSet`, which `queryViewLens` already
 * kept and ordered), in that order. The label comes from the view's own
 * `.view` entry. A load that did not run, or ran into a filter that does not
 * parse (`filterError`), lists nothing and carries that `status`.
 */
export function resolveViewLens(viewPath: string, load: ViewLoad, ctx: LensContext): ResolvedLens {
	const viewEntry = ctx.entries.find((e) => e.path === viewPath);
	const label = getViewLabel(viewEntry, getFileName(viewPath).replace(/\.view$/i, ''));
	if (load.kind !== 'ran') return { label, rule: '', notes: [], status: load };
	const result = load.result;
	if (result.filterError !== undefined) return { label, rule: '', notes: [], status: { kind: 'error', message: result.filterError } };
	const byPath = new Map(ctx.entries.map((e) => [e.path, e]));
	const notes = result.paths.flatMap((path) => {
		const entry = byPath.get(path);
		return entry ? [toLensNote(entry, ctx.vaultPath)] : [];
	});
	const rule = describeViewFilters(result.filterGroups, result.includesArchived);
	const which = result.railViewName !== null ? `view "${result.railViewName}"` : result.viewCount > 1 ? 'first view' : null;
	return { label, rule: which ? `${rule}, ${which}` : rule, notes };
}

/**
 * A view's filter groups in words, e.g. "_type == 'Project' and status ==
 * 'active', not archived". `includesArchived` (the filters cite archived)
 * drops ", not archived", as the filters then decide on archived notes.
 */
export function describeViewFilters(groups: readonly FilterGroup[], includesArchived = false): string {
	const parts = groups.flatMap((g) => {
		const rows = g.rows.map(filterRowToExpression);
		if (rows.length === 0) return [];
		if (g.conjunction === 'not') return rows.map((r) => `not ${r}`);
		if (g.conjunction === 'or') return [rows.length > 1 ? `(${rows.join(' or ')})` : rows[0]];
		return rows;
	});
	const rule = parts.length > 0 ? parts.join(' and ') : 'every note';
	return includesArchived ? rule : `${rule}, not archived`;
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
		archived: false,
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
 * The layout change that makes a saved Types pick follow a path change: a
 * view pick whose `.view`, or a folder holding it, was renamed or moved takes
 * the new path; one that went to the Trash (`to` null) or stopped being a
 * `.view` is cleared, so the Types item shows its first row. Null when nothing
 * changes.
 */
export function followTypesPickPathChange(
	saved: unknown,
	from: string,
	to: string | null,
): Pick<Partial<LayoutSettings>, 'railTypesLens'> | null {
	const pick = parseTypesPick(saved);
	if (pick?.kind !== VIEW_LENS_KIND || !pick.target) return null;
	if (pick.target !== from && !pick.target.startsWith(from + '/')) return null;
	const moved = to === null ? null : to + pick.target.slice(from.length);
	return { railTypesLens: moved !== null && isViewFile(moved) ? { kind: VIEW_LENS_KIND, target: moved } : null };
}

/**
 * The layout change that makes the rail follow a path change: a pinned view
 * the rail shows whose `.view`, or a folder holding it, was renamed or moved
 * stays on that pin at the new path; one that went to the Trash (`to` null) or
 * stopped being a `.view` sends the rail back to the default item. Null when
 * nothing changes.
 */
export function followRailPinPathChange(railItem: unknown, from: string, to: string | null): Pick<Partial<LayoutSettings>, 'railItem'> | null {
	if (typeof railItem !== 'string' || !railItem.startsWith(VIEW_PIN_PREFIX)) return null;
	const path = railItem.slice(VIEW_PIN_PREFIX.length);
	if (path !== from && !path.startsWith(from + '/')) return null;
	const moved = to === null ? null : to + path.slice(from.length);
	return { railItem: moved !== null && isViewFile(moved) ? viewPinKey(moved) : DEFAULT_RAIL_ITEM };
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
