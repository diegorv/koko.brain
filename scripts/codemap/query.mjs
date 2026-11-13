// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap-query.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * query.mjs
 *
 * The code map query CLI (spec section 9), `node scripts/codemap.mjs q <command> <arg> [options]`.
 * Each call answers from a model built from the working tree, the same model
 * the generator renders, so answers are current on any branch. Output lines
 * use the shard grammar; line 1 is `# <command> <resolved id> total <n> (prod <n>, tests <n>)`.
 */
import { posix } from 'node:path';

import { BASELINE } from './model.mjs';
import {
	byLine,
	context,
	depLine,
	EFFECT_CLASSES,
	fileCalls,
	fxLine,
	impLine,
	isCarded,
	localLine,
	memLines,
	mountLine,
	renderCard,
	rustSymLine,
	storeLine,
	symId,
	symLine,
	testLine,
	wiringLines,
} from './render.mjs';
import { usersBySymbol } from './ts.mjs';

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Lines a result shows unless `--limit` says otherwise. */
const DEFAULT_LIMIT = 50;

/** Deepest `impact` closure. */
const MAX_IMPACT_DEPTH = 6;

/** Deepest `sink --up`. */
const MAX_UP = 3;

/** Default `flow` search depth. */
const FLOW_DEPTH = 12;

/** Most did-you-mean candidates. */
const SUGGESTIONS = 5;

/** Files `impact` lists by hub rank for depth 2 and beyond. */
const IMPACT_TOP_FILES = 10;

/** Module and via groups named on an `impact` depth line. */
const IMPACT_GROUPS = 8;

/** A `q file` card larger than this prints a hint to use `--section` (Bash inlines about 30,000 chars). */
const CARD_HINT_BYTES = 28 * 1024;

/** The answer of a query that found the ID but no fact. */
const EMPTY = 'none (no static reference found; see Blind spots in codemap/INDEX.md)';

/** Card sections `q file --section` knows, in card order. */
const SECTIONS = ['imports', 'imported-by', 'reach', 'tests', 'symbols', 'store', 'locals', 'mounts', 'mounted-at', 'calls', 'ipc-in', 'effects'];

/** The `q help` text, also printed after a usage error. */
export const HELP = `${[
	'usage: node scripts/codemap.mjs q <command> <arg> [options]',
	'commands:',
	'  help                                   this text',
	'  sym <name> | sym --match <part|/re/>   definitions by exact name, or by part of a name (case-insensitive)',
	'  file <file> [--section <name>]         the file card, computed from the working tree',
	'  importers <file|symbol|dto> [--tests]  imp lines into a file, by lines of a symbol',
	'  deps <file|module>                     imp lines out of a file, dep lines out of a module, test lines of a test file',
	'  callers <id> [--tests]                 uses of a function, store member, component, Rust item, ipc:<cmd> or event:<name>',
	'  calls <symbol|file>                    outgoing call lines',
	'  impact <file|symbol> [--depth N] [--tests]  reverse closure, depth 2 by default, at most 6',
	'  path <A> <B>                           shortest import path between two files or two modules',
	'  flow <A> <B> [--depth N]               shortest runtime path over calls, refs, mounts, fires, state, ipc and events',
	'  ipc <command>                          one IPC command, one fact per line',
	'  event <name|CONST|EVENT_NAMES.KEY>     one event: emits, listeners and ev pairs',
	'  store <store|store.member>             store members with readers, writers and w-via; every site of one member',
	'  sink <sink|class> [--up N]             fx sites of a sink or effect class; --up N (at most 3) adds callers per hop',
	'  tests <file>                           test lines of a file',
	'  hubs [--layer L] [--module M]          files by production importers, then test importers',
	'  reg <registry>                         the codemap/wiring/<layer>.md lines of one registry or facet',
	'options: --limit N (default 50) · --module M keeps results in module M · --file F reads a bare name as F:name',
	'IDs: file = repo path · symbol = <file>:<name> · member = <file>:<object>.<member> · component = <file>:default or <file>:<Basename> · Rust method = <file>:<Type>::<name> · scope = <file>:(module), (script), (markup), $effect@<line>, <var>=$derived · module = folder path · ipc:<command> · event:<name> · dto:<Name> · a bare name when one definition has it',
	'exit: 0 found (no fact prints "none …") · 1 no match or ambiguous · 2 usage error',
].join('\n')}\n`;

/** Options that take a value, and the commands that accept each (null: every command). */
const VALUE_OPTIONS = { limit: null, module: null, file: null, depth: ['impact', 'flow'], up: ['sink'], section: ['file'], layer: ['hubs'], match: ['sym'] };

/** Commands that accept `--tests`. */
const TESTS_OPTION = ['importers', 'callers', 'impact'];

/** A failed query: exit 1 (no match, ambiguous) or 2 (usage). */
class QueryError extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
	}
}

/** A usage error: the reason, then the help text. */
const usage = (reason) => new QueryError(2, `${reason}\n${HELP}`);

/** The exit-1 error for a name several definitions share. */
const ambiguous = (ids) => new QueryError(1, `ambiguous: rerun with one of\n${[...ids].sort(cmp).join('\n')}\n`);

/** `map.get(key)`, creating an empty array first. */
function bucket(map, key) {
	if (!map.has(key)) map.set(key, []);
	return map.get(key);
}

/** The file of an ID: the text before its first `:` (paths hold none). */
const fileOf = (id) => (id.includes(':') ? id.slice(0, id.indexOf(':')) : id);

/** Whether an enclosing name is a reactive scope. */
const isReactiveScope = (name) => /^\$effect(?:\.pre)?@\d+$|=\$derived$|^\$derived@\d+$/.test(name);

/** Whether a name is a scope of a file (section 4). */
const isScopeName = (name) => /^\((?:module|script|markup)\)$/.test(name) || isReactiveScope(name);

/** Optimal string alignment distance, or `max + 1` once it exceeds `max`. */
function editDistance(a, b, max) {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let prev2 = [];
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		let best = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
			row.push(d);
			best = Math.min(best, d);
		}
		if (best > max) return max + 1;
		prev2 = prev;
		prev = row;
	}
	return prev[b.length];
}

