/** The clicked note or folder, captured when a menu action is invoked. */
export interface MenuActionTarget {
	/** Menu surface */
	on: 'note' | 'folder';
	/** Vault-relative path; the vault root is an empty string */
	path: string;
}

/** A flat action in note-row or folder menus; rendering reads data only. */
export interface MenuActionItem {
	/** Unique id */
	id: string;
	/** Menu item label */
	label: string;
	/** Surfaces that show this item */
	on: readonly ('note' | 'folder')[];
	/** Note-row file filter; omitted means markdown. Does not filter folders. */
	files?: 'markdown' | 'all';
	/** Called only on selection, with the clicked target */
	run: (target: MenuActionTarget) => void;
}
