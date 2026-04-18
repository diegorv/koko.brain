import { getContext, setContext } from 'svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

/** Actions exposed by FileExplorer to its tree-item descendants */
export interface FileExplorerContextActions {
	/** Sets the node that the shared context menu should act on (or null for the vault-root menu) */
	setContextTarget: (node: FileTreeNode | null) => void;
	/** Opens the shared icon picker dialog bound to the given node */
	openIconPicker: (node: FileTreeNode) => void;
}

const KEY = Symbol('file-explorer-context');

/** Called once by FileExplorer to expose shared menu/picker actions to descendants */
export function setFileExplorerContext(actions: FileExplorerContextActions): void {
	setContext(KEY, actions);
}

/** Called by FileTreeItem (or any descendant) to access the shared menu/picker actions */
export function useFileExplorerContext(): FileExplorerContextActions {
	return getContext<FileExplorerContextActions>(KEY);
}
