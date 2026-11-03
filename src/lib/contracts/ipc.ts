import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { CommandArgs, CommandMap, CommandResult } from './commands.js';
import type { EventMap } from './events.js';

/** The args tuple of `call(cmd, ...)`: empty for a zero-arg command. */
type CallArgs<K extends keyof CommandMap> = [keyof CommandArgs<K>] extends [never]
	? []
	: [args: CommandArgs<K>];

/**
 * Typed `invoke` over `CommandMap`: the args object and the result type come
 * from the command name. A zero-arg command reaches `invoke(cmd)` with one
 * argument, never `invoke(cmd, undefined)`, so `toHaveBeenCalledWith('cmd')`
 * assertions hold.
 *
 * Plugin commands are not in `CommandMap` and stay raw `invoke` calls:
 * `plugin:updater|download_and_install` in `UpdateSection.svelte`, which
 * also passes a `Channel`.
 */
export function call<K extends keyof CommandMap>(
	cmd: K,
	...args: CallArgs<K>
): Promise<CommandResult<K>> {
	if (trackInvokes) recordInvoke(cmd);
	return args.length === 0 ? invoke<CommandResult<K>>(cmd) : invoke<CommandResult<K>>(cmd, args[0]);
}

/** Whether `call` records invoke times for the queue-wait report. */
let trackInvokes = false;

/** Invoke times (ms since the epoch) per command, oldest first, not yet paired with a Rust `enter`. */
const pendingInvokes = new Map<string, number[]>();

/**
 * Cap per command. Only the commands traced by `CmdTrace` (`commands/vault.rs`)
 * log an `enter`; the others are never paired, so their queues stay bounded here.
 */
const MAX_PENDING_PER_COMMAND = 32;

function recordInvoke(cmd: string): void {
	let starts = pendingInvokes.get(cmd);
	if (!starts) {
		starts = [];
		pendingInvokes.set(cmd, starts);
	}
	starts.push(Date.now());
	if (starts.length > MAX_PENDING_PER_COMMAND) starts.shift();
}

/**
 * Turns invoke-time recording on or off; off drops what was recorded. The
 * Tauri debug listener turns it on, since the Rust `enter` lines it pairs
 * with only arrive while Tauri debug mode is on.
 */
export function setInvokeTracking(enabled: boolean): void {
	trackInvokes = enabled;
	if (!enabled) pendingInvokes.clear();
}

/**
 * Pairs a Rust `enter <cmd>` at `enterMs` with the oldest recorded invoke of
 * `cmd` and returns the wait between them: time the command spent queued
 * behind other work before its body ran. Null when no invoke is recorded.
 * Both times are wall clock (`Date.now()` and Rust `SystemTime`).
 *
 * Pairing is first-in first-out, so an invoke that never logs an `enter`
 * (its args failed to deserialize, or Rust debug went off while tracking
 * stayed on) shifts every later pairing of that command onto an older invoke
 * and over-reports the wait, until `MAX_PENDING_PER_COMMAND` newer invokes
 * push it out.
 */
export function takeQueueWait(cmd: string, enterMs: number): { invokeMs: number; queueMs: number } | null {
	const invokeMs = pendingInvokes.get(cmd)?.shift();
	if (invokeMs === undefined) return null;
	return { invokeMs, queueMs: enterMs - invokeMs };
}

/**
 * Typed `listen` over `EventMap`: the payload type comes from the event name,
 * and the handler receives `event.payload` instead of the `Event` wrapper.
 * Window events (`onCloseRequested`, `onFocusChanged`) are not in `EventMap`.
 */
export function on<K extends keyof EventMap>(
	name: K,
	handler: (payload: EventMap[K]) => void,
): Promise<UnlistenFn> {
	return listen<EventMap[K]>(name, (event) => handler(event.payload));
}
