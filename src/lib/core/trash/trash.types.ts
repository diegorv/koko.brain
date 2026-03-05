/** A single item in the trash, representing a deleted file or folder */
export interface TrashItem {
	/** Unique identifier (timestamp-based, e.g. "1708185600000") — also the folder name under .kokobrain/trash/items/ */
	id: string;
	/** Vault-relative path where the file originally lived (e.g. "notes/meeting.md") */
	originalPath: string;
	/** Display name of the file or folder (e.g. "meeting.md") */
	fileName: string;
	/** Whether the trashed item was a directory */
	isDirectory: boolean;
	/** Timestamp (ms since epoch) when the item was moved to trash */
	trashedAt: number;
}
