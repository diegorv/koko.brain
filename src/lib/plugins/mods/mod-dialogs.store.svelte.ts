/** Style of a mod's `alert` dialog */
export type ModAlertKind = 'info' | 'success' | 'warning' | 'error';

/** What a mod's dialog shows, per kind, with the host's defaults filled in */
export type ModDialogSpec =
	| { kind: 'alert'; title: string; message?: string; alertKind: ModAlertKind }
	| { kind: 'confirm'; title: string; message?: string; confirmLabel: string; cancelLabel: string; destructive: boolean }
	| { kind: 'prompt'; title: string; message?: string; label?: string; placeholder?: string; value: string; multiline: boolean }
	| { kind: 'pick'; title: string; placeholder?: string; items: { id: string; title: string; description?: string }[] }
	| { kind: 'loading'; label: string; cancellable: boolean };

/** What each kind settles with: a loading dialog settles with whether it was cancelled */
export interface ModDialogResults {
	alert: undefined;
	confirm: boolean;
	prompt: string | null;
	/** Selected item id, mapped back to the mod's original object by the host */
	pick: string | null;
	loading: boolean;
}

/** A dialog in the queue */
export type ModDialog = ModDialogSpec & {
	/** Unique per dialog, for `answer` and `dismiss` */
	id: number;
	/** Id of the mod that opened it */
	modId: string;
	/** Display name of that mod, shown as a caption */
	modName: string;
};

/** The value each kind settles with when it is cancelled (Esc, Cancel, the mod unloaded) */
const CANCELLED: ModDialogResults = { alert: undefined, confirm: false, prompt: null, pick: null, loading: true };

/** Dialogs in call order; the first is the one shown */
let queue = $state.raw<ModDialog[]>([]);
/** Resolvers of the dialogs in `queue`, by id; kept apart so the queue holds plain data */
const resolvers = new Map<number, (value: unknown) => void>();
let nextId = 1;

function settle(id: number, value: unknown): void {
	const resolve = resolvers.get(id);
	if (!resolve) return;
	resolvers.delete(id);
	queue = queue.filter((d) => d.id !== id);
	resolve(value);
}

/** Reactive queue of the dialogs mods open with `ctx.ui`; one shows at a time */
export const modDialogsStore = {
	/** The dialog shown, or null when none is open */
	get current(): ModDialog | null {
		return queue[0] ?? null;
	},
	/** Every dialog, the shown one first, then the queued ones in call order */
	get dialogs(): readonly ModDialog[] {
		return queue;
	},

	/**
	 * Adds a dialog to the queue; it shows once the dialogs before it settle.
	 * `result` resolves with what the user answered, or the kind's cancel value.
	 */
	open<S extends ModDialogSpec>(modId: string, modName: string, spec: S): { id: number; result: Promise<ModDialogResults[S['kind']]> } {
		const id = nextId++;
		const result = new Promise<ModDialogResults[S['kind']]>((resolve) => {
			resolvers.set(id, resolve as (value: unknown) => void);
		});
		queue = [...queue, { ...spec, id, modId, modName }];
		return { id, result };
	},

	/** Settles a dialog with the user's answer and removes it; does nothing for an unknown id */
	answer<K extends keyof ModDialogResults>(id: number, value: ModDialogResults[K]) {
		settle(id, value);
	},

	/** Settles a dialog as cancelled and removes it; does nothing for an unknown id */
	dismiss(id: number) {
		const dialog = queue.find((d) => d.id === id);
		if (dialog) settle(id, CANCELLED[dialog.kind]);
	},

	/** Settles every open and queued dialog of `modId` as cancelled (the mod unloaded) */
	closeForMod(modId: string) {
		for (const dialog of queue.filter((d) => d.modId === modId)) settle(dialog.id, CANCELLED[dialog.kind]);
	},

	/** Settles every dialog as cancelled and empties the queue (tests) */
	reset() {
		for (const dialog of queue) settle(dialog.id, CANCELLED[dialog.kind]);
		queue = [];
	},
};
