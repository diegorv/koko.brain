import type { Component } from 'svelte';
import type { Dayjs } from 'dayjs';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';
import type { TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';

/**
 * What the user picked on the left: a rail item, a navigator entry or a
 * note's neighbourhood. Plain data, so a later ticket can persist it.
 */
export interface Lens {
	/** Lens kind, e.g. `inbox`, or a kind a plugin registered (`day`, ...) */
	kind: string;
	/** What the kind narrows to: a folder path, type name, view path or day */
	target?: string;
}

/** The snapshot a lens resolves against. */
export interface LensContext {
	/** The vault entries snapshot (system folder not yet excluded) */
	entries: NoteEntryV2[];
	/** Absolute vault path, or null when no vault is open */
	vaultPath: string | null;
	/** Vault-relative system folder (templates, type definitions); blank disables the exclusion */
	systemFolder: string;
	/** Type name -> metadata from the type definitions (labels, order, visibility) */
	typeMetadataMap: Map<string, TypeMetadata>;
}

/** A note as the rail note list shows it. */
export interface LensNote extends NoteRowNote {
	/** The note's type (`isA`), or null for an untyped note */
	isA: string | null;
	/** Type, note date and folder, joined for the row's second line */
	subtitle: string;
	/** Inbox notes (not organized, not archived, not a type definition) render in italics */
	italic: boolean;
}

/** A lens turned into what the note list shows. */
export interface ResolvedLens {
	/** Header label, e.g. "Inbox" */
	label: string;
	/** The lens rule in plain words, shown under the label */
	rule: string;
	/** The notes to list, in display order */
	notes: LensNote[];
}

/** A row of the Types navigator: a type, or Untyped. */
export interface TypeNavigatorRow {
	/** The lens a click on the row picks */
	lens: Lens;
	/** Row label: the type's sidebar label, or "Untyped" */
	label: string;
	/** Number of notes the row's lens lists */
	count: number;
	/** The type's name, or null for Untyped */
	typeName: string | null;
	/** Absolute path of the type's definition note, or null when it has none (and for Untyped) */
	definitionPath: string | null;
}

/** A plain "+ New here" note: where it goes and the frontmatter it inherits. */
export interface PlainNewNoteRule {
	/** Absolute folder the note is created in (created when missing) */
	folder: string;
	/** Frontmatter keys the new note starts with, e.g. `_organized: false` */
	frontmatter: Record<string, string | boolean>;
}

/** A "+ New here" note of a type: the type's folder, dedupe and template decide the rest. */
export interface TypedNewNoteRule {
	/** Type name written as `_type`; also picks the type's `_folder` and `_template` */
	typeName: string;
}

/** What "+ New here" creates for a lens. */
export type NewNoteRule = PlainNewNoteRule | TypedNewNoteRule;

/** What a lens's creation rule reads. */
export interface NewNoteContext {
	/** Absolute vault path, or null when no vault is open */
	vaultPath: string | null;
	/** Vault-relative base folder of Cmd+N notes (`periodicNotes.folder`) */
	captureBaseFolder: string;
	/** Dated subfolder format of Cmd+N notes (`quickCapture.folderFormat`) */
	captureFolderFormat: string;
	/** The creation instant, which picks the dated folder */
	now: Dayjs;
}

/** Resolves one lens kind; registered by the plugin that owns the kind. */
export interface RailLensProvider {
	/** The `Lens.kind` this provider resolves */
	kind: string;
	/** Returns null when the lens target no longer exists */
	resolve: (lens: Lens, ctx: LensContext) => ResolvedLens | null;
	/** "+ New here" rule for the kind; leave it out (or return null) and the button is hidden */
	newNote?: (lens: Lens, ctx: NewNoteContext) => NewNoteRule | null;
}

/** A navigator panel a plugin adds to the rail shell (e.g. the Calendar navigator). */
export interface RailNavigator {
	/** Unique id, also the rail item key */
	id: string;
	/** Rail button tooltip and accessible name */
	label: string;
	/** Rail button icon */
	icon: Component;
	/** The panel shown between the rail and the note list */
	component: Component;
}

/** A section a plugin adds to the Today lens (e.g. My people). */
export interface RailTodaySection {
	/** Unique id */
	id: string;
	/** Section heading */
	label: string;
	/** The section body */
	component: Component;
}
