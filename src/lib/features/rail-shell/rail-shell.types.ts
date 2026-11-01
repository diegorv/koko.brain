import type { Component } from 'svelte';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { NoteRowNote } from '#lib/features/note-list/note-row.types.js';

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
}

/** A note as the rail note list shows it. */
export interface LensNote extends NoteRowNote {
	/** The note's type (`isA`), or null for an untyped note */
	isA: string | null;
	/** Type, note date and folder, joined for the row's second line */
	subtitle: string;
	/** Inbox notes (not organized) render in italics */
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

/** Resolves one lens kind; registered by the plugin that owns the kind. */
export interface RailLensProvider {
	/** The `Lens.kind` this provider resolves */
	kind: string;
	/** Returns null when the lens target no longer exists */
	resolve: (lens: Lens, ctx: LensContext) => ResolvedLens | null;
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