/**
 * Up to 5 candidates for an unknown argument, ranked by exact
 * (case-insensitive), prefix, substring, then edit distance at most
 * max(2, len/4); ties by distance, then code unit.
 *
 * @param {string} arg
 * @param {Iterable<string>} pool
 * @returns {string[]}
 */
export function suggest(arg, pool) {
	const a = arg.toLowerCase();
	const max = Math.max(2, Math.floor(arg.length / 4));
	const ranked = [];
	for (const c of new Set(pool)) {
		const l = c.toLowerCase();
		const rank = l === a ? 0 : l.startsWith(a) ? 1 : l.includes(a) ? 2 : 3;
		let dist = 0;
		if (rank === 3) {
			dist = editDistance(a, l, max);
			if (dist > max) continue;
		}
		ranked.push({ c, rank, dist });
	}
	ranked.sort((x, y) => x.rank - y.rank || x.dist - y.dist || cmp(x.c, y.c));
	return ranked.slice(0, SUGGESTIONS).map((x) => x.c);
}

/** The exit-1 error for an unknown argument, with did-you-mean candidates. */
function noMatch(arg, pool) {
	const c = suggest(arg, pool);
	return new QueryError(1, c.length ? `no match for '${arg}'; did you mean:\n${c.join('\n')}\n` : `no match for '${arg}'\n`);
}

/** Parses `<command> <positional…> [options]`; throws a usage error. */
function parseArgs(argv) {
	if (!argv.length) throw usage('missing command');
	const [command, ...rest] = argv;
	const pos = [];
	const opts = {};
	for (let i = 0; i < rest.length; i++) {
		const a = rest[i];
		if (a === '--tests') {
			if (!TESTS_OPTION.includes(command)) throw usage(`--tests does not apply to ${command}`);
			opts.tests = true;
		} else if (a.startsWith('--')) {
			const name = a.slice(2);
			if (!Object.hasOwn(VALUE_OPTIONS, name)) throw usage(`unknown option ${a}`);
			if (VALUE_OPTIONS[name] && !VALUE_OPTIONS[name].includes(command)) throw usage(`${a} does not apply to ${command}`);
			if (i + 1 >= rest.length) throw usage(`${a} needs a value`);
			opts[name] = rest[++i];
		} else if (a === 'in' && i + 1 < rest.length && !rest[i + 1].startsWith('--')) pos.push(`in ${rest[++i]}`);
		else pos.push(a);
	}
	for (const [name, max] of [
		['limit', Infinity],
		['depth', command === 'impact' ? MAX_IMPACT_DEPTH : Infinity],
		['up', MAX_UP],
	]) {
		if (opts[name] === undefined) continue;
		const n = Number(opts[name]);
		if (!/^\d+$/.test(opts[name]) || n < 1 || n > max) throw usage(`--${name} takes a whole number from 1${max === Infinity ? '' : ` to ${max}`}`);
		opts[name] = n;
	}
	return { command, pos, opts };
}

/** Whether a fact or a summary follows row `i` before the next heading. */
function hasRowAfter(list, i) {
	for (let j = i + 1; j < list.length; j++) {
		if (list[j].heading) return false;
		if (!list[j].note || list[j].summary) return true;
	}
	return false;
}

/** A heading row: shown, not counted, dropped when nothing follows it. */
const heading = (name) => ({ text: `## ${name}`, note: true, heading: true });

/** A summary row: shown, not counted. */
const summary = (text) => ({ text, note: true, summary: true });

/** The `## <name>` section of a rendered card, or null when the card has none. */
function cardSection(text, name) {
	const lines = text.slice(0, -1).split('\n');
	const start = lines.indexOf(`## ${name}`);
	if (start === -1) return null;
	const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
	return lines.slice(start + 1, end === -1 ? undefined : end);
}

/** Counts of items as `<item>(<n>) …`, by count then code unit, at most 8, then `+<rest>`. */
function groupCounts(items) {
	const counts = new Map();
	for (const x of items) counts.set(x, (counts.get(x) ?? 0) + 1);
	const keys = [...counts.keys()].sort(cmp).sort((a, b) => counts.get(b) - counts.get(a));
	const shown = keys.slice(0, IMPACT_GROUPS).map((k) => `${k}(${counts.get(k)})`);
	return `${shown.join(' ')}${keys.length > IMPACT_GROUPS ? ` +${keys.length - IMPACT_GROUPS}` : ''}`;
}

/**
 * Breadth-first search from `starts` to the first node passing `goal`, at
 * most `depth` hops, taking neighbors in the order `next` gives them.
 *
 * @param {string[]} starts
 * @param {(node: string) => boolean} goal
 * @param {(node: string) => {to: string, text: string}[]} next
 * @param {number} depth
 * @returns {object[] | null} the hop rows, or null when no node within `depth` passes
 */
function bfs(starts, goal, next, depth) {
	const parent = new Map(starts.map((s) => [s, null]));
	let frontier = starts;
	for (let d = 0; frontier.length; d++) {
		const hit = frontier.find(goal);
		if (hit !== undefined) {
			const hops = [];
			for (let at = hit; parent.get(at); at = parent.get(at).from) hops.unshift(parent.get(at).row);
			return hops;
		}
		if (d === depth) break;
		const step = [];
		for (const n of frontier)
			for (const row of next(n)) {
				if (parent.has(row.to)) continue;
				parent.set(row.to, { from: n, row });
				step.push(row.to);
			}
		frontier = step;
	}
	return null;
}

/**
 * The answer of `path` or `flow` when a start node already meets the goal:
 * `same node: A is B`, or `same node: A and B overlap at <node>`.
 */
function sameNode(command, A, B, hit) {
	const why = A.id === B.id ? `${A.id} is ${B.id}` : `${A.id} and ${B.id} overlap at ${hit}`;
	return `# ${command} ${A.id} -> ${B.id} total 0 (prod 0, tests 0)\nsame node: ${why}\n`;
}

/** One query over one model. */
class Query {
	constructor(model, opts) {
		this.model = model;
		this.opts = opts;
		this.limit = opts.limit ?? DEFAULT_LIMIT;
	}

	/** The render context of the model, built once. */
	get ctx() {
		this._ctx ??= context(this.model);
		return this._ctx;
	}

