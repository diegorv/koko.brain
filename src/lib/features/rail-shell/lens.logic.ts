import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { noteDateKey } from '#lib/utils/note-date.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
import type { Lens, LensContext, LensNote, NewNoteContext, NewNoteRule, RailLensProvider, ResolvedLens } from './rail-shell.types';

/** The Inbox rail item's lens. */
export const INBOX_LENS: Lens = { kind: 'inbox' };

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
		italic: !entry.organized,
	};
}

function resolveInbox(ctx: LensContext): ResolvedLens {
	const notes = excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder)
		.filter(isInboxEntry)
		.sort((a, b) => b.modifiedAt - a.modifiedAt || a.title.localeCompare(b.title))
		.map((e) => toLensNote(e, ctx.vaultPath));
	return { label: 'Inbox', rule: 'not organized, not archived', notes };
}

/**
 * Turns a lens into the note list's label, rule and notes. Inbox is built in;
 * any other kind goes to the provider registered for it. Returns null when no
 * provider knows the kind or the provider cannot resolve the target.
 */
export function resolveLens(lens: Lens, ctx: LensContext, providers: readonly RailLensProvider[] = []): ResolvedLens | null {
	if (lens.kind === INBOX_LENS.kind) return resolveInbox(ctx);
	const provider = providers.find((p) => p.kind === lens.kind);
	return provider ? provider.resolve(lens, ctx) : null;
}

/**
 * The one lens-to-new-note rule behind "+ New here". The Inbox creates a plain
 * note where Cmd+N puts one, marked `_organized: false`; any other kind uses
 * its provider's `newNote`. Returns null (no button) without a vault, or when
 * the kind has no creation rule.
 */
export function newNoteRule(lens: Lens, ctx: NewNoteContext, providers: readonly RailLensProvider[] = []): NewNoteRule | null {
	if (!ctx.vaultPath) return null;
	if (lens.kind === INBOX_LENS.kind) {
		return {
			folder: buildCaptureFolder(ctx.vaultPath, ctx.captureBaseFolder, ctx.captureFolderFormat, ctx.now),
			frontmatter: { _organized: false },
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
