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

/** Most items of an in-line list before a `more` hint (section 5 "any other in-line list"). */
const LIST_CAP = 8;

/** A location as `<file>:<line>`. */
const at = (l) => `${l.file}:${l.line}`;

/** A site as `<file>:<line> in <enclosing>`. */
const site = (s) => `${at(s)} in ${s.enclosing}`;

/** A ` | ` inside copied text (a doc, a union type) becomes ` / `, so only field separators remain. */
const field = (s) => s.replaceAll(' | ', ' / ');

/**
 * An in-line list: `-` when empty, else at most 8 items joined by `sep`, then
 * a `more` hint grouping the rest.
 *
 * @param {string} what the list name in the `more` hint
 * @param {unknown[]} items
 * @param {(item: unknown) => string} fmt one item's text
 * @param {(item: unknown) => string} group the group (module) of an item not shown
 * @param {string} query the `q` command and argument of the hint
 * @param {string} [sep]
 * @returns {string}
 */
function list(what, items, fmt, group, query, sep = ' ') {
	if (!items.length) return '-';
	const shown = items.slice(0, LIST_CAP).map(fmt);
	if (items.length > LIST_CAP) shown.push(moreLine(what, items.slice(LIST_CAP).map(group), query));
	return shown.join(sep);
}

/**
 * The `ipc/commands.md` line of one command:
 * `ipc ipc:<cmd> | args <names|-> -> <result> | rust <loc> | reg <loc> | keys <locs> | callers <sites> [| doc <doc>]`,
 * with `!no-contract`, `!no-rust-fn` and `-` for missing parts.
 *
 * @param {ReturnType<typeof import('./rust.mjs').joinCommands>[number]} c
 * @param {(file: string) => string} moduleOf the module of a file
 * @returns {string}
 */
export function ipcLine(c, moduleOf) {
	const id = `ipc:${c.name}`;
	const out = [
		`ipc ${id}`,
		c.contract ? `args ${field(c.contract.args)} -> ${field(c.contract.result)}` : 'args !no-contract',
		c.rust ? `rust ${at(c.rust)}` : 'rust !no-rust-fn',
		c.reg ? `reg ${at(c.reg)}` : 'reg -',
		`keys ${list('keys', c.keys, at, (k) => moduleOf(k.file), `ipc ${id}`)}`,
		`callers ${list('callers', c.callers, site, (s) => moduleOf(s.file), `callers ${id}`, ', ')}`,
	];
	if (c.contract?.doc) out.push(`doc ${field(c.contract.doc)}`);
	return out.join(' | ');
}

/**
 * The `ipc/events.md` line of one event:
 * `event event:<name> | const <NAME> <loc> | ts EVENT_NAMES.<KEY> <loc> | payload <type> | emits <sites> | listens <sites> [| doc <doc>]`.
 *
 * @param {ReturnType<typeof import('./rust.mjs').joinEvents>[number]} e
 * @param {(file: string) => string} moduleOf the module of a file
 * @returns {string}
 */
export function eventLine(e, moduleOf) {
	const id = `event:${e.name}`;
	const out = [
		`event ${id}`,
		e.const ? `const ${e.const.constName} ${e.const.file}:${e.const.line}` : 'const -',
		e.ts ? `ts EVENT_NAMES.${e.ts.key} ${e.ts.file}:${e.ts.line}` : 'ts -',
		`payload ${field(e.payload ?? '-')}`,
		`emits ${list('emits', e.emits, site, (s) => moduleOf(s.file), `event ${id}`, ', ')}`,
		`listens ${list('listens', e.listens, site, (s) => moduleOf(s.file), `event ${id}`, ', ')}`,
	];
	if (e.const?.doc) out.push(`doc ${field(e.const.doc)}`);
	return out.join(' | ');
}

/**
 * The `ipc/dto.md` line of one DTO:
 * `dto dto:<Name> | rust <loc> | ts <file>|!no-ts | returned-by <ipc ids> | arg-of <ipc ids> | contains <dto ids> | in <dto ids> | used-by <module>(<n>)… | e2e <locs> [| doc <doc>]`.
 *
 * @param {ReturnType<typeof import('./rust.mjs').joinDtos>[number]} d
 * @returns {string}
 */
export function dtoLine(d) {
	const id = `dto:${d.name}`;
	const ids = (prefix, names, what, q) => list(what, names, (n) => `${prefix}${n}`, (n) => `${prefix}${n}`, q);
	const out = [
		`dto ${id}`,
		`rust ${at(d.rust)}`,
		`ts ${d.ts ?? '!no-ts'}`,
		`returned-by ${ids('ipc:', d.returnedBy, 'returned-by', `ipc ${id}`)}`,
		`arg-of ${ids('ipc:', d.argOf, 'arg-of', `ipc ${id}`)}`,
		`contains ${ids('dto:', d.contains, 'contains', `importers ${id}`)}`,
		`in ${ids('dto:', d.in, 'in', `importers ${id}`)}`,
		`used-by ${list('used-by', d.usedBy, (u) => `${u.module}(${u.count})`, (u) => u.module, `importers ${id}`)}`,
		`e2e ${list('e2e', d.e2e, at, (l) => l.file, `importers ${id}`)}`,
	];
	if (d.doc) out.push(`doc ${field(d.doc)}`);
	return out.join(' | ');
}

/**
 * F18: the `ipc-call` and `ev` lines of every card, each text the same on both
 * ends. An `ipc-call` line, `ipc-call <ts loc> in <fn> -> ipc:<cmd> -> <rust fn loc>|!no-rust-fn`,
 * goes on the caller's card and, when the fn exists, on its Rust card. An
 * `ev` line, `ev <emit loc> in <fn> -> event:<name> -> <listen loc> in <fn>`,
 * one per (emit, listen) pair, goes on both cards.
 *
 * @param {ReturnType<typeof import('./rust.mjs').joinCommands>} commands
 * @param {ReturnType<typeof import('./rust.mjs').joinEvents>} events
 * @returns {Map<string, {line: number, text: string}[]>} by file in code-unit
 *   order; `line` is the line the fact has in that file; entries by (line, text)
 */
export function crossLanguageLines(commands, events) {
	const byFile = new Map();
	const add = (file, line, text) => {
		if (!byFile.has(file)) byFile.set(file, []);
		byFile.get(file).push({ line, text });
	};
	for (const c of commands) {
		for (const s of c.callers) {
			const text = `ipc-call ${site(s)} -> ipc:${c.name} -> ${c.rust ? at(c.rust) : '!no-rust-fn'}`;
			add(s.file, s.line, text);
			if (c.rust) add(c.rust.file, c.rust.line, text);
		}
	}
	for (const e of events) {
		for (const em of e.emits) {
			for (const l of e.listens) {
				const text = `ev ${site(em)} -> event:${e.name} -> ${site(l)}`;
				add(em.file, em.line, text);
				add(l.file, l.line, text);
			}
		}
	}
	const out = new Map();
	for (const file of [...byFile.keys()].sort(cmp)) out.set(file, byFile.get(file).sort((a, b) => a.line - b.line || cmp(a.text, b.text)));
	return out;
}