	/**
	 * Definitions by ID and by name: carded TS symbols, locals, object methods,
	 * class methods (by `Class.m` only), store members and Rust items, each
	 * with its card line (`sym`, `local`, `mem`; an object or class method
	 * shows the line of its owner, none for a non-exported class). A re-export
	 * is named by `sym` only, so a bare name elsewhere resolves to the origin. Then the names
	 * output prints after `in` (enclosings of uses, effects, Rust calls,
	 * registry sites, IPC callers and event sites) and the file scopes a file
	 * has, with no line; a scope name is reachable by its full ID only.
	 */
	get ix() {
		if (this._ix) return this._ix;
		const { model } = this;
		const defs = [];
		const ids = new Set();
		const byName = new Map();
		const members = new Map();
		const add = (d) => {
			if (ids.has(d.id)) return;
			ids.add(d.id);
			defs.push(d);
			for (const n of new Set(d.names)) bucket(byName, n).push(d);
		};
		for (const st of model.stores) {
			if (model.isTest(st.file)) continue;
			for (const m of st.members) {
				add({ id: m.id, names: [`${st.name}.${m.name}`, m.name], file: st.file, text: memLines(st, m, this.ctx.group)[0] });
				members.set(m.id, { st, m });
			}
		}
		for (const file of [...model.ts.keys()].sort(cmp)) {
			if (!isCarded(model, file)) continue;
			const facts = model.ts.get(file);
			for (const s of facts.symbols)
				add({ id: symId(file, s), names: s.kind === 'reexport' ? [] : [s.name], symNames: [s.name], file, text: symLine(file, s) });
			for (const l of facts.locals) add({ id: `${file}:${l.name}`, names: [l.name], file, text: localLine(file, l) });
			const lineOf = (name) => {
				const sym = facts.symbols.find((s) => s.name === name);
				if (sym) return symLine(file, sym);
				const local = facts.locals.find((l) => l.name === name);
				return local ? localLine(file, local) : null;
			};
			for (const obj of [...facts.objects.keys()].sort(cmp))
				for (const m of facts.objects.get(obj)) add({ id: `${file}:${obj}.${m}`, names: [`${obj}.${m}`, m], file, text: lineOf(obj) });
			for (const cls of [...facts.classes.keys()].sort(cmp))
				for (const m of facts.classes.get(cls)) add({ id: `${file}:${cls}.${m}`, names: [`${cls}.${m}`], file, text: lineOf(cls) });
		}
		for (const file of [...model.rust.keys()].sort(cmp)) {
			if (model.isTest(file)) continue;
			const facts = model.rust.get(file);
			const names = (n) => [n, n.split('::').at(-1)];
			for (const i of facts.items) add({ id: `${file}:${i.name}`, names: names(i.name), file, text: rustSymLine(file, i) });
			for (const l of facts.locals) add({ id: `${file}:${l.name}`, names: names(l.name), file, text: localLine(file, l) });
		}
		const enclosings = new Set();
		const site = (s) => {
			if (!model.isTest(s.file) && s.enclosing) enclosings.add(`${s.file}:${s.enclosing}`);
		};
		[...model.uses, ...model.effects, ...model.rustCalls].forEach(site);
		for (const r of model.registries) {
			[...r.registeredAt, ...r.invokedAt].forEach(site);
			for (const f of r.firedBy) f.chain.forEach(site);
		}
		for (const c of model.commands) c.callers.forEach(site);
		for (const e of model.events) [...e.emits, ...e.listens].forEach(site);
		for (const [file, facts] of model.ts) {
			if (!file.endsWith('.svelte')) enclosings.add(`${file}:(module)`);
			else {
				enclosings.add(`${file}:(markup)`);
				if (facts.regions.some((r) => r.module)) enclosings.add(`${file}:(module)`);
				if (facts.regions.some((r) => !r.module)) enclosings.add(`${file}:(script)`);
			}
		}
		for (const id of [...enclosings].sort(cmp)) {
			const file = fileOf(id);
			const name = id.slice(file.length + 1);
			add({ id, names: isScopeName(name) ? [] : [name], file, text: null });
		}
		this._ix = { defs, ids, byName, members };
		return this._ix;
	}

	/** Distinct production importer files by file, from the hub ranking. */
	get importerCounts() {
		this._counts ??= new Map(this.model.hubs.map((h) => [h.file, h.prod]));
		return this._counts;
	}

	/** Whether a path is an inventory file (the layer baseline is data, not a graph node). */
	isFile(p) {
		return this.model.inputs.has(p) && p !== BASELINE;
	}

	/** The `--file` option, checked. */
	fileOption() {
		const f = this.opts.file;
		if (f === undefined) return null;
		if (!this.isFile(f)) throw noMatch(f, this.model.files);
		return f;
	}

	/** A `<file>:<name>` argument as a model ID, or null. */
	symbolId(a) {
		if (this.ix.ids.has(a)) return a;
		const file = fileOf(a);
		const name = a.slice(file.length + 1);
		if (!this.isFile(file)) return null;
		if (file.endsWith('.svelte') && (name === 'default' || name === posix.basename(file, '.svelte'))) return `${file}:default`;
		return null;
	}

	/**
	 * Resolves an argument to one of `kinds` (`file`, `module`, `symbol`,
	 * `ipc`, `event`, `dto`). With `event`, an `EVENT_NAMES.<KEY>` or a
	 * `*_EVENT` const name is the event, before the Rust const of that name.
	 *
	 * @returns {{kind: string, id: string}}
	 * @throws {QueryError} exit 1 with candidates, or with the IDs of an ambiguous name
	 */
	resolve(arg, kinds) {
		const { model } = this;
		let a = arg.startsWith('in ') ? arg.slice(3) : arg;
		if (kinds.includes('event')) {
			const bare = a.startsWith('EVENT_NAMES.') ? a.slice(12) : a;
			const e = model.events.find((x) => x.const?.constName === bare || (bare !== a && x.ts?.key === bare));
			if (e) return { kind: 'event', id: `event:${e.name}` };
		}
		const file = this.fileOption();
		if (file && !a.includes(':')) a = `${file}:${a}`;
		for (const [kind, prefix, list] of [
			['ipc', 'ipc:', model.commands],
			['event', 'event:', model.events],
			['dto', 'dto:', model.dtos],
		]) {
			if (!a.startsWith(prefix)) continue;
			const names = list.map((x) => `${prefix}${x.name}`);
			if (kinds.includes(kind) && names.includes(a)) return { kind, id: a };
			throw noMatch(arg, kinds.includes(kind) ? names : []);
		}
		if (kinds.includes('file') && this.isFile(a)) return { kind: 'file', id: a };
		if (kinds.includes('module') && model.modules.includes(a)) return { kind: 'module', id: a };
		const pool = [];
		if (kinds.includes('symbol')) {
			if (fileOf(a).includes('/')) {
				const id = this.symbolId(a);
				if (id) return { kind: 'symbol', id };
				pool.push(...this.ix.ids);
			} else {
				const hits = [...new Set((this.ix.byName.get(a) ?? []).map((d) => d.id))];
				if (hits.length === 1) return { kind: 'symbol', id: hits[0] };
				if (hits.length > 1) throw ambiguous(hits);
				pool.push(...this.ix.byName.keys());
			}
		}
		if (kinds.includes('file')) pool.push(...model.files);
		if (kinds.includes('module')) pool.push(...model.modules);
		throw noMatch(arg, pool);
	}

