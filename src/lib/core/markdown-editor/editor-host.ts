import { Facet } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { FileEntry } from '#lib/core/filesystem/file-entries.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

/** The `#heading` or `#^block-id` part of a wikilink; both null for a plain link. */
export interface LinkAnchor {
	heading: string | null;
	blockId: string | null;
}

/** What wikilink completion offers: the vault's files and, when asked for, its notes' frontmatter (aliases). */
export interface LinkCandidates {
	files: readonly FileEntry[];
	notes: NoteEntryV2[];
}

/** Options of `EditorHost.createNote`. */
export interface CreateNoteOptions {
	/** Whether a target matching a periodic-note format becomes that periodic note. Default true. */
	periodic?: boolean;
}

/**
 * Everything the markdown editor needs from the app: link resolution, note
 * reads, asset URLs, navigation, note creation and the tag search. The app implements it once
 * and installs it with `editorHost.of(host)` outside every compartment.
 *
 * Call it only from event handlers, `toDOM` and completion sources, never from
 * a StateField `compute` / `update` or a decoration build: the first
 * `resolveLink` after the file tree changes builds an O(N) name index (later
 * calls on the same tree are O(1)), so a call per link per rebuild pays that
 * build on every tree change. The `files` that `listLinkCandidates` returns
 * are shared with that index: read them, never mutate them.
 */
export interface EditorHost {
	/** Absolute path of the note a wikilink target names, or null when nothing matches. */
	resolveLink(target: string): string | null;
	/** Completion candidates. `includeNotes` asks for the note entries too (one IPC on a cold cache). */
	listLinkCandidates(includeNotes: boolean): Promise<LinkCandidates>;
	/** Text content of the note at an absolute path. Rejects when the read fails. */
	readNote(path: string): Promise<string>;
	/** A URL the webview can load for an absolute file path. */
	assetUrl(path: string): string;
	/** Opens the note at an absolute path, scrolled to `anchor` when given. */
	openLink(path: string, anchor?: LinkAnchor): Promise<void>;
	/** Opens an external URL in the system handler. The caller has checked it with `isSafeUrl`. */
	openExternal(url: string): Promise<void>;
	/**
	 * Opens the note a vault-relative target names, creating it first when it
	 * does not exist. A target that matches a periodic-note format becomes that
	 * periodic note, in its folder and from its template, unless
	 * `options.periodic` is false. Resolves `false` when nothing was opened
	 * (no vault, or the creation failed), `true` otherwise.
	 */
	createNote(target: string, anchor?: LinkAnchor, options?: CreateNoteOptions): Promise<boolean>;
	/**
	 * Opens the `.view` at a vault-relative path as a click on its row in the
	 * menu does, also when the view hides its row. Creates nothing. Resolves
	 * `false` when the path is not a file in the vault (or there is no vault),
	 * `true` otherwise.
	 */
	openView(path: string): Promise<boolean>;
	/** Opens Search with `tag:<tag>`, as a click on that tag in the Tags view does. `tag` has no `#`. */
	openTagSearch(tag: string): void;
}

/** Copy Block Link and Copy block embed for the block at the cursor; the app supplies them. */
export interface BlockLinkActions {
	/** Copies a wikilink to the block at the cursor (context menu and the Cmd+Shift+L keymap entry). */
	copyLink(view: EditorView): Promise<void>;
	/** Copies an embed wikilink to the block at the cursor (context menu). */
	copyEmbed(view: EditorView): Promise<void>;
}

/** The host of an editor nobody configured: resolves nothing and does nothing. */
export const NOOP_HOST: EditorHost = {
	resolveLink: () => null,
	listLinkCandidates: () => Promise.resolve({ files: [], notes: [] }),
	readNote: () => Promise.reject(new Error('No editor host installed')),
	assetUrl: () => '',
	openLink: () => Promise.resolve(),
	openExternal: () => Promise.resolve(),
	createNote: () => Promise.resolve(false),
	openView: () => Promise.resolve(false),
	openTagSearch: () => {},
};

/**
 * The editor's host. Static: the app's host never changes, so nothing
 * reconfigures it and no transaction carries `reconfigured` because of it.
 */
export const editorHost = Facet.define<EditorHost, EditorHost>({
	static: true,
	combine: (values) => values[0] ?? NOOP_HOST,
});
