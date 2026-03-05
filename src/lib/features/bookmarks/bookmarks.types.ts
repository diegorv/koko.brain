/** A single bookmarked file or folder */
export interface BookmarkEntry {
	/** Absolute path to the bookmarked item */
	path: string;
	/** Display name (file or folder name) */
	name: string;
	/** Whether the bookmarked item is a directory */
	isDirectory: boolean;
	/** Timestamp when the bookmark was created */
	createdAt: number;
}
