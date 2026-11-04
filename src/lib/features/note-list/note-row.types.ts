import type { FrontmatterValue } from '#lib/types/vault-v2.types.js';

/** The fields a shared note row and its context menu read from a listed note. */
export interface NoteRowNote {
	/** Absolute path of the note */
	path: string;
	/** Display title (file name without `.md`) */
	title: string;
	/** Whether the note carries `_favorite: true` */
	favorite: boolean;
	/** Last modification time, unix seconds (0 when unknown) */
	modifiedAt: number;
	/** Parsed frontmatter, read for the list-property pills */
	frontmatter: Record<string, FrontmatterValue>;
}
