/** Represents a single open file tab in the editor */
export interface EditorTab {
	/** Absolute file path on disk */
	path: string;
	/** Display name shown on the tab (derived from path) */
	name: string;
	/** Current editor content (may have unsaved changes) */
	content: string;
	/** Last saved snapshot — compared with `content` to detect dirty state */
	savedContent: string;
	/** File type for specialized rendering — undefined defaults to markdown */
	fileType?: 'markdown' | 'collection' | 'tasks' | 'graph' | 'canvas' | 'kanban';
	/** Whether this tab is pinned (pinned tabs stay left and can't be closed with Ctrl+W) */
	pinned?: boolean;
	/** Whether this file is encrypted on disk (AES-256-GCM via macOS Keychain) */
	encrypted?: boolean;
}
