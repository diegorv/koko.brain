export interface AppCommand {
	id: string;
	label: string;
	category: string;
	shortcut?: CommandShortcut;
	action: () => void | Promise<void>;
}

export interface CommandShortcut {
	key?: string;
	code?: string;
	meta?: boolean;
	shift?: boolean;
	alt?: boolean;
}
