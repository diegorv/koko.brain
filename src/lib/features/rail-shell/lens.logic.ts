import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { noteDateKey } from '#lib/utils/note-date.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
import type { Lens, LensContext, LensNote, NewNoteContext, NewNoteRule, RailLensProvider, ResolvedLens } from './rail-shell.types';

/** The Inbox rail item's lens. */
export const INBOX_LENS: Lens = { kind: 'inbox' };

/** The Favorites rail item's lens. */
export const FAVORITES_LENS: Lens = { kind: 'favorites' };

/** The Archive rail item's lens. */
export const ARCHIVE_LENS: Lens = { kind: 'archive' };

/** The rail item shown when nothing valid is saved. */
export const DEFAULT_RAIL_ITEM = 'inbox';

/** Each built-in rail item key and the lens it sets. */
const RAIL_ITEM_LENSES = new Map<string, Lens>([
	[DEFAULT_RAIL_ITEM, INBOX_LENS],
	['favorites', FAVORITES_LENS],
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
	newNote?: NewNoteRule['frontmatter'];
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
 * Turns a lens into the note list's label, rule and notes. Inbox, Favorites and
 * Archive are built in; any other kind goes to the provider registered for it.
 * Returns null when no provider knows the kind or the provider cannot resolve
 * the target.
 */
export function resolveLens(lens: Lens, ctx: LensContext, providers: readonly RailLensProvider[] = []): ResolvedLens | null {
	const builtIn = BUILT_IN_LENSES.get(lens.kind);
	if (builtIn) return resolveBuiltIn(builtIn, ctx);
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider ? provider.resolve(lens, ctx) : null;
}

/**
 * The one lens-to-new-note rule behind "+ New here". Inbox and Favorites create
 * a plain note where Cmd+N puts one, marked `_organized: false` or
 * `_favorite: true`; Archive creates nothing; any other kind uses its
 * provider's `newNote`. Returns null (no button) without a vault, or when the
 * kind has no creation rule.
 */
export function newNoteRule(lens: Lens, ctx: NewNoteContext, providers: readonly RailLensProvider[] = []): NewNoteRule | null {
	if (!ctx.vaultPath) return null;
	const builtIn = BUILT_IN_LENSES.get(lens.kind);
	if (builtIn) {
		if (!builtIn.newNote) return null;
		return {
			folder: buildCaptureFolder(ctx.vaultPath, ctx.captureBaseFolder, ctx.captureFolderFormat, ctx.now),
			frontmatter: { ...builtIn.newNote },
		};
	}
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider?.newNote?.(lens, ctx) ?? null;
}

/** The new note's initial content: the rule's frontmatter block, or empty when it sets none. */
export function newNoteContent(rule: NewNoteRule): string {
	const keys = Object.entries(rule.frontmatter);
	if (keys.length === 0) return '';
	return `---\n${keys.map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n`;
}