	/** Whether a result row lies in module `m`: its `module`, or the module of its file. */
	inModule(row, m) {
		if (row.module) return row.module === m;
		if (!row.file) return false;
		return this.model.isTest(row.file) ? row.file.startsWith(`${m}/`) : this.model.moduleOf(row.file) === m;
	}

	/** The module a hidden row counts under in the `more` line. */
	groupOf(row) {
		if (row.module) return row.module;
		return row.file && !this.model.isTest(row.file) ? this.model.moduleOf(row.file) : null;
	}

	/**
	 * The answer text: the header, then the rows (each `{text, file?, module?,
	 * test?}`, `test` counting a row as a test without a test file;
	 * headings and summaries are `note` rows, neither counted nor cut), kept to
	 * `--module`, cut to `--limit` facts with a `more` line.
	 */
	answer(command, id, rows) {
		let list = rows;
		if (this.opts.module !== undefined) {
			const m = this.opts.module;
			if (!this.model.modules.includes(m)) throw noMatch(m, this.model.modules);
			list = list.filter((r) => r.note || this.inModule(r, m));
		}
		const facts = list.filter((r) => !r.note);
		const tests = facts.filter((r) => r.test || (r.file && this.model.isTest(r.file))).length;
		const head = `# ${command} ${id} total ${facts.length} (prod ${facts.length - tests}, tests ${tests})`;
		if (!facts.length) return `${head}\n${EMPTY}\n`;
		const visible = [];
		const hidden = [];
		let n = 0;
		for (const r of list) {
			if (r.note || n++ < this.limit) visible.push(r);
			else hidden.push(r);
		}
		const out = [head, ...visible.filter((r, i) => !r.heading || hasRowAfter(visible, i)).map((r) => r.text)];
		if (hidden.length) {
			const counts = new Map();
			for (const r of hidden) {
				const g = this.groupOf(r);
				if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
			}
			const top = [...counts.keys()].sort(cmp).sort((x, y) => counts.get(y) - counts.get(x))[0];
			out.push(`more ${hidden.length} not shown (total ${facts.length}): rerun with --limit ${facts.length}${top ? `, or narrow with --module ${top}` : ''}`);
		}
		return `${out.join('\n')}\n`;
	}

	/** Importer edges of a file, production ones only unless `tests`, by (production first, importer, line). */
	importerEdges(file, tests = false) {
		const { isTest } = this.model;
		return (this.model.importers.get(file) ?? [])
			.filter((e) => tests || !isTest(e.from))
			.sort((a, b) => Number(isTest(a.from)) - Number(isTest(b.from)) || cmp(a.from, b.from) || a.line - b.line);
	}

	/**
	 * Use sites into a symbol ID in files passing `keep`: F4 uses (of the ID
	 * or of the imported symbol), mounts of a component, Rust calls.
	 */
	useSites(id, keep) {
		const { model } = this;
		const out = [];
		for (const u of model.uses)
			if ((u.target === id || u.symbol === id) && keep(u.file))
				out.push({ file: u.file, line: u.line, enclosing: u.enclosing, target: id, kind: u.markup ? 'markup' : u.kind, site: u.site });
		if (id.endsWith(':default'))
			for (const m of model.mounts)
				if (`${m.target}:default` === id && keep(m.file))
					out.push({ file: m.file, line: m.line, enclosing: '(markup)', target: id, kind: 'mount', site: `mount:${m.line}:${m.name}` });
		model.rustCalls.forEach((c, i) => {
			if (c.target === id && keep(c.file)) out.push({ file: c.file, line: c.line, enclosing: c.enclosing, target: id, kind: c.kind, site: `rust:${i}` });
		});
		return out;
	}

	/**
	 * `call` rows of sites, one per (file, enclosing, target, kind, role) at
	 * the first site's line with `+<n>` for further sites, by (production
	 * first, file, line, target):
	 * `call <loc> in <enclosing> -> <target> <kind> [+<n>] [<role>]`.
	 */
	callRows(sites) {
		const { isTest } = this.model;
		const groups = new Map();
		for (const s of sites) {
			const key = [s.file, s.enclosing, s.target, s.kind, s.role ?? ''].join('\0');
			const g = groups.get(key);
			if (!g) groups.set(key, { ...s, sites: new Set([s.site ?? `${s.line}`]) });
			else {
				g.sites.add(s.site ?? `${s.line}`);
				if (s.line < g.line) g.line = s.line;
			}
		}
		return [...groups.values()]
			.sort(
				(a, b) =>
					Number(isTest(a.file)) - Number(isTest(b.file)) || cmp(a.file, b.file) || a.line - b.line || cmp(a.target, b.target) || cmp(a.kind, b.kind),
			)
			.map((g) => ({
				text: `call ${g.file}:${g.line} in ${g.enclosing} -> ${g.target} ${g.kind}${g.sites.size > 1 ? ` +${g.sites.size - 1}` : ''}${g.role ? ` ${g.role}` : ''}`,
				file: g.file,
				node: `${g.file}:${g.enclosing}`,
				via: g.kind,
			}));
	}

