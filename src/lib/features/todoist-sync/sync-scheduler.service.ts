import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import { addAfterSaveObserver } from '#lib/core/editor/editor.hooks.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import {
	autoCycleDelay,
	autoSyncFailureMessage,
	hasAnchoredLine,
	isFirstRunDone,
	rateLimitWaitMs,
	type AutoSyncFailureKind,
} from './sync-scheduler.logic.js';
import { syncErrorMessage } from './sync-scope.logic.js';
import { syncNow, type SyncNowOutcome } from './sync-now.service.js';

/** Minimum time between the end of a cycle and the next automatic one (design rule 13). */
const MIN_GAP_MS = 30_000;
/** Delay after saving a note with anchored lines before its cycle. */
const SAVE_DELAY_MS = 5_000;

type CycleKind = 'auto' | 'manual';

/** The automatic triggers of one open vault. */
interface Session {
	vaultPath: string;
	intervalTimer: ReturnType<typeof setTimeout> | null;
	/** Fires when the gap or a rate-limit wait ends for a deferred automatic cycle. */
	dueTimer: ReturnType<typeof setTimeout> | null;
	saveTimer: ReturnType<typeof setTimeout> | null;
	unsubscribeSave: () => void;
}

const SKIPPED: SyncNowOutcome = { ok: false, message: 'Automatic Todoist sync waits for the first sync.' };
const STOPPED: SyncNowOutcome = { ok: false, message: 'The Todoist sync was stopped before it ran.' };

let session: Session | null = null;
/** Whether a cycle (automatic or manual) is in progress. */
let running = false;
/** The one cycle queued by triggers that arrived during a cycle; manual wins over auto. */
let followUp: CycleKind | null = null;
/** "Sync now" calls waiting for the queued manual follow-up. */
let manualWaiters: ((outcome: SyncNowOutcome) => void)[] = [];
let lastEndedAt = Number.NEGATIVE_INFINITY;
/** No automatic cycle before this time, after a 429. */
let blockedUntil = 0;
/** The token Todoist rejected with a 401; automatic cycles stay off while it is the configured one. */
let rejectedToken: string | null = null;
/** Failure kinds whose persistent toast is showing; cleared by a successful cycle. */
const toastedKinds = new Set<AutoSyncFailureKind>();

/**
 * Starts the automatic sync for the vault at `vaultPath`: a cycle now (the
 * vault-open trigger), then every `syncIntervalMinutes`, when the window
 * regains focus, and 5 s after a note of this vault holding an anchored task
 * line is saved. Automatic cycles run one at a time, at least 30 s apart and
 * not before a 429's wait ends; they skip while sync is off, while the token
 * is one Todoist rejected, when another vault is open, and until the sync
 * state has `first_run_done` (design rule 9). A failure shows a persistent
 * toast once per kind until a cycle succeeds. Replaces a running session.
 */
export function startAutoSync(vaultPath: string): void {
	stopAutoSync();
	const s: Session = { vaultPath, intervalTimer: null, dueTimer: null, saveTimer: null, unsubscribeSave: () => {} };
	session = s;
	s.unsubscribeSave = addAfterSaveObserver((filePath, content) => {
		// Sync off (the default): skip the task-line parse of every saved note.
		if (!settingsStore.todoist.syncEnabled) return;
		if (!filePath.startsWith(`${vaultPath}/`) || !hasAnchoredLine(content)) return;
		if (s.saveTimer !== null) clearTimeout(s.saveTimer);
		s.saveTimer = setTimeout(() => {
			s.saveTimer = null;
			requestAutoCycle();
		}, SAVE_DELAY_MS);
	});
	window.addEventListener('focus', requestAutoCycle);
	scheduleInterval(s);
	requestAutoCycle();
}

/**
 * Stops the automatic sync: no trigger fires any more, a queued follow-up is
 * dropped (a waiting "Sync now" resolves as stopped), and the rate-limit,
 * rejected-token and toast state is cleared. A cycle in progress finishes;
 * its writes stay guarded by `syncNow`'s vault recheck.
 */
export function stopAutoSync(): void {
	const s = session;
	if (s === null) return;
	session = null;
	for (const timer of [s.intervalTimer, s.dueTimer, s.saveTimer]) if (timer !== null) clearTimeout(timer);
	s.unsubscribeSave();
	window.removeEventListener('focus', requestAutoCycle);
	followUp = null;
	for (const resolve of manualWaiters.splice(0)) resolve(STOPPED);
	lastEndedAt = Number.NEGATIVE_INFINITY;
	blockedUntil = 0;
	rejectedToken = null;
	toastedKinds.clear();
}

