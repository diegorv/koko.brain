import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { LayoutSettings } from '#lib/core/settings/settings.types.js';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { noteDateKey } from '#lib/utils/note-date.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { getTypeMetadataFallback } from '#lib/features/type-definitions/type-definitions.logic.js';
import {
	buildTypeSections,
	excludeSystemFolder,
	getNotesForSelection,
	type TypeSidebarSelection,
} from '#lib/features/type-definitions/type-sidebar.logic.js';
import type {
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

/** The rail item shown when nothing valid is saved. */
export const DEFAULT_RAIL_ITEM = 'inbox';

/** The rail item that opens the Types navigator. */
export const TYPES_RAIL_ITEM = 'types';

/** Each built-in rail item key and the lens it sets. */
const RAIL_ITEM_LENSES = new Map<string, Lens>([
	[DEFAULT_RAIL_ITEM, INBOX_LENS],
	['favorites', FAVORITES_LENS],
	[TYPES_RAIL_ITEM, TYPES_LENS],
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
 * Archive, Type and Untyped are built in; any other kind goes to the provider
 * registered for it. Returns null when no provider knows the kind, the
 * provider cannot resolve the target, or a type lens has no target.
 */
export function resolveLens(lens: Lens, ctx: LensContext, providers: readonly RailLensProvider[] = []): ResolvedLens | null {
	const builtIn = BUILT_IN_LENSES.get(lens.kind);
	if (builtIn) return resolveBuiltIn(builtIn, ctx);
	if (lens.kind === TYPES_LENS.kind || lens.kind === UNTYPED_LENS.kind) return resolveTypeLens(lens, ctx);
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
 * from settings.json, so anything but a type lens with a name or the Untyped
 * lens reads as no pick.
 */
export function parseTypesPick(saved: unknown): Lens | null {
	if (typeof saved !== 'object' || saved === null) return null;
	const { kind, target } = saved as { kind?: unknown; target?: unknown };
	if (kind === UNTYPED_LENS.kind) return { ...UNTYPED_LENS };
	if (kind === TYPES_LENS.kind && typeof target === 'string' && target) return { kind, target };
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
 * lists (a deleted type, or Untyped with untyped notes hidden): the pick is
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
 * type lens creates a note of its type; Archive creates nothing; any other
 * kind uses its provider's `newNote`. Returns null (no button) without a
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
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider?.newNote?.(lens, ctx) ?? null;
}

/** The new note's initial content: the rule's frontmatter block, or empty when it sets none. */
export function newNoteContent(rule: PlainNewNoteRule): string {
	const keys = Object.entries(rule.frontmatter);
	if (keys.length === 0) return '';
	return `---\n${keys.map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n`;
}