	/** Sites of one store member in files passing `keep`: readers (`read`), writers (`write`) and, for a getter, the writers of its `w-via` members. */
	memberSites(st, m, keep) {
		const sites = [];
		const push = (list, target, role) => {
			for (const s of list)
				if (keep(s.file))
					sites.push({ ...s, target, kind: s.markup && s.kind === 'member' ? 'markup' : s.kind, role, site: `${s.line}:${s.enclosing}:${s.kind}` });
		};
		push(m.readers, m.id, 'read');
		push(m.writers, m.id, 'write');
		if (m.kind === 'get')
			for (const name of m.wVia) {
				const d = st.members.find((x) => x.name === name);
				if (d) push(d.writers, d.id, 'w-via');
			}
		return sites;
	}

	/** The command a Rust fn ID serves, or undefined. */
	commandOf(id) {
		return this.model.commands.find((c) => c.rust && `${c.rust.file}:${c.name}` === id);
	}

	/** An `ipc-call` line, as on the cards. */
	ipcCallLine(c, s) {
		return `ipc-call ${s.file}:${s.line} in ${s.enclosing} -> ipc:${c.name} -> ${c.rust ? `${c.rust.file}:${c.rust.line}` : '!no-rust-fn'}`;
	}

	/** Production callers of a symbol one hop up: uses, mounts and Rust calls as `call` rows; a Rust command's TS callers as `ipc-call` rows. */
	callersOf(node) {
		const rows = this.callRows(this.useSites(node, (f) => !this.model.isTest(f)));
		const c = this.commandOf(node);
		if (c) for (const s of c.callers) rows.push({ text: this.ipcCallLine(c, s), file: s.file, node: `${s.file}:${s.enclosing}`, via: `ipc:${c.name}` });
		return rows;
	}

	/**
	 * The `impact` predecessors of a node: importers of a file; for a symbol its
	 * callers plus the files that only import it (a type, say) as `by` rows
	 * continuing from that file (`via-import`); `via-file` from `(module)`;
	 * `via-mount` from a component scope.
	 */
	impactPreds(node) {
		if (this.isFile(node)) return this.importerEdges(node).map((e) => ({ text: impLine(e), file: e.from, node: e.from, via: 'imp' }));
		const file = fileOf(node);
		const name = node.slice(file.length + 1);
		if (name === '(module)') return this.importerEdges(file).map((e) => ({ text: impLine(e), file: e.from, node: e.from, via: 'via-file' }));
		if (file.endsWith('.svelte') && isScopeName(name))
			return this.model.mounts
				.filter((m) => m.target === file && !this.model.isTest(m.file))
				.sort((a, b) => cmp(a.file, b.file) || a.line - b.line)
				.map((m) => ({ text: mountLine(m), file: m.file, node: `${m.file}:(markup)`, via: 'via-mount' }));
		const imports = (this.model.users.get(node) ?? this.model.rustUsers.get(node) ?? [])
			.filter((u) => u.kind === 'import')
			.map((u) => ({ text: byLine(node, u), file: u.file, node: u.file, via: 'via-import' }));
		return [...this.callersOf(node), ...imports];
	}
}