/**
 * Palette "Todoist: Sync now": runs a cycle and shows its message in a toast.
 * During a cycle it queues as the follow-up and resolves when that runs;
 * during a 429 wait it sends nothing and says how long to wait.
 */
export async function syncNowFromUi(): Promise<void> {
	const { ok, message } = await requestManualCycle();
	if (ok) toast.success(message);
	else toast.error(message);
}

function requestManualCycle(): Promise<SyncNowOutcome> {
	const refusal = rateLimitRefusal();
	if (refusal !== null) return Promise.resolve(refusal);
	if (running) {
		followUp = 'manual';
		return new Promise((resolve) => manualWaiters.push(resolve));
	}
	return runCycle('manual');
}

/** The "Sync now" refusal while a 429's wait runs, or null when nothing blocks. */
function rateLimitRefusal(): SyncNowOutcome | null {
	const wait = blockedUntil - Date.now();
	if (wait <= 0) return null;
	return { ok: false, message: syncErrorMessage({ kind: 'rate-limit', retryAfter: Math.ceil(wait / 1000) }) };
}

function scheduleInterval(s: Session): void {
	s.intervalTimer = setTimeout(() => {
		scheduleInterval(s);
		requestAutoCycle();
	}, settingsStore.todoist.syncIntervalMinutes * 60_000);
}

function requestAutoCycle(): void {
	const s = session;
	if (s === null) return;
	if (running) {
		followUp ??= 'auto';
		return;
	}
	const wait = autoCycleDelay(Date.now(), lastEndedAt, blockedUntil, MIN_GAP_MS);
	if (wait > 0) {
		s.dueTimer ??= setTimeout(() => {
			s.dueTimer = null;
			requestAutoCycle();
		}, wait);
		return;
	}
	const { syncEnabled, apiToken } = settingsStore.todoist;
	if (!syncEnabled || apiToken === rejectedToken || vaultStore.path !== s.vaultPath) return;
	void runCycle('auto');
}

async function runCycle(kind: CycleKind): Promise<SyncNowOutcome> {
	running = true;
	const s = session;
	const token = settingsStore.todoist.apiToken;
	const outcome = kind === 'auto' && !(await autoCycleAllowed(s!)) ? SKIPPED : await syncNow();
	running = false;
	// A cycle that outlived its session (vault switch) leaves the next session's state alone.
	if (s === session) {
		lastEndedAt = Date.now();
		handleOutcome(outcome, kind, token);
	}

	const next = followUp;
	followUp = null;
	if (next === 'manual') {
		const waiters = manualWaiters.splice(0);
		// The cycle that just ended may have hit a 429: its wait holds the queued run too.
		const refusal = rateLimitRefusal();
		const run = refusal !== null ? Promise.resolve(refusal) : runCycle('manual');
		void run.then((o) => {
			for (const resolve of waiters) resolve(o);
		});
	} else if (next === 'auto') {
		requestAutoCycle();
	}
	return outcome;
}

/**
 * Whether the session's vault has `first_run_done` and is still the open one
 * after the read: `syncNow` reads `vaultStore.path` fresh, so a switch during
 * the read would sync a vault whose state was never checked.
 */
async function autoCycleAllowed(s: Session): Promise<boolean> {
	const done = await firstRunDone(s.vaultPath);
	return done && s === session && vaultStore.path === s.vaultPath;
}

async function firstRunDone(vaultPath: string): Promise<boolean> {
	try {
		return isFirstRunDone(await call('todoist_read_kv', { vaultPath }));
	} catch (err) {
		error('TODOIST', 'reading the sync state failed:', err);
		return false;
	}
}

function handleOutcome(outcome: SyncNowOutcome, kind: CycleKind, token: string): void {
	if (outcome.ok) {
		for (const k of toastedKinds) toast.dismiss(toastId(k));
		toastedKinds.clear();
		return;
	}
	const failure = outcome.failure;
	if (failure === undefined || failure.kind === 'vault-switched') return;
	if (failure.kind === 'rate-limit') blockedUntil = Date.now() + rateLimitWaitMs(failure.retryAfter);
	if (failure.kind === 'invalid-token') rejectedToken = token;
	if (kind === 'auto' && !toastedKinds.has(failure.kind)) {
		toastedKinds.add(failure.kind);
		toast.error(autoSyncFailureMessage(failure.kind), { id: toastId(failure.kind), duration: Infinity, closeButton: true });
	}
}

function toastId(kind: AutoSyncFailureKind): string {
	return `todoist-sync-${kind}`;
}
