/** Log lines a run keeps; older lines are dropped */
export const MAX_RUN_LOG_LINES = 500;

/** Whether a run is going, or how it ended */
export type ModRunStatus = 'running' | 'done' | 'failed' | 'cancelled';

/** The progress bar of a run, from `run.progress(done, total, label?)` */
export interface ModRunProgress {
	/** Steps done */
	done: number;
	/** Steps in all */
	total: number;
	/** Text next to the bar */
	label?: string;
}

/** One run of a mod action, from any entry point (rail, palette, menu, command row) */
export interface ModRunState {
	/** Unique for the app session */
	id: number;
	/** Id of the mod whose action runs */
	modId: string;
	/** The action's run key (`mod:<mod>:action:<action>`): an action has at most one live run */
	runKey: string;
	/** The action's title */
	title: string;
	/** Running, or how it ended */
	status: ModRunStatus;
	/** The last `MAX_RUN_LOG_LINES` lines from `run.log` */
	lines: string[];
	/** The last `run.progress` call; null before the first */
	progress: ModRunProgress | null;
	/** Set when `status` is `'failed'` */
	error: { message: string; stack?: string } | null;
	/** Aborts the run's signal (Stop); the host's abort listener ends the run cancelled */
	stop: () => void;
}

/** The newest run of each action, in start order */
let runs = $state.raw<ModRunState[]>([]);
/** Ids of mods whose reload waits for their live runs to end (PRD P10) */
let pendingReloads = $state.raw<string[]>([]);
let nextId = 1;

/** Applies `change` to the run with `id` while it is running; an ended or unknown run is left as it is */
function updateLive(id: number, change: (run: ModRunState) => Partial<ModRunState>): void {
	const index = runs.findIndex((r) => r.id === id);
	if (index === -1 || runs[index].status !== 'running') return;
	const next = [...runs];
	next[index] = { ...runs[index], ...change(runs[index]) };
	runs = next;
}

function findRun(runKey: string): ModRunState | null {
	return runs.find((r) => r.runKey === runKey) ?? null;
}

/** Reactive store for mod action runs, one per action key: the run view and the busy rail buttons read it */
export const modsRunsStore = {
	/** The newest run of each action, live or ended */
	get runs() {
		return runs;
	},
	/** The newest run of the action with this run key, or null */
	runFor(runKey: string): ModRunState | null {
		return findRun(runKey);
	},
	/** Whether the action with this run key has a live run */
	isBusy(runKey: string): boolean {
		return findRun(runKey)?.status === 'running';
	},
	/** Whether the mod's reload waits for its live runs to end */
	isReloadPending(modId: string): boolean {
		return pendingReloads.includes(modId);
	},

	/** Adds a running run, replacing the action's previous run; returns its id */
	start(run: { modId: string; runKey: string; title: string; stop: () => void }): number {
		const id = nextId++;
		runs = [
			...runs.filter((r) => r.runKey !== run.runKey),
			{ ...run, id, status: 'running', lines: [], progress: null, error: null },
		];
		return id;
	},

	/** Appends a log line, dropping the oldest past `MAX_RUN_LOG_LINES` */
	log(id: number, text: string) {
		updateLive(id, (r) => ({ lines: [...r.lines.slice(Math.max(0, r.lines.length - MAX_RUN_LOG_LINES + 1)), text] }));
	},

	/** Replaces the progress bar */
	progress(id: number, progress: ModRunProgress) {
		updateLive(id, () => ({ progress }));
	},

	/** Ends the run done */
	finish(id: number) {
		updateLive(id, () => ({ status: 'done' }));
	},

	/** Ends the run failed */
	fail(id: number, error: { message: string; stack?: string }) {
		updateLive(id, () => ({ status: 'failed', error }));
	},

	/** Ends the run cancelled */
	cancel(id: number) {
		updateLive(id, () => ({ status: 'cancelled' }));
	},

	/** Marks or clears a mod's reload as waiting for its runs */
	setReloadPending(modId: string, pending: boolean) {
		const others = pendingReloads.filter((m) => m !== modId);
		pendingReloads = pending ? [...others, modId] : others;
	},

	/** Stops every live run, then empties the store (vault teardown) */
	reset() {
		for (const run of runs) if (run.status === 'running') run.stop();
		runs = [];
		pendingReloads = [];
	},
};