/** The commands: each takes the query and its positional arguments and returns stdout, or `{stdout, stderr}`. */
const COMMANDS = {
	sym: {
		args: [0, 1],
		run(q, pos) {
			const { defs } = q.ix;
			const count = (d) => q.importerCounts.get(d.file) ?? 0;
			if (q.opts.match === undefined) {
				if (pos.length !== 1) throw usage('sym takes a name, or --match <part>');
				const name = pos[0];
				const hits = defs.filter((d) => d.text && (d.symNames ?? d.names).includes(name)).sort((a, b) => count(b) - count(a) || cmp(a.id, b.id));
				if (!hits.length) throw noMatch(name, q.ix.defs.filter((d) => d.text).flatMap((d) => d.symNames ?? d.names));
				return q.answer('sym', name, hits.map((d) => ({ text: d.text, file: d.file })));
			}
			if (pos.length) throw usage('sym takes a name or --match, not both');
			const p = q.opts.match;
			const re = /^\/(.+)\/$/.exec(p);
			let rank;
			if (re) {
				let rx;
				try {
					rx = new RegExp(re[1], 'i');
				} catch {
					throw usage(`invalid regex ${p}`);
				}
				rank = (n) => (rx.test(n) ? 2 : null);
			} else {
				const l = p.toLowerCase();
				rank = (n) => {
					const x = n.toLowerCase();
					return x === l ? 0 : x.startsWith(l) ? 1 : x.includes(l) ? 2 : null;
				};
			}
			const hits = [];
			for (const d of defs) {
				if (!d.text) continue;
				const ranks = (d.symNames ?? d.names).map(rank).filter((r) => r !== null);
				if (ranks.length) hits.push({ d, rank: Math.min(...ranks) });
			}
			hits.sort((a, b) => a.rank - b.rank || count(b.d) - count(a.d) || cmp(a.d.id, b.d.id));
			return q.answer('sym', `--match ${p}`, hits.map(({ d }) => ({ text: d.text, file: d.file })));
		},
	},

	file: {
		args: [1, 1],
		run(q, [arg]) {
			const { id: file } = q.resolve(arg, ['file']);
			if (!isCarded(q.model, file))
				throw new QueryError(1, `no card for '${file}': test, e2e, components/ui and contracts/generated files have none; try q deps ${file}\n`);
			const { card, calls } = renderCard(q.model, file);
			const name = q.opts.section;
			if (name === undefined) {
				const big = Buffer.byteLength(card, 'utf8') > CARD_HINT_BYTES;
				return { stdout: card, stderr: big ? `card is over 28 KB: use q file ${file} --section <name>, or Read codemap/files/${file}.md\n` : '' };
			}
			if (!SECTIONS.includes(name)) throw noMatch(name, SECTIONS);
			const lines = (name === 'calls' && calls ? cardSection(calls, 'calls') : cardSection(card, name)) ?? [];
			return q.answer('file', `${file} --section ${name}`, lines.map((text) => ({ text, file })));
		},
	},

	importers: {
		args: [1, 1],
		run(q, [arg]) {
			const { model } = q;
			const t = q.resolve(arg, ['file', 'symbol', 'dto']);
			if (t.kind === 'file') return q.answer('importers', t.id, q.importerEdges(t.id, q.opts.tests).map((e) => ({ text: impLine(e), file: e.from })));
			if (t.kind === 'dto') {
				const first = new Map();
				const add = (from, line) => {
					if ((q.opts.tests || !model.isTest(from)) && (!first.has(from) || line < first.get(from))) first.set(from, line);
				};
				for (const r of model.resolved) if (r.id === t.id) add(r.from, r.specLine);
				const ts = model.dtos.find((d) => `dto:${d.name}` === t.id)?.ts;
				for (const r of model.reexports) {
					const edge = r.id === t.id && model.edges.find((e) => e.from === r.from && e.target === ts);
					if (edge) add(r.from, edge.line);
				}
				const rows = [...first.keys()]
					.sort((a, b) => Number(model.isTest(a)) - Number(model.isTest(b)) || cmp(a, b))
					.map((f) => ({ text: byLine(t.id, { file: f, line: first.get(f), enclosing: '(module)', kind: 'import', more: 0 }), file: f }));
				return q.answer('importers', t.id, rows);
			}
			const users = [...(model.users.get(t.id) ?? model.rustUsers.get(t.id) ?? [])];
			if (q.opts.tests) {
				const all = usersBySymbol(model.resolved, model.uses, () => false, model.mounts).get(t.id) ?? [];
				users.push(...all.filter((u) => model.isTest(u.file)));
				const rust = new Map();
				for (const c of model.rustCalls) if (c.target === t.id && model.isTest(c.file) && !rust.has(c.file)) rust.set(c.file, { ...c, more: 0 });
				users.push(...[...rust.keys()].sort(cmp).map((f) => rust.get(f)));
			}
			return q.answer('importers', t.id, users.map((u) => ({ text: byLine(t.id, u), file: u.file })));
		},
	},

	deps: {
		args: [1, 1],
		run(q, [arg]) {
			const { model } = q;
			const t = q.resolve(arg, ['file', 'module']);
			if (t.kind === 'module') {
				const out = model.moduleEdges.filter((e) => e.from === t.id).sort((a, b) => cmp(a.to, b.to));
				return q.answer('deps', t.id, out.map((e) => ({ text: depLine(e), module: e.to })));
			}
			if (model.isTest(t.id)) {
				const out = model.tests.filter((x) => x.test === t.id).sort((a, b) => cmp(a.target, b.target));
				return q.answer('deps', t.id, out.map((x) => ({ text: testLine(x), file: x.target })));
			}
			const out = q.ctx.imports.get(t.id) ?? [];
			return q.answer('deps', t.id, out.map((e) => ({ text: impLine(e), file: e.target.startsWith('pkg:') ? null : e.target })));
		},
	},

	callers: {
		args: [1, 1],
		run(q, [arg]) {
			const { model } = q;
			const t = q.resolve(arg, ['symbol', 'ipc', 'event']);
			const keep = (f) => q.opts.tests || !model.isTest(f);
			let sites;
			if (t.kind === 'ipc') {
				const c = model.commands.find((x) => `ipc:${x.name}` === t.id);
				sites = c.callers.map((s) => ({ ...s, target: t.id, kind: 'call' }));
			} else if (t.kind === 'event') {
				const e = model.events.find((x) => `event:${x.name}` === t.id);
				sites = [...e.emits.map((s) => ({ ...s, target: t.id, kind: 'emit' })), ...e.listens.map((s) => ({ ...s, target: t.id, kind: 'listen' }))];
			} else if (q.ix.members.has(t.id)) {
				const { st, m } = q.ix.members.get(t.id);
				sites = q.memberSites(st, m, (f) => !model.isTest(f));
				if (q.opts.tests) sites.push(...q.useSites(t.id, (f) => model.isTest(f)));
			} else sites = q.useSites(t.id, keep);
			return q.answer('callers', t.id, q.callRows(sites.filter((s) => keep(s.file))));
		},
	},

	calls: {
		args: [1, 1],
		run(q, [arg]) {
			const t = q.resolve(arg, ['file', 'symbol']);
			const file = fileOf(t.id);
			const name = t.kind === 'file' ? null : t.id.slice(file.length + 1);
			const lines = fileCalls(q.model, q.ctx, file).filter((l) => name === null || name === 'default' || l.split(' ')[3] === name);
			return q.answer('calls', t.id, lines.map((text) => ({ text, file: fileOf(text.split(' ')[5]) })));
		},
	},

	impact: {
		args: [1, 1],
		run(q, [arg]) {
			const { model } = q;
			const t = q.resolve(arg, ['file', 'symbol']);
			const depth = q.opts.depth ?? 2;
			const visited = new Set([t.id]);
			let frontier = [t.id];
			const levels = [];
			for (let d = 1; d <= depth && frontier.length; d++) {
				const edges = [];
				const fresh = [];
				for (const node of frontier)
					for (const e of q.impactPreds(node)) {
						edges.push(e);
						if (visited.has(e.node)) continue;
						visited.add(e.node);
						fresh.push(e);
					}
				levels.push({ edges, fresh });
				frontier = fresh.map((e) => e.node).sort(cmp);
			}
			const rows = [heading('depth 1'), ...(levels[0]?.edges ?? []).map((e) => ({ text: e.text, file: e.file }))];
			const later = new Set();
			levels.slice(1).forEach((lvl, i) => {
				if (!lvl.fresh.length) return;
				const files = [...new Set(lvl.fresh.map((e) => fileOf(e.node)))].filter((f) => q.isFile(f));
				for (const f of files) later.add(f);
				const mods = groupCounts(files.map((f) => model.moduleOf(f) ?? posix.dirname(f)));
				rows.push(
					heading(`depth ${i + 2}`),
					summary(`depth ${i + 2} nodes ${lvl.fresh.length} files ${files.length}: ${mods} · via ${groupCounts(lvl.fresh.map((e) => e.via))}`),
				);
			});
			const rank = new Map(model.hubs.map((h, i) => [h.file, i]));
			const top = [...later].filter((f) => rank.has(f)).sort((a, b) => rank.get(a) - rank.get(b)).slice(0, IMPACT_TOP_FILES);
			if (top.length) {
				rows.push(heading('top files (depth 2+)'));
				for (const f of top) {
					const h = model.hubs[rank.get(f)];
					rows.push(summary(`hub ${h.layer} ${h.file} in${h.prod} t${h.test}`));
				}
			}
			if (q.opts.tests) {
				const files = new Set([...visited].map(fileOf).filter((f) => q.isFile(f)));
				const first = new Map();
				for (const x of model.tests) if (files.has(x.target) && !first.has(x.test)) first.set(x.test, x);
				rows.push(heading('tests'), ...[...first.keys()].sort(cmp).map((k) => ({ text: testLine(first.get(k)), file: k })));
			}
			return q.answer('impact', t.id, rows);
		},
	},

	path: {
		args: [2, 2],
		run(q, [a, b]) {
			const { model } = q;
			const A = q.resolve(a, ['file', 'module']);
			const B = q.resolve(b, ['file', 'module']);
			const byModule = A.kind === 'module' || B.kind === 'module';
			let next;
			if (byModule) {
				const out = new Map();
				for (const e of model.moduleEdges) bucket(out, e.from).push(e);
				next = (n) => [...(out.get(n) ?? [])].sort((x, y) => cmp(x.to, y.to)).map((e) => ({ to: e.to, text: depLine(e), module: e.to }));
			} else
				next = (n) => {
					const first = new Map();
					for (const e of model.imports.get(n) ?? []) if (!first.has(e.target) || e.line < first.get(e.target).line) first.set(e.target, e);
					return [...first.keys()].sort(cmp).map((to) => ({ to, text: impLine(first.get(to)), file: n }));
				};
			const node = (t) => (byModule && t.kind === 'file' ? (model.moduleOf(t.id) ?? t.id) : t.id);
			const [from, to] = [node(A), node(B)];
			const id = `${A.id} -> ${B.id}`;
			if (from === to) return sameNode('path', A, B, from);
			const forward = bfs([from], (n) => n === to, next, Infinity);
			if (forward) return q.answer('path', id, forward);
			const back = bfs([to], (n) => n === from, next, Infinity);
			if (back) return q.answer('path', id, [summary(`reverse: no import path from ${A.id} to ${B.id}; the path from ${B.id} to ${A.id}:`), ...back]);
			return `# path ${id} total 0 (prod 0, tests 0)\nno path\n`;
		},
	},

	flow: {
		args: [2, 2],
		run(q, [a, b]) {
			const { model } = q;
			const kinds = ['symbol', 'file', 'module', 'ipc', 'event'];
			const A = q.resolve(a, kinds);
			const B = q.resolve(b, kinds);
			const out = new Map();
			const nodes = new Set();
			for (const e of model.symbolEdges) {
				bucket(out, e.from).push(e);
				nodes.add(e.from);
				nodes.add(e.to);
			}
			const single = (t) => t.kind !== 'file' && t.kind !== 'module';
			const holds = (t) => (n) => {
				if (single(t)) return n === t.id;
				const f = fileOf(n);
				return t.kind === 'file' ? f === t.id : q.isFile(f) && model.moduleOf(f) === t.id;
			};
			const starts = single(A) ? [A.id] : [...nodes].filter(holds(A)).sort(cmp);
			const depth = q.opts.depth ?? FLOW_DEPTH;
			const hit = starts.find(holds(B));
			if (hit !== undefined) return sameNode('flow', A, B, hit);
			const next = (n) => (out.get(n) ?? []).map((e) => ({ to: e.to, text: `${e.kind} ${e.file}:${e.line} ${e.from} -> ${e.to}`, file: e.file }));
			const hops = bfs(starts, holds(B), next, depth);
			const id = `${A.id} -> ${B.id}`;
			if (hops?.length) return q.answer('flow', id, hops);
			return `# flow ${id} total 0 (prod 0, tests 0)\nno flow within depth ${depth}\n`;
		},
	},

	ipc: {
		args: [1, 1],
		run(q, [arg]) {
			const name = arg.startsWith('ipc:') ? arg.slice(4) : arg;
			const c = q.model.commands.find((x) => x.name === name);
			if (!c) throw noMatch(arg, q.model.commands.map((x) => x.name));
			const id = `ipc:${c.name}`;
			const contracts = 'src/lib/contracts/commands.ts';
			const rows = [
				{ text: `ipc ${id} args ${c.contract ? `${c.contract.args} -> ${c.contract.result}` : '!no-contract'}`, file: c.contract ? contracts : null },
				c.rust ? { text: `ipc ${id} rust ${c.rust.file}:${c.rust.line}`, file: c.rust.file } : { text: `ipc ${id} rust !no-rust-fn` },
				c.reg ? { text: `ipc ${id} reg ${c.reg.file}:${c.reg.line}`, file: c.reg.file } : { text: `ipc ${id} reg -` },
				...c.keys.map((k) => ({ text: `ipc ${id} key ${k.file}:${k.line}`, file: k.file })),
				...c.callers.map((s) => ({ text: q.ipcCallLine(c, s), file: s.file })),
			];
			if (c.contract?.doc) rows.push({ text: `ipc ${id} doc ${c.contract.doc}`, file: contracts });
			return q.answer('ipc', id, rows);
		},
	},

	event: {
		args: [1, 1],
		run(q, [arg]) {
			const { events } = q.model;
			const bare = arg.startsWith('event:') ? arg.slice(6) : arg.startsWith('EVENT_NAMES.') ? arg.slice(12) : arg;
			const e = events.find((x) => x.name === bare || x.const?.constName === bare || x.ts?.key === bare);
			if (!e) throw noMatch(arg, events.flatMap((x) => [x.name, x.const?.constName, x.ts && `EVENT_NAMES.${x.ts.key}`].filter(Boolean)));
			const id = `event:${e.name}`;
			const site = (s) => `${s.file}:${s.line} in ${s.enclosing}`;
			const rows = [];
			if (e.const) rows.push({ text: `event ${id} const ${e.const.constName} ${e.const.file}:${e.const.line}`, file: e.const.file });
			if (e.ts) rows.push({ text: `event ${id} ts EVENT_NAMES.${e.ts.key} ${e.ts.file}:${e.ts.line}`, file: e.ts.file });
			rows.push({ text: `event ${id} payload ${e.payload ?? '-'}`, file: e.ts?.file ?? null });
			rows.push(...e.emits.map((s) => ({ text: `event ${id} emit ${site(s)}`, file: s.file })));
			rows.push(...e.listens.map((s) => ({ text: `event ${id} listen ${site(s)}`, file: s.file })));
			for (const em of e.emits) for (const l of e.listens) rows.push({ text: `ev ${site(em)} -> ${id} -> ${site(l)}`, file: em.file });
			if (e.const?.doc) rows.push({ text: `event ${id} doc ${e.const.doc}`, file: e.const.file });
			return q.answer('event', id, rows);
		},
	},

	store: {
		args: [1, 1],
		run(q, [arg]) {
			const { model } = q;
			const stores = model.stores.filter((st) => !model.isTest(st.file));
			const st = stores.find((s) => arg === s.name || arg === s.id || arg === s.file);
			if (st)
				return q.answer('store', st.id, [
					{ text: storeLine(st), file: st.file },
					...st.members.flatMap((m) => memLines(st, m, q.ctx.group).map((text) => ({ text, file: st.file }))),
				]);
			const hits = stores.flatMap((s) => s.members.map((m) => ({ s, m }))).filter(({ s, m }) => arg === m.id || arg === `${s.name}.${m.name}`);
			if (hits.length > 1) throw ambiguous(hits.map(({ m }) => m.id));
			if (!hits.length) throw noMatch(arg, stores.flatMap((s) => [s.name, ...s.members.map((m) => `${s.name}.${m.name}`)]));
			const { s, m } = hits[0];
			const texts = q
				.memberSites(s, m, (f) => !model.isTest(f))
				.sort((x, y) => cmp(x.file, y.file) || x.line - y.line || cmp(x.target, y.target) || cmp(x.kind, y.kind))
				.map((x) => ({ text: `call ${x.file}:${x.line} in ${x.enclosing} -> ${x.target} ${x.kind} ${x.role}`, file: x.file }));
			const sites = [...new Map(texts.map((r) => [r.text, r])).values()];
			return q.answer('store', m.id, [{ text: memLines(s, m, q.ctx.group)[0], file: s.file }, ...sites]);
		},
	},

	sink: {
		args: [1, 1],
		run(q, [arg]) {
			const { model } = q;
			const isClass = EFFECT_CLASSES.includes(arg);
			if (!isClass && !model.effects.some((e) => e.sink === arg)) throw noMatch(arg, [...EFFECT_CLASSES, ...model.effects.map((e) => e.sink)]);
			const sites = model.effects
				.filter((e) => (isClass ? e.class === arg : e.sink === arg))
				.sort((a, b) => cmp(a.sink, b.sink) || cmp(a.file, b.file) || a.line - b.line || cmp(a.arg, b.arg) || cmp(a.enclosing, b.enclosing));
			const rows = sites.map((e) => ({ text: fxLine(e), file: e.file }));
			const seen = new Set(sites.map((e) => `${e.file}:${e.enclosing}`));
			let frontier = [...seen].sort(cmp);
			for (let hop = 1; hop <= (q.opts.up ?? 0) && frontier.length; hop++) {
				const up = frontier.flatMap((n) => q.callersOf(n));
				rows.push(heading(`up ${hop}`), ...new Map(up.map((r) => [r.text, r])).values());
				frontier = [...new Set(up.map((r) => r.node))].filter((n) => !seen.has(n)).sort(cmp);
				for (const n of frontier) seen.add(n);
			}
			return q.answer('sink', arg, rows);
		},
	},

	tests: {
		args: [1, 1],
		run(q, [arg]) {
			const { id: file } = q.resolve(arg, ['file']);
			const rows = (q.ctx.tests.get(file) ?? []).map((t) => ({ text: testLine(t), file: t.test }));
			if (q.model.rust.get(file)?.inlineTests) rows.push({ text: `t:inline ${file}`, file, test: true });
			return q.answer('tests', file, rows);
		},
	},

	hubs: {
		args: [0, 0],
		run(q) {
			const { model } = q;
			const { layer } = q.opts;
			if (layer !== undefined && !model.hubsByLayer.has(layer)) throw noMatch(layer, model.hubsByLayer.keys());
			const rows = model.hubs
				.filter((h) => layer === undefined || h.layer === layer)
				.map((h) => ({ text: `hub ${h.layer} ${h.file} in${h.prod} t${h.test}`, file: h.file }));
			return q.answer('hubs', layer ?? 'all', rows);
		},
	},

	reg: {
		args: [1, 1],
		run(q, [arg]) {
			const { registries } = q.model;
			const short = (r) => r.id.slice(r.file.length + 1);
			let hits = registries.filter((r) => r.id === arg);
			if (!hits.length) hits = registries.filter((r) => short(r) === arg);
			if (hits.length > 1) throw ambiguous(hits.map((r) => r.id));
			if (!hits.length) throw noMatch(arg, registries.flatMap((r) => [r.id, short(r)]));
			const r = hits[0];
			const loc = /^(?:src|src-tauri|e2e)\/\S+:\d+$/;
			const rows = wiringLines(q.model, r, q.ctx.group, Infinity).map((text) => {
				const tok = text.split(' | ')[0].split(' ').slice(2).find((x) => loc.test(x));
				return { text, file: tok ? fileOf(tok) : r.file };
			});
			return q.answer('reg', r.id, rows);
		},
	},
};

