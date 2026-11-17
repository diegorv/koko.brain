import { getContext, setContext } from "svelte";

const KEY = Symbol("command-dialog");

/**
 * Marks the components below as rendered inside `Command.Dialog`, so the item,
 * list and input switch to the dialog's density without a prop at each call site.
 * Call during component initialisation.
 */
export function setCommandDialogContext(): void {
	setContext(KEY, true);
}

/**
 * Whether the calling component renders inside `Command.Dialog`. The font picker
 * and the mod pick dialog use the primitives outside one and keep the defaults.
 * Call during component initialisation.
 */
export function inCommandDialog(): boolean {
	return getContext<boolean | undefined>(KEY) === true;
}
