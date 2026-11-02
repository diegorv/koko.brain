import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The rows of `POLICY` in `src-tauri/src/remote/policy.rs`: command name
 * (or `plugin:<name>|*`) to class name (`Read`, `Virtual`, `Denied`).
 */
export function parsePolicy(): Map<string, string> {
	const src = readFileSync(join(process.cwd(), 'src-tauri/src/remote/policy.rs'), 'utf8');
	const table = src.match(/pub const POLICY: &\[\(&str, Class\)\] = &\[([\s\S]*?)\n\];/);
	if (!table) throw new Error('POLICY table not found in src-tauri/src/remote/policy.rs');
	const rows = new Map<string, string>();
	for (const m of table[1].matchAll(/\("([^"]+)",\s*Class::(\w+)\)/g)) rows.set(m[1], m[2]);
	if (rows.size === 0) throw new Error('POLICY table has no parsable rows');
	return rows;
}

/** Whether `cmd` has a row of its own or a `plugin:<name>|*` row covers it. */
export function isClassified(policy: Map<string, string>, cmd: string): boolean {
	if (policy.has(cmd)) return true;
	const bar = cmd.indexOf('|');
	return bar > 0 && policy.has(`${cmd.slice(0, bar)}|*`);
}

/**
 * The rows of `PATH_ARGS` in `src-tauri/src/remote/policy.rs`, as
 * `<command>.<arg>` keys.
 */
export function parsePathArgs(): Set<string> {
	const src = readFileSync(join(process.cwd(), 'src-tauri/src/remote/policy.rs'), 'utf8');
	const table = src.match(/pub const PATH_ARGS: &\[\(&str, &str, PathArg\)\] = &\[([\s\S]*?)\n\];/);
	if (!table) throw new Error('PATH_ARGS table not found in src-tauri/src/remote/policy.rs');
	const rows = new Set<string>();
	for (const m of table[1].matchAll(/\("([^"]+)",\s*"([^"]+)",\s*PathArg::\w+\)/g)) rows.add(`${m[1]}.${m[2]}`);
	if (rows.size === 0) throw new Error('PATH_ARGS table has no parsable rows');
	return rows;
}
