import { invoke } from '@tauri-apps/api/core';
import type { CommandArgs, CommandMap, CommandResult } from './commands.js';

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
	return args.length === 0 ? invoke<CommandResult<K>>(cmd) : invoke<CommandResult<K>>(cmd, args[0]);
}
