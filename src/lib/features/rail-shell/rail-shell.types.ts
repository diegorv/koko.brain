import type { Component } from 'svelte';
import type { Dayjs } from 'dayjs';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
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
	/** The vault's file tree (`fsStore.fileTree`), which the folder lens lists */
	fileTree: FileTreeNode[];
}

/** The kind of a listed file, which picks its row icon. */
export type FileKind = 'markdown' | 'canvas' | 'kanban' | 'view' | 'collection' | 'pdf' | 'image' | 'other';

/** A note as the rail note list shows it. */
export interface LensNote extends NoteRowNote {
	/** The note's type (`isA`), or null for an untyped note */
	isA: string | null;
	/** Type, relative modified time and folder, joined for the row's second line */
	subtitle: string;
	/** Inbox notes (not organized, not archived, not a type definition) render in italics */
	italic: boolean;
	/** The file's kind; only the folder lens lists anything but markdown */
	kind: FileKind;
}

/** A titled group of a lens's notes, shown under its own header (e.g. Today's notes). */
export interface LensGroup {
	/** Stable id, e.g. `pinned` */
	id: string;
	/** Group header label */
	label: string;
	/** The group's notes, in display order */
	notes: LensNote[];
}

/** A lens turned into what the note list shows. */
export interface ResolvedLens {
	/** Header label, e.g. "Inbox" */
	label: string;
	/** The lens rule in plain words, shown under the label */
	rule: string;
	/** The notes to list, in display order; with `groups`, each grouped note once, in group order */
	notes: LensNote[];
	/** When set, the list shows these groups under headers instead of `notes` as one list */
	groups?: LensGroup[];
	/** Why a view lens has no list to show (`notes` is then empty); absent for a view that ran and for every other lens */
	status?: ViewLensStatus;
}

/** Why a view lens cannot show its list. */
export type ViewLensStatus =
	/** The property index is not ready yet */
	| { kind: 'loading' }
	/** The `.view` is no longer in the file tree */
	| { kind: 'missing' }
	/** The `.view` could not be read or parsed, or its filter does not parse */
	| { kind: 'error'; message: string };

/** A row of the Types navigator: a view, a type, or Untyped. */
export interface TypeNavigatorRow {
	/** The lens a click on the row picks */
	lens: Lens;
	/** Row label: the view's or type's sidebar label, or "Untyped" */
	label: string;
	/** Number of notes the row's lens lists; null for a view, whose count needs its query run */
	count: number | null;
	/** The type's name, or null for a view and Untyped */
	typeName: string | null;
	/** Absolute path of the type's definition note, or null when it has none (and for a view and Untyped) */
	definitionPath: string | null;
	/** True for a view whose `_open_in_editor` is true: a click opens the `.view` in the editor instead of picking its lens. Always false for a type and Untyped */
	opensInEditor: boolean;
	/** The reserved keys the view, or the type's definition, sets to a value that is ignored (`ignoredKeyNotes`), shown in the row's mark tooltip. Empty for Untyped and a type without a definition */
	keyNotes: string[];
	/** The view's trimmed `_group`, the subheading it is listed under in Views; null for an ungrouped view, a type and Untyped */
	group: string | null;
}

/** A `.view` or a type definition pinned to the rail with `_rail: true`. */
export interface RailPin {
	/** The rail item key saved in `layout.railItem`: `view:<absolute path>` or `type:<type name>` */
	key: string;
	/** Tooltip and accessible name: the view's `getViewLabel` or the type's `sidebarLabel` */
	label: string;
	/** Absolute path of the `.view` or of the type definition, which picks the icon */
	path: string;
	/** What the pin opens */
	kind: 'view' | 'type';
	/** True for a view whose `_open_in_editor` is true: a click opens the `.view` in the editor instead of picking its lens */
	opensInEditor: boolean;
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
	/** For a view lens: the one type its filters require (`viewNoteType`), or null; other kinds ignore it */
	viewTypeName?: string | null;
}

/** Resolves one lens kind; registered by the plugin that owns the kind. */
export interface RailLensProvider {
	/** The `Lens.kind` this provider resolves */
	kind: string;
	/** Returns null when the lens target no longer exists */
	resolve: (lens: Lens, ctx: LensContext) => ResolvedLens | null;
	/** "+ New here" rule for the kind; leave it out (or return null) and the button is hidden */
	newNote?: (lens: Lens, ctx: NewNoteContext) => NewNoteRule | null;
	/** An extra note list header button for the kind (e.g. a day's Daily note) */
	headerAction?: RailHeaderAction;
}

/** A note list header button a lens provider adds. */
export interface RailHeaderAction {
	/** Accessible name of the icon button (its `aria-label`) */
	label: string;
	/** Button tooltip */
	title: string;
	/** Button icon */
	icon: Component;
	/** The toast shown when `run` rejects */
	failureMessage: string;
	/** Runs the action for the shown lens; rejects on failure */
	run: (lens: Lens) => Promise<void>;
}

/** A navigator panel a plugin adds to the rail shell (e.g. the Calendar navigator). */
export interface RailNavigator {
	/** Unique id, also the rail item key */
	id: string;
	/** Rail button tooltip and accessible name */
	label: string;
	/** Rail button icon */
	icon: Component;
	/** The panel shown between the rail and the note list; it reads and saves its own pick */
	component: Component;
	/** The lens the navigator's pick sets now; read in a reactive context, so it follows the pick */
	lens: () => Lens;
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

/** A "New <thing>" item a plugin adds to the Files navigator's folder menu (e.g. New Kanban Board). */
export interface RailFolderCreator {
	/** Unique id */
	id: string;
	/** Menu item label */
	label: string;
	/** Menu item icon */
	icon: Component;
	/** The file name the item creates before dedupe, named in the failure toast */
	fileName: string;
	/** Creates the file in `dir` and returns its path; rejects on failure */
	create: (dir: string) => Promise<string>;
}
