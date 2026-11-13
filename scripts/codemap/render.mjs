// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * render.mjs
 *
 * Line rendering for the code map shards (spec section 6 grammar, section 5
 * caps).
 */

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Most `by` lines per symbol before a `more` line. */
const BY_CAP = 8;

/** Most groups a `more` line names. */
const MORE_GROUPS = 8;

/**
 * The `more` line that ends a capped list:
 * `more <what> <n> not shown: <group>(<k>) … [+<m> modules]: q <query>`, the
 * groups by count descending then code unit, at most 8 of them, `+<m> modules`
 * only when more groups exist.
 *
 * @param {string} what the list, e.g. `by`
 * @param {string[]} groups the group (module) of each item not shown
 * @param {string} query the `q` command and its argument
 * @returns {string}
 */
export function moreLine(what, groups, query) {
	const counts = new Map();
	for (const g of groups) counts.set(g, (counts.get(g) ?? 0) + 1);
	const sorted = [...counts.keys()].sort(cmp).sort((a, b) => counts.get(b) - counts.get(a));
	const named = sorted.slice(0, MORE_GROUPS).map((g) => `${g}(${counts.get(g)})`);
	const rest = sorted.length - MORE_GROUPS;
	return `more ${what} ${groups.length} not shown: ${named.join(' ')}${rest > 0 ? ` +${rest} modules` : ''}: q ${query}`;
}

/**
 * The `by` lines of one symbol, `by <id> <- <loc> in <enclosing> <kind> [+<n>]`,
 * at most 8, then a `more` line grouped by module with a `q importers` hint.
 *
 * @param {string} id the symbol ID
 * @param {{file: string, line: number, enclosing: string, kind: string, more: number}[] | undefined} users
 *   `usersBySymbol` entries of the symbol, by file path
 * @param {(file: string) => string} moduleOf the module of a file
 * @returns {string[]}
 */
export function byLines(id, users, moduleOf) {
	if (!users) return [];
	const lines = users
		.slice(0, BY_CAP)
		.map((u) => `by ${id} <- ${u.file}:${u.line} in ${u.enclosing} ${u.kind}${u.more ? ` +${u.more}` : ''}`);
	if (users.length > BY_CAP) lines.push(moreLine('by', users.slice(BY_CAP).map((u) => moduleOf(u.file)), `importers ${id}`));
	return lines;
}