/**
 * Runs one `q` command line.
 *
 * @param {string[]} argv the arguments after `q`
 * @param {() => ReturnType<typeof import('./model.mjs').buildModel>} getModel
 *   builds the model; not called for `help` or a usage error
 * @returns {{code: number, stdout: string, stderr: string}} exit 0 found, 1 no
 *   match or ambiguous, 2 usage error
 */
export function runQuery(argv, getModel) {
	try {
		const { command, pos, opts } = parseArgs(argv);
		if (command === 'help') {
			if (pos.length) throw usage('help takes no argument');
			return { code: 0, stdout: HELP, stderr: '' };
		}
		if (!Object.hasOwn(COMMANDS, command)) throw usage(`unknown command '${command}'`);
		const spec = COMMANDS[command];
		const [min, max] = spec.args;
		if (opts.match === undefined && (pos.length < min || pos.length > max))
			throw usage(`${command} takes ${min === max ? min : `${min} or ${max}`} argument${max === 1 ? '' : 's'}`);
		const res = spec.run(new Query(getModel(), opts), pos);
		return typeof res === 'string' ? { code: 0, stdout: res, stderr: '' } : { code: 0, ...res };
	} catch (e) {
		if (e instanceof QueryError) return { code: e.code, stdout: '', stderr: e.message };
		throw e;
	}
}
