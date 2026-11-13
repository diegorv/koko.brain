// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * render.mjs
 *
 * The code map shards: line rendering (spec section 6 grammar), the section 5
 * list caps and calls split, and the assembly of every output file of
 * `codemap/` from one model (file and module cards, `modules.md`, `ipc/*`,
 * `wiring.md`, `stores.md`, `effects/*`, `INDEX.md`).
 */
import { posix } from 'node:path';

import { locate, PLUGIN_ALLOWLIST, ruleFor } from '../import-graph.mjs';
import { EXAMPLE_RELATION } from './model.mjs';

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Most `by` lines per symbol before a `more` line. */
const BY_CAP = 8;

/** Most groups a `more` line names. */
const MORE_GROUPS = 8;

/** Most groups the `more` hint inside an in-line list names, so the line stays short. */
const IN_LINE_MORE_GROUPS = 3;

/**
 * The `more` line that ends a capped list:
 * `more <what> <n> not shown: <group>(<k>) … [+<m> modules]: q <query>`, the
 * groups by count descending then code unit, at most `maxGroups` of them,
 * `+<m> modules` only when more groups exist.
 *
 * @param {string} what the list, e.g. `by`
 * @param {string[]} groups the group (module) of each item not shown
 * @param {string} query the `q` command and its argument
 * @param {number} [maxGroups] at most 8
 * @returns {string}
 */
export function moreLine(what, groups, query, maxGroups = MORE_GROUPS) {
	const counts = new Map();
	for (const g of groups) counts.set(g, (counts.get(g) ?? 0) + 1);
	const sorted = [...counts.keys()].sort(cmp).sort((a, b) => counts.get(b) - counts.get(a));
	const named = sorted.slice(0, maxGroups).map((g) => `${g}(${counts.get(g)})`);
	const rest = sorted.length - maxGroups;
	return `more ${what} ${groups.length} not shown: ${named.join(' ')}${rest > 0 ? ` +${rest} modules` : ''}: q ${query}`;
}

/**
 * One `by` line: `by <id> <- <loc> in <enclosing> <kind> [+<n>]`.
 *
 * @param {string} id the symbol ID
 * @param {{file: string, line: number, enclosing: string, kind: string, more: number}} u a `usersBySymbol` entry
 * @returns {string}
 */
export function byLine(id, u) {
	return `by ${id} <- ${u.file}:${u.line} in ${u.enclosing} ${u.kind}${u.more ? ` +${u.more}` : ''}`;
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
	const lines = users.slice(0, BY_CAP).map((u) => byLine(id, u));
	if (users.length > BY_CAP) lines.push(moreLine('by', users.slice(BY_CAP).map((u) => moduleOf(u.file)), `importers ${id}`));
	return lines;
}

/**
 * Most items of an in-line list before a `more` hint (section 5 "any other
 * in-line list" and DTO `used-by`), lowered from 8 so an `ipc/*` or `entry`
 * line with its `more` hint and a doc stays well under 1000 chars.
 */
const LIST_CAP = 5;

/** A location as `<file>:<line>`. */
const at = (l) => `${l.file}:${l.line}`;

/** A site as `<file>:<line> in <enclosing>`. */
const site = (s) => `${at(s)} in ${s.enclosing}`;

/** A ` | ` inside copied text (a doc, a union type) becomes ` / `, so only field separators remain. */
const field = (s) => s.replaceAll(' | ', ' / ');

/**
 * An in-line list: `-` when empty, else at most 5 items joined by `sep`, then
 * a `more` hint naming at most 3 groups of the rest.
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
	if (items.length > LIST_CAP) shown.push(moreLine(what, items.slice(LIST_CAP).map(group), query, IN_LINE_MORE_GROUPS));
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
		`returned-by ${ids('ipc:', d.returnedBy, 'returned-by', `importers ${id}`)}`,
		`arg-of ${ids('ipc:', d.argOf, 'arg-of', `importers ${id}`)}`,
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

/** Size budgets of every output file (section 5); `splitBytes` triggers the calls split. */
export const BUDGET = {
	maxBytes: 48 * 1024,
	maxLines: 1500,
	maxLineChars: 1000,
	splitBytes: 40 * 1024,
	indexLines: 200,
	indexBytes: 12 * 1024,
};

/** Line 1 of `INDEX.md`, which is also the write-safety marker of an output folder. */
export const INDEX_TITLE = '# Kokobrain code map';

/** The effect classes, one `effects/<class>.md` each. */
export const EFFECT_CLASSES = ['disk-write', 'disk-read', 'host', 'timer', 'reactive', 'dom', 'db', 'spawn'];

/** The tag every fact line starts with, across all shards. */
export const LINE_TAGS = [
	'file',
	'imp',
	'in2',
	'out2',
	'test',
	'sym',
	'by',
	'local',
	'store',
	'mem',
	'call',
	'mount',
	'fx',
	'reg',
	'ipc-call',
	'ev',
	'ipc',
	'event',
	'dto',
	'dep',
	'entry',
	'module',
	'layer',
	'rule',
	'debt',
	'fx-count',
	'ipc-count',
	'hub',
	'more',
];

/** Most `imp` lines in a card's `imported-by` section. */
const IMPORTED_BY_CAP = 40;

/** Most `test` lines on a card. */
const TESTS_CAP = 40;

/** Most `mount` lines in a card's `mounted-at` section. */
const MOUNTED_AT_CAP = 40;

/** Most sites listed inside one `mem` field before only a `more` line with groups remains. */
const MEM_SITES_CAP = 6;

/** Most `ipc-call` lines per command and `ev` lines per event on one Rust card. */
const XLANG_CAP = 12;

/**
 * Most `read-by`, `fired-by`, `registered-at` and `invoked-at` lines per
 * registry in `wiring.md`, lowered from 20 so the file keeps headroom under 48 KB.
 */
const WIRING_CAP = 10;

/** Modules named on an `in2` or `out2` line. */
const REACH_CAP = 5;

/** Layers whose hubs INDEX lists, in this order (F14). */
const HUB_LAYERS = ['app', 'routes', 'core', 'features', 'plugins', 'utils', 'lib-root', 'contracts', 'types', 'rust'];

/** Hubs per layer in INDEX. */
const HUBS_PER_LAYER = 3;

/** Files with more lines than this get a `sections:` line 3. */
const SECTIONS_LINE_AFTER = 100;

/** The INDEX blind-spot list: what the map does not track (section 8). */
const BLIND_SPOTS = [
	'Module-level $state outside store objects, and Svelte onMount/onDestroy: not tracked.',
	'CodeMirror extensions wired by value (ViewPlugin.fromClass, StateField.define): plain imports only.',
	'Calls through stored callbacks, string ids and mod commands at runtime: not tracked.',
	'Namespace imports and non-destructured dynamic imports: file level only, no symbol uses.',
	'Svelte $effect and $derived: direct store reads only, not reads inside the functions they call.',
	'Svelte markup: uses only inside {…} expressions; <svelte:component>, {@render} and <Ns.Item> are no mounts.',
	'Rust trait dispatch, macros and items inside inline modules: not tracked.',
	'Rust .method() calls: only pub methods with a crate-unique name that contains _ (lexical-method).',
	'Frontend-to-Rust events and frontend-only event buses: none exist, so none are tracked.',
	'The rust-db.execute receiver and the DOM listener receiver: not resolved.',
	'Settings key joins (AppSettings, DEFAULT_SETTINGS) beyond settingsStore members: not tracked.',
	'Imports of unparsed files (.js, .json, scripts): file edges only, no symbols.',
	'Test, e2e and crate example (src-tauri/examples) files: graph nodes for test lines and q --tests answers, no cards.',
];

/** A copied excerpt on one line: tabs and newlines as spaces, ` | ` as ` / `. */
const excerpt = (s) => field(s.replace(/[\t\r\n]+/g, ' '));

/** UTF-8 size of a text. */
const bytesOf = (s) => Buffer.byteLength(s, 'utf8');

/** Number of lines of a source text. */
const lineCountOf = (t) => (t === '' ? 0 : t.split('\n').length - (t.endsWith('\n') ? 1 : 0));

/** `map.get(key)`, creating an empty array first. */
function bucket(map, key) {
	if (!map.has(key)) map.set(key, []);
	return map.get(key);
}

/** Names of a `w-via` list, comma-joined, at most 5, then `+<n>`. */
function capNames(names) {
	if (names.length <= LIST_CAP) return names.join(',');
	return `${names.slice(0, LIST_CAP).join(',')},+${names.length - LIST_CAP}`;
}

/** The first `cap` items as lines, then a `more` line grouping the rest. */
function capped(items, cap, fmt, group, what, query) {
	const out = items.slice(0, cap).map(fmt);
	if (items.length > cap) out.push(moreLine(what, items.slice(cap).map(group), query));
	return out;
}

/** The `## <name>` heading and lines of each non-empty section. */
function sectionLines(sections) {
	return sections.flatMap(([name, lines]) => (lines.length ? [`## ${name}`, ...lines] : []));
}

/**
 * One output file: title, `cols:` line, a `sections:` line when the file has
 * over 100 lines, then the body; LF, final newline, no trailing spaces.
 */
function shard(title, cols, body) {
	const head = [title, cols];
	if (body.length + 2 > SECTIONS_LINE_AFTER) {
		const names = body.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
		head.push(`sections: ${names.length ? names.join(', ') : 'none'}`);
	}
	return `${[...head, ...body].map((l) => l.trimEnd()).join('\n')}\n`;
}

/** Whether a production file gets a card: not `components/ui` and not ts-rs output. */
export const isCarded = (model, f) =>
	!model.isTest(f) && !f.startsWith('src/lib/components/ui/') && !f.startsWith('src/lib/contracts/generated/');

/** The ID of a TS symbol: `<file>:default` for a component, else `<file>:<name>`. */
export const symId = (file, s) => (s.kind === 'component' ? `${file}:default` : `${file}:${s.name}`);

/**
 * Indexes of the model the shards and the query CLI share, each list in output order.
 *
 * @param {ReturnType<typeof import('./model.mjs').buildModel>} model
 */
export function context(model) {
	const { isTest } = model;
	const group = (f) => model.moduleOf(f) ?? posix.dirname(f);
	const imports = new Map();
	const importers = new Map();
	for (const e of model.edges) {
		bucket(imports, e.from).push(e);
		if (!isTest(e.from)) bucket(importers, e.target).push(e);
	}
	for (const e of model.packageImports) bucket(imports, e.from).push(e);
	for (const l of imports.values()) l.sort((a, b) => a.line - b.line || cmp(a.target, b.target));
	for (const l of importers.values()) l.sort((a, b) => cmp(a.from, b.from) || a.line - b.line);
	const tests = new Map();
	for (const t of model.tests) bucket(tests, t.target).push(t);
	for (const l of tests.values()) l.sort((a, b) => Number(b.mirror) - Number(a.mirror) || cmp(a.relation, b.relation) || cmp(a.test, b.test));
	const uses = new Map();
	for (const u of model.uses) if (!isTest(u.file)) bucket(uses, u.file).push(u);
	const rustCalls = new Map();
	for (const c of model.rustCalls) if (!isTest(c.file)) bucket(rustCalls, c.file).push(c);
	const effects = new Map();
	for (const e of model.effects) bucket(effects, e.file).push(e);
	const regs = new Map();
	for (const r of model.registries) for (const s of r.registeredAt) bucket(regs, s.file).push({ line: s.line, text: cardRegLine(r, s) });
	const mountsFrom = new Map();
	const mountsTo = new Map();
	for (const m of model.mounts) {
		if (isTest(m.file)) continue;
		bucket(mountsFrom, m.file).push(m);
		bucket(mountsTo, m.target).push(m);
	}
	for (const l of mountsTo.values()) l.sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.name, b.name));
	const stores = new Map();
	for (const st of model.stores) bucket(stores, st.file).push(st);
	const ids = new Set();
	const fns = new Set();
	for (const file of [...model.ts.keys()].sort(cmp)) {
		const facts = model.ts.get(file);
		for (const s of facts.symbols) {
			ids.add(symId(file, s));
			if (s.kind === 'fn' || s.kind === 'method') fns.add(symId(file, s));
		}
		for (const l of facts.locals) {
			ids.add(`${file}:${l.name}`);
			fns.add(`${file}:${l.name}`);
		}
		for (const obj of [...facts.objects.keys()].sort(cmp))
			for (const m of facts.objects.get(obj)) {
				ids.add(`${file}:${obj}.${m}`);
				fns.add(`${file}:${obj}.${m}`);
			}
	}
	for (const st of model.stores) for (const m of st.members) ids.add(m.id);
	const moduleFiles = new Map(model.modules.map((m) => [m, []]));
	const files = [...model.files].sort(cmp);
	for (const f of files) {
		const m = model.moduleOf(f);
		if (m && !isTest(f)) moduleFiles.get(m).push(f);
	}
	return {
		group,
		imports,
		importers,
		tests,
		uses,
		rustCalls,
		effects,
		regs,
		xlang: crossLanguageLines(model.commands, model.events),
		mountsFrom,
		mountsTo,
		stores,
		ids,
		fns,
		moduleFiles,
		carded: files.filter((f) => isCarded(model, f)),
		fileLines: new Map(),
	};
}

/** An `imp` line: `imp <importer>:<line> -> <target> <names>`. */
export const impLine = (e) => `imp ${e.from}:${e.line} -> ${e.target} ${e.names.join(',')}`;

/** A `test` line: `test <test file> imports|mocks|e2e|example <file> [mirror]`. */
export const testLine = (t) => `test ${t.test} ${t.relation} ${t.target}${t.mirror ? ' mirror' : ''}`;

/** A `mount` line: `mount <loc> <Name> -> <component file>`. */
export const mountLine = (m) => `mount ${m.file}:${m.line} ${m.name} -> ${m.target}`;

/** An `fx` line: `fx <loc> <sink> [<arg>] in <enclosing>`. */
export const fxLine = (e) => `fx ${e.file}:${e.line} ${e.sink}${e.arg ? ` ${excerpt(e.arg)}` : ''} in ${e.enclosing}`;

/** A card `reg` line: `reg <loc> <registry id> in <enclosing> [args=<text>]`. */
const cardRegLine = (r, s) => `reg ${s.file}:${s.line} ${r.id} in ${s.enclosing}${s.args ? ` args=${excerpt(s.args)}` : ''}`;

/** A `sym` line: `sym <loc> <kind> <name><sig> L<span>[<extra>] [| doc]`. */
export const symLine = (file, s, extra = '') =>
	`sym ${file}:${s.line} ${s.kind} ${s.name}${excerpt(s.sig)} L${s.span}${extra}${s.doc ? ` | ${excerpt(s.doc)}` : ''}`;

/** A `local` line: `local <loc> fn <name><sig> L<span>`. */
export const localLine = (file, l) => `local ${file}:${l.line} fn ${l.name}${excerpt(l.sig)} L${l.span}`;

/** The `sym` line of a Rust item, with ` dto:<Name>` for a `#[ts(export)]` type. */
export const rustSymLine = (file, i) => symLine(file, i, i.dto ? ` dto:${i.name}` : '');

/** A `store` line of a card: `store <loc> <name> esc:<n>`. */
export const storeLine = (st) => `store ${st.file}:${st.line} ${st.name} esc:${st.esc}`;

/**
 * The `file` line: `file <path> <role> L<lines> module <m> in<n> t<n> [t:inline] [| header doc]`,
 * `in` counting distinct production importer files and `t` distinct test
 * files, crate examples left out of both.
 */
function fileLine(model, ctx, file) {
	if (ctx.fileLines.has(file)) return ctx.fileLines.get(file);
	const facts = model.ts.get(file);
	const rust = model.rust.get(file);
	const header = facts?.header || rust?.fileDoc || '';
	const inN = new Set((ctx.importers.get(file) ?? []).map((e) => e.from)).size;
	const tN = new Set((ctx.tests.get(file) ?? []).filter((t) => t.relation !== EXAMPLE_RELATION).map((t) => t.test)).size;
	const line = `file ${file} ${model.fileRole(file)} L${lineCountOf(model.inputs.get(file))} module ${model.moduleOf(file) ?? '-'} in${inN} t${tN}${rust?.inlineTests ? ' t:inline' : ''}${header ? ` | ${excerpt(header)}` : ''}`;
	ctx.fileLines.set(file, line);
	return line;
}

/**
 * An `in2` or `out2` line of a card: `<tag> <file> <n> files in <m> modules: <module>(<k>) …`,
 * the top 5 modules by count then path, then `+<r> modules[: q <query>]`;
 * `query` is null when no `q` command lists the rest.
 */
function reachLine(tag, subject, list, group, query) {
	const counts = new Map();
	for (const f of list) counts.set(group(f), (counts.get(group(f)) ?? 0) + 1);
	const mods = [...counts.keys()].sort(cmp).sort((a, b) => counts.get(b) - counts.get(a));
	const shown = mods.slice(0, REACH_CAP).map((m) => `${m}(${counts.get(m)})`);
	const rest = mods.length - REACH_CAP;
	return `${tag} ${subject} ${list.length} files in ${mods.length} modules: ${shown.join(' ') || '-'}${restText(rest, query)}`;
}

/** The ` +<r> modules[: q <query>]` tail of a reach line, empty when nothing is left out. */
const restText = (rest, query) => (rest > 0 ? ` +${rest} modules${query ? `: q ${query}` : ''}` : '');

/** Distinct `<file>:<line>` locations of sites, in their order. */
const locations = (sites) => [...new Set(sites.map(at))];

/**
 * The `mem` line of one store member, plus a `more` line per field over 6
 * sites: `mem <loc> get|set|do <store>.<member> r:<sites>|w:<sites> [w-via:<do members>] [| doc]`.
 * A `get` member shows `r:` (and `w:` when assigned); a `set` or `do` member `w:`.
 */
export function memLines(st, m, group) {
	const more = [];
	const sites = (tag, list) => {
		const locs = locations(list);
		if (!locs.length) return `${tag}:-`;
		if (locs.length <= MEM_SITES_CAP) return `${tag}:${locs.join(',')}`;
		more.push(moreLine(tag, locs.map((l) => group(l.slice(0, l.lastIndexOf(':')))), `store ${m.id}`));
		return `${tag}:${locs.length}`;
	};
	const parts = [`mem ${st.file}:${m.line} ${m.kind} ${st.name}.${m.name}`];
	if (m.kind === 'get') {
		parts.push(sites('r', m.readers));
		if (m.writers.length) parts.push(sites('w', m.writers));
	} else {
		parts.push(sites('w', m.writers));
		if (m.readers.length) parts.push(sites('r', m.readers));
	}
	if (m.wVia.length) parts.push(`w-via:${capNames(m.wVia)}`);
	return [`${parts.join(' ')}${m.doc ? ` | ${excerpt(m.doc)}` : ''}`, ...more];
}

/**
 * The `call` lines of a file, one per distinct (enclosing, target) pair:
 * `call <loc> in <enclosing> -> <target> <kind> [+<n>]`, the location and
 * kind those of the earliest site (kind by code unit on a tie), ordered by
 * (enclosing line, first site line, target). `rows` are F4 uses or Rust call
 * rows of the file, each with `line`, `enclosing`, `target`, `kind` and a
 * `site` key; `defLine` names the line each enclosing name is defined at.
 */
function callLines(file, rows, defLine) {
	const pairs = new Map();
	for (const r of rows) {
		const key = `${r.enclosing}\0${r.target}`;
		const p = pairs.get(key);
		if (!p) pairs.set(key, { ...r, sites: new Set([r.site]) });
		else {
			p.sites.add(r.site);
			if (r.line < p.line || (r.line === p.line && cmp(r.kind, p.kind) < 0)) {
				p.line = r.line;
				p.kind = r.kind;
			}
		}
	}
	const firstSite = new Map();
	for (const p of pairs.values()) if (!firstSite.has(p.enclosing) || p.line < firstSite.get(p.enclosing)) firstSite.set(p.enclosing, p.line);
	const encLine = (e) => defLine.get(e) ?? defLine.get(e.split('.')[0]) ?? Number(/@(\d+)$/.exec(e)?.[1] ?? firstSite.get(e));
	return [...pairs.values()]
		.sort((a, b) => encLine(a.enclosing) - encLine(b.enclosing) || a.line - b.line || cmp(a.target, b.target) || cmp(a.enclosing, b.enclosing))
		.map((p) => `call ${file}:${p.line} in ${p.enclosing} -> ${p.target} ${p.kind}${p.sites.size > 1 ? ` +${p.sites.size - 1}` : ''}`);
}

/**
 * The F4 call rows of a TS file: `call` and `mcall` uses, `ref` uses of a
 * function, markup ones printed `markup`. A method call on an object member
 * the model does not know as an ID (`arr.push()`) is a call of the object.
 */
function tsCallRows(ctx, file) {
	const out = [];
	for (const u of ctx.uses.get(file) ?? []) {
		const called = u.kind === 'call' || u.kind === 'mcall';
		if (!called && !(u.kind === 'ref' && ctx.fns.has(u.target))) continue;
		const target = ctx.ids.has(u.target) ? u.target : u.symbol;
		if (!ctx.ids.has(target)) continue;
		out.push({ line: u.line, enclosing: u.enclosing, target, kind: u.markup ? 'markup' : u.kind, site: u.site });
	}
	return out;
}

/**
 * Splits cross-language lines by command or event and caps each group at 12;
 * a group's `more` line takes the line of its last shown entry, so it sorts
 * right after the group.
 */
function cappedXlang(entries, keyRe, what, query, group) {
	const groups = new Map();
	for (const e of entries) bucket(groups, keyRe.exec(e.text)[1]).push(e);
	const out = [];
	for (const key of [...groups.keys()].sort(cmp)) {
		const list = groups.get(key);
		out.push(...list.slice(0, XLANG_CAP));
		if (list.length > XLANG_CAP) {
			const files = list.slice(XLANG_CAP).map((e) => group(e.text.split(' ')[1].replace(/:\d+$/, '')));
			out.push({ line: list[XLANG_CAP - 1].line, text: moreLine(what, files, query(key)) });
		}
	}
	return out;
}

/** Whether a Rust ID names a fn, command or method item, or a local fn. */
function isRustFn(model, id) {
	const file = id.slice(0, id.indexOf(':'));
	const name = id.slice(file.length + 1);
	const facts = model.rust.get(file);
	if (!facts) return false;
	if (facts.locals.some((l) => l.name === name)) return true;
	return facts.items.some((i) => i.name === name && /^(?:fn|cmd|method)\b/.test(i.kind));
}

/**
 * The `call` lines of one file's `calls` section: its F4 call rows (TS) or
 * Rust call rows (a `ref` only when it names a fn), ordered by the line each
 * enclosing name is defined at.
 *
 * @param {ReturnType<typeof import('./model.mjs').buildModel>} model
 * @param {ReturnType<typeof context>} ctx
 * @param {string} file
 * @returns {string[]}
 */
export function fileCalls(model, ctx, file) {
	const facts = model.ts.get(file);
	const rust = model.rust.get(file);
	const defLine = new Map();
	if (facts) {
		for (const x of [...facts.symbols, ...facts.locals]) defLine.set(x.name, x.line);
		return callLines(file, tsCallRows(ctx, file), defLine);
	}
	if (rust) {
		for (const x of [...rust.items, ...rust.locals]) defLine.set(x.name, x.line);
		return callLines(
			file,
			(ctx.rustCalls.get(file) ?? []).map((c, i) => ({ ...c, site: String(i) })).filter((c) => c.kind !== 'ref' || isRustFn(model, c.target)),
			defLine,
		);
	}
	return [];
}

/** The `cols:` line of every file card. */
const cardCols = (file) =>
	`cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> ${file} ' codemap/files`;

/**
 * Renders the card of one carded file, and its `calls` section as a separate
 * file when the card would exceed 40 KB with it inline.
 *
 * @returns {{card: string, calls: string | null, counts: {symbols: number, locals: number, calls: number}}}
 */
function renderFileCard(model, ctx, file) {
	const facts = model.ts.get(file);
	const rust = model.rust.get(file);
	const { group } = ctx;
	const importers = ctx.importers.get(file) ?? [];
	const symbols = [];
	const locals = [];
	let symCount = 0;
	if (facts) {
		for (const s of facts.symbols) symbols.push(symLine(file, s), ...byLines(symId(file, s), model.users.get(symId(file, s)), group));
		for (const l of facts.locals) locals.push(localLine(file, l));
		symCount = facts.symbols.length;
	} else if (rust) {
		for (const i of rust.items) symbols.push(rustSymLine(file, i), ...byLines(`${file}:${i.name}`, model.rustUsers.get(`${file}:${i.name}`), group));
		for (const l of rust.locals) locals.push(localLine(file, l));
		symCount = rust.items.length;
	}
	const store = (ctx.stores.get(file) ?? []).flatMap((st) => [storeLine(st), ...st.members.flatMap((m) => memLines(st, m, group))]);
	const xlang = ctx.xlang.get(file) ?? [];
	const ipcIn = rust
		? cappedXlang(
				xlang.filter((e) => e.text.startsWith('ipc-call ')),
				/ -> ipc:(\S+) -> /,
				'ipc-call',
				(cmd) => `callers ipc:${cmd}`,
				group,
			)
		: [];
	const ev = rust
		? cappedXlang(
				xlang.filter((e) => e.text.startsWith('ev ')),
				/ -> event:(\S+) -> /,
				'ev',
				(name) => `event event:${name}`,
				group,
			)
		: xlang;
	const effects = [
		...(ctx.effects.get(file) ?? []).map((e) => ({ line: e.line, text: fxLine(e) })),
		...(ctx.regs.get(file) ?? []),
		...ev,
	]
		.sort((a, b) => a.line - b.line || cmp(a.text, b.text))
		.map((e) => e.text);
	const calls = fileCalls(model, ctx, file);
	const body = (callsSection) => [
		fileLine(model, ctx, file),
		...sectionLines([
			['imports', (ctx.imports.get(file) ?? []).map(impLine)],
			['imported-by', capped(importers, IMPORTED_BY_CAP, impLine, (e) => group(e.from), 'imported-by', `importers ${file}`)],
			[
				'reach',
				[
					reachLine('in2', file, model.in2(file), group, `impact ${file} --depth 2`),
					reachLine('out2', file, model.out2(file), group, null),
				],
			],
			['tests', capped(ctx.tests.get(file) ?? [], TESTS_CAP, testLine, (t) => posix.dirname(t.test), 'tests', `tests ${file}`)],
			['symbols', symbols],
			['store', store],
			['locals', locals],
			['mounts', (ctx.mountsFrom.get(file) ?? []).map(mountLine)],
			['mounted-at', capped(ctx.mountsTo.get(file) ?? [], MOUNTED_AT_CAP, mountLine, (m) => group(m.file), 'mounted-at', `callers ${file}:default`)],
			['calls', callsSection],
			['ipc-in', ipcIn.sort((a, b) => a.line - b.line || cmp(a.text, b.text)).map((e) => e.text)],
			['effects', effects],
		]),
	];
	const title = `# file card ${file}`;
	let card = shard(title, cardCols(file), body(calls));
	let callsFile = null;
	if (bytesOf(card) > BUDGET.splitBytes && calls.length) {
		const path = `codemap/files/${file}.calls.md`;
		callsFile = shard(
			`# calls of ${file}`,
			`cols: call <loc> in <fn> -> <target> <kind> [+<n>] · grep: grep -F -- ' in <fn> -> ' ${path}`,
			['## calls', ...calls],
		);
		card = shard(title, cardCols(file), body([`more calls ${path}`]));
	}
	return { card, calls: callsFile, counts: { symbols: symCount, locals: locals.length, calls: calls.length } };
}

/**
 * Renders the card of one file, computed from the model, as `codemap/files/<file>.md`
 * holds it.
 *
 * @param {ReturnType<typeof import('./model.mjs').buildModel>} model
 * @param {string} file a carded production file
 * @returns {{card: string, calls: string | null}} `calls` is the
 *   `<file>.calls.md` text when the calls section was split off
 */
export function renderCard(model, file) {
	const { card, calls } = renderFileCard(model, context(model), file);
	return { card, calls };
}

/** The F7 layer of a module, from its first production file. */
const moduleLayer = (model, ctx, m) => model.layerOf(ctx.moduleFiles.get(m)[0] ?? `${m}/x`);

/**
 * Two-hop module reach: `<tag> <module> <n> modules: <module>(<k>) … [+<r> modules]`,
 * each count the distinct (far file, middle file) pairs of its file chains
 * (`moduleIn2Pairs` / `moduleOut2Pairs`). No `q` command takes a module for
 * two hops, so the overflow names none.
 */
function moduleReachLine(tag, m, counts) {
	const mods = [...counts.keys()].sort(cmp).sort((a, b) => counts.get(b) - counts.get(a));
	const shown = mods.slice(0, REACH_CAP).map((x) => `${x}(${counts.get(x)})`);
	const rest = mods.length - REACH_CAP;
	return `${tag} ${m} ${mods.length} modules: ${shown.join(' ') || '-'}${restText(rest, null)}`;
}

/** A `dep` line: `dep <from module> -> <to module> <file pairs>`. */
export const depLine = (e) => `dep ${e.from} -> ${e.to} ${e.pairs}`;

/**
 * The module card of one module and its `module` line (the same text heads
 * `modules.md`). `card ~<k>k` is the token estimate of the card rendered
 * without its own number, so one measuring render fixes it.
 */
function renderModuleCard(model, ctx, m) {
	const { group } = ctx;
	const files = ctx.moduleFiles.get(m);
	const inSet = new Set(files);
	const incoming = model.moduleEdges.filter((e) => e.to === m).sort((a, b) => cmp(a.from, b.from));
	const outgoing = model.moduleEdges.filter((e) => e.from === m).sort((a, b) => cmp(a.to, b.to));
	const pub = [];
	let exports = 0;
	for (const f of files.filter((x) => isCarded(model, x))) {
		for (const s of model.ts.get(f)?.symbols ?? []) {
			exports++;
			if (model.publicSymbols.has(symId(f, s))) pub.push(symLine(f, s));
		}
		for (const i of model.rust.get(f)?.items ?? []) {
			exports++;
			const users = model.rustUsers.get(`${f}:${i.name}`) ?? [];
			if (users.some((u) => !model.isTest(u.file) && model.moduleOf(u.file) !== m)) pub.push(rustSymLine(f, i));
		}
	}
	const called = new Map();
	let served = 0;
	for (const c of model.commands) {
		const n = c.callers.filter((s) => inSet.has(s.file)).length;
		if (n) called.set(c.name, n);
		if (c.rust && inSet.has(c.rust.file)) served++;
	}
	const fxCounts = new Map();
	for (const f of files) for (const e of ctx.effects.get(f) ?? []) fxCounts.set(e.sink, (fxCounts.get(e.sink) ?? 0) + 1);
	const debt = model.baseline.filter((entry) => entry.split(' -> ').some((side) => model.moduleOf(side) === m));
	const moduleLine = (k) =>
		`module ${m} ${moduleLayer(model, ctx, m)} files ${files.length} in-modules ${incoming.length} out-modules ${outgoing.length} pub ${pub.length}/${exports} ipc ${called.size}/${served} card ~${k}k`;
	const body = (k) => [
		moduleLine(k),
		...sectionLines([
			[
				'neighbors',
				[
					...incoming.map(depLine),
					...outgoing.map(depLine),
					moduleReachLine('in2', m, model.moduleIn2Pairs(m)),
					moduleReachLine('out2', m, model.moduleOut2Pairs(m)),
				],
			],
			[
				'entry files',
				(model.entryFiles.get(m) ?? []).map(
					(e) => `entry ${e.file} ext-in${e.importers.length} ${list('importers', e.importers, (f) => f, group, `importers ${e.file}`)}`,
				),
			],
			['files', files.map((f) => fileLine(model, ctx, f))],
			['public', pub],
			['stores', files.flatMap((f) => (ctx.stores.get(f) ?? []).map(storeLine))],
			[
				'effects',
				[
					...[...fxCounts.keys()].sort(cmp).map((s) => `fx-count ${s} ${fxCounts.get(s)}`),
					...[...called.keys()].sort(cmp).map((c) => `ipc-count ipc:${c} ${called.get(c)}`),
				],
			],
		]),
		'## debt',
		...(debt.length ? debt.map((d) => `debt ${d}`) : ['-']),
	];
	const cols = `cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> ${m} ' codemap/modules`;
	const k = String(Math.round(bytesOf(shard(`# module card ${m}`, cols, body(''))) / 300) / 10);
	return { text: shard(`# module card ${m}`, cols, body(k)), line: moduleLine(k) };
}

/** A representative file of a `src/lib` layer for `ruleFor`, in unit `u`. */
const layerSample = (layer, u) => (layer === 'lib-root' ? `src/lib/${u}.ts` : `src/lib/${layer}/${u}/x.ts`);

/** `modules.md`: the module lines, layer edge totals, the layer rules and the baseline debt. */
function renderModules(model, moduleLines) {
	const pairs = new Map();
	for (const e of model.edges) {
		if (model.isTest(e.from) || model.isTest(e.target) || e.from === e.target) continue;
		const key = `${model.layerOf(e.from)} -> ${model.layerOf(e.target)}`;
		if (!pairs.has(key)) pairs.set(key, new Set());
		pairs.get(key).add(`${e.from}\0${e.target}`);
	}
	const layers = [...new Set(model.files.filter((f) => f.startsWith('src/lib/')).map((f) => locate(f).layer))].sort(cmp);
	const rules = layers.map((from) => {
		const may = layers.filter((to) => ruleFor(layerSample(from, 'a'), layerSample(to, 'b')) === null);
		return `rule ${from} may: ${may.join(' ') || '-'}`;
	});
	for (const from of Object.keys(PLUGIN_ALLOWLIST).sort(cmp))
		for (const to of PLUGIN_ALLOWLIST[from]) rules.push(`rule plugin->plugin allowed: ${from} -> ${to}`);
	return shard(
		'# modules: one line per module, layer totals, layer rules, layer debt',
		"cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · layer <from layer> -> <to layer> <file pairs> · rule <layer> may: <layers> · debt <baseline entry> · grep: grep -F 'module src/lib/features/' codemap/modules.md",
		[
			...model.modules.map((m) => moduleLines.get(m)),
			'## layers (distinct file pairs)',
			...[...pairs.keys()].sort(cmp).map((k) => `layer ${k} ${pairs.get(k).size}`),
			'## layer rules (scripts/import-graph.mjs ruleFor)',
			...rules,
			'## debt (src/tests/lib/architecture/layer-baseline.json)',
			...(model.baseline.length ? model.baseline.map((d) => `debt ${d}`) : ['-']),
		],
	);
}

/** The doc of a sink: its TS symbol's, or its store member's. */
function sinkDoc(model, id) {
	const file = id.slice(0, id.indexOf(':'));
	const name = id.slice(file.length + 1);
	const sym = model.ts.get(file)?.symbols.find((s) => s.name === name);
	if (sym) return sym.doc;
	for (const st of model.stores) for (const m of st.members) if (m.id === id) return m.doc;
	return '';
}

/**
 * The `wiring.md` lines of one registry or facet, at most `cap` lines per
 * relation (`read-by`, `fired-by`, `registered-at`, `invoked-at`).
 *
 * @param {ReturnType<typeof import('./model.mjs').buildModel>} model
 * @param {ReturnType<typeof import('./ts.mjs').collectRegistries>[number]} r
 * @param {(file: string) => string} group the module of a file
 * @param {number} [cap] 10 in `wiring.md`; the query CLI passes no limit
 * @returns {string[]}
 */
export function wiringLines(model, r, group, cap = WIRING_CAP) {
	const id = r.id;
	const head =
		r.kind === 'facet'
			? `reg ${id} facet ${r.file}:${r.line}`
			: `reg ${id} sink ${r.file}:${r.line} | stores ${r.stores.map((s) => `${s.binding} ${s.mutation}`).join(', ') || '-'}`;
	const doc = sinkDoc(model, id);
	const q = `reg ${id}`;
	return [
		`${head}${doc ? ` | doc ${excerpt(doc)}` : ''}`,
		...capped(r.readBy, cap, (rb) => `reg ${id} read-by ${rb.file}:${rb.line} ${rb.id.slice(rb.file.length + 1)}`, (rb) => group(rb.file), 'read-by', q),
		...capped(
			r.firedBy.filter((f) => f.chain.length),
			cap,
			(f) => `reg ${id} fired-by ${f.chain.map(site).join(' <- ')}`,
			(f) => group(f.chain[0].file),
			'fired-by',
			q,
		),
		...capped(
			r.registeredAt,
			cap,
			(s) => `reg ${id} registered-at ${site(s)}${s.args ? ` args=${excerpt(s.args)}` : ''} -> ${s.callbacks.join(',')}`,
			(s) => group(s.file),
			'registered-at',
			q,
		),
		...capped(r.invokedAt, cap, (s) => `reg ${id} invoked-at ${site(s)}`, (s) => group(s.file), 'invoked-at', q),
	];
}

/** The stores of production files: a store in a test fixture has no card. */
const productionStores = (model) => model.stores.filter((st) => !model.isTest(st.file));

/** `stores.md`: `store <loc> <name> get <n> set <n> do <n> readers <files> writers <files> card <path>`. */
function renderStores(model) {
	const lines = productionStores(model).map((st) => {
		const n = (kind) => st.members.filter((m) => m.kind === kind).length;
		const readers = new Set(st.members.flatMap((m) => m.readers.map((s) => s.file))).size;
		const writers = new Set(st.members.flatMap((m) => m.writers.map((s) => s.file))).size;
		return `store ${st.file}:${st.line} ${st.name} get ${n('get')} set ${n('set')} do ${n('do')} readers ${readers} writers ${writers} card codemap/files/${st.file}.md`;
	});
	return shard(
		'# stores: one line per store object',
		"cols: store <loc> <name> get <n> set <n> do <n> readers <reader files> writers <writer files> card <card path> · grep: grep -F -- ' editorStore ' codemap/stores.md",
		lines,
	);
}

/** One `effects/<class>.md`: its `fx` lines by (sink, file, line). */
function renderEffects(model, cls) {
	const sites = model.effects
		.filter((e) => e.class === cls)
		.sort((a, b) => cmp(a.sink, b.sink) || cmp(a.file, b.file) || a.line - b.line || cmp(a.arg, b.arg) || cmp(a.enclosing, b.enclosing));
	return shard(
		`# effects ${cls}: one fx line per site, by sink, file, line`,
		`cols: fx <loc> <sink> [<arg>] in <enclosing> · grep: grep -F -- ' <sink> ' codemap/effects/${cls}.md`,
		sites.map(fxLine),
	);
}

/** `INDEX.md` from the section 10 template. */
function renderIndex(model, counts, hash) {
	const hubs = [];
	for (const layer of HUB_LAYERS)
		for (const h of (model.hubsByLayer.get(layer) ?? []).slice(0, HUBS_PER_LAYER)) hubs.push(`hub ${layer} ${h.file} in${h.prod} t${h.test}`);
	const lines = [
		INDEX_TITLE,
		`> Generated from the code by scripts/codemap.mjs; no hand-written text. inputs=sha256:${hash} · check freshness: node scripts/codemap.mjs --stale · written by CI on main only; never edit or stage codemap/.`,
		'',
		'Use this map to find code, then Read the code at the given path:line. Facts are static; read "Blind spots" before trusting an empty answer. On a branch, cards of files you changed lag the code; q commands read the working tree and are always current.',
		'Search code with Grep path src or src-tauri; search the map with path codemap. IDs contain regex characters: grep with -F and end the ID with a space.',
		'',
		'## Find things',
		'- A file you know: codemap/files/<repo path>.md (e.g. codemap/files/src/lib/features/tags/tags.service.ts.md): imports, importers, tests, symbols with users, local functions, calls, store members, effects.',
		'- A symbol by exact name: node scripts/codemap.mjs q sym <name> · by part of a name: q sym --match <part>',
		'- A module: codemap/modules.md (one line per module), then codemap/modules/<module>.md',
		'- Most-imported files per layer: "Hubs" below, or q hubs --layer <layer>',
		'',
		'## Graph questions (run these instead of reasoning over lists)',
		'- Who imports a file or symbol: q importers <id> [--tests]',
		'- What a file or module depends on: q deps <id>',
		'- Who calls, reads or writes a symbol: q callers <id> [--tests] · what a function calls: q calls <id>',
		'- Blast radius of a change: q impact <id> --depth 2 [--tests]',
		'- How control or data gets from A to B at runtime (calls, observers, IPC, events, store state): q flow <A> <B>',
		'- How file A imports its way to B: q path <A> <B>',
		"- Grep alternatives: grep -rF -- '-> <file> ' codemap/files (importers) · grep -rF -- '-> <symbol id> ' codemap/files (callers)",
		'',
		'## Cross-language and side effects',
		'- IPC command (TS call -> Rust fn, contract keys, mocks): codemap/ipc/commands.md or q ipc <command>',
		'- Rust -> frontend event (emits, listeners, payload): codemap/ipc/events.md or q event <name>',
		'- Rust type mirrored to TS (commands returning it, nested DTOs, e2e mocks): codemap/ipc/dto.md',
		'- Store state, who reads it, who writes it: codemap/stores.md, q store <name>',
		'- Disk writes and reads, frontend and Rust: codemap/effects/disk-write.md, codemap/effects/disk-read.md, q sink disk-write --up 2',
		'- Timers, debounce calls and their delays: codemap/effects/timer.md',
		'- Svelte $effect sites: codemap/effects/reactive.md · DOM listeners: codemap/effects/dom.md · SQLite writes: codemap/effects/db.md · Tauri dialogs, opener, window, http: codemap/effects/host.md · Rust spawns: codemap/effects/spawn.md',
		'- Observer lists, hooks, CodeMirror facets (who registers, who fires): codemap/wiring.md, q reg <id>',
		'',
		'## Tests',
		'- Tests for a source file: test lines in its card, or q tests <file>',
		'- Sources a test covers: q deps <test file>',
		'',
		'## IDs',
		'file = repo path · location = <file>:<line> · symbol = <file>:<name> · member = <file>:<object>.<member> · component = <file>:default · Rust method = <file>:<Type>::<name> · scopes = <file>:$effect@<line>, <file>:<var>=$derived, <file>:(module), (script), (markup) · module = folder path · ipc:<command> · event:<name> · dto:<Name> · sink = <origin>.<api>',
		`Line tags: ${LINE_TAGS.join(' ')}. "-" means no static reference found, not "unused". "in <name>" names a function in the same file as the line's location.`,
		'',
		'## Blind spots (fall back to Grep or Read)',
		...BLIND_SPOTS.map((b) => `- ${b}`),
		'',
		'## Hubs (production importers, test importers)',
		...hubs,
		'',
		'## Counts',
		`files ${model.files.length} (cards ${counts.cards}) · modules ${model.modules.length} · symbols ${counts.symbols} · locals ${counts.locals} · calls ${counts.calls} · ipc ${model.commands.length} · events ${model.events.length} · dto ${model.dtos.length} · stores ${productionStores(model).length} · registries ${model.registries.length} · effect sites ${model.effects.length}`,
		'',
		'## Optional',
		'- Layer rules, layer edge totals, baseline debt: codemap/modules.md',
		'- Every effect class: codemap/effects/',
	];
	return `${lines.join('\n')}\n`;
}

/**
 * Throws when an output file breaks a size cap: 48 KB, 1500 lines, 1000
 * chars per line; INDEX 200 lines and 12 KB. The message names every such
 * file; the fix is lowering a cap constant.
 */
function checkBudgets(files) {
	const bad = [];
	for (const [path, text] of files) {
		const lines = text.slice(0, -1).split('\n');
		const size = bytesOf(text);
		const why = [];
		if (size > BUDGET.maxBytes) why.push(`${size} bytes`);
		if (lines.length > BUDGET.maxLines) why.push(`${lines.length} lines`);
		const long = lines.findIndex((l) => l.length > BUDGET.maxLineChars);
		if (long !== -1) why.push(`line ${long + 1} has ${lines[long].length} chars`);
		if (path === 'INDEX.md' && (lines.length > BUDGET.indexLines || size > BUDGET.indexBytes)) why.push('over the INDEX budget');
		if (why.length) bad.push(`${path}: ${why.join(', ')}`);
	}
	if (bad.length) throw new Error(`codemap: files over a size cap (lower a cap constant in scripts/codemap/render.mjs):\n${bad.join('\n')}`);
}

/**
 * Renders every file of the code map from one model: `files/<file>.md` per
 * carded file (plus `files/<file>.calls.md` for a split card),
 * `modules/<module>.md`, `modules.md`, `ipc/commands.md`, `ipc/events.md`,
 * `ipc/dto.md`, `wiring.md`, `stores.md`, `effects/<class>.md` and `INDEX.md`.
 * Cards render before `modules.md` and INDEX, which carry their sizes and
 * counts.
 *
 * @param {ReturnType<typeof import('./model.mjs').buildModel>} model
 * @param {{inputsHash: string}} opts the 12-hex inputs hash for INDEX line 2
 * @returns {Map<string, string>} contents by path under the output folder, in code-unit order
 * @throws {Error} when a file breaks a size cap (`checkBudgets`)
 */
export function renderMap(model, { inputsHash }) {
	const ctx = context(model);
	const out = new Map();
	const counts = { cards: 0, symbols: 0, locals: 0, calls: 0 };
	for (const file of ctx.carded) {
		const { card, calls, counts: c } = renderFileCard(model, ctx, file);
		out.set(`files/${file}.md`, card);
		if (calls) out.set(`files/${file}.calls.md`, calls);
		counts.cards++;
		counts.symbols += c.symbols;
		counts.locals += c.locals;
		counts.calls += c.calls;
	}
	const moduleLines = new Map();
	for (const m of model.modules) {
		const { text, line } = renderModuleCard(model, ctx, m);
		out.set(`modules/${m}.md`, text);
		moduleLines.set(m, line);
	}
	out.set('modules.md', renderModules(model, moduleLines));
	const { group } = ctx;
	out.set(
		'ipc/commands.md',
		shard(
			'# ipc commands: one line per Rust command, with its contract, key sites and TS callers',
			"cols: ipc ipc:<command> | args <names> -> <result> | rust <loc> | reg <loc> | keys <locs> | callers <loc> in <fn>, … | doc <text> · grep: grep -F -- 'ipc ipc:<command> ' codemap/ipc/commands.md",
			model.commands.map((c) => ipcLine(c, group)),
		),
	);
	out.set(
		'ipc/events.md',
		shard(
			'# ipc events: one line per Rust to frontend event, with its emits and listeners',
			"cols: event event:<name> | const <NAME> <loc> | ts EVENT_NAMES.<KEY> <loc> | payload <type> | emits <loc> in <fn>, … | listens <loc> in <fn>, … | doc <text> · grep: grep -F -- 'event event:<name> ' codemap/ipc/events.md",
			model.events.map((e) => eventLine(e, group)),
		),
	);
	out.set(
		'ipc/dto.md',
		shard(
			'# ipc dto: one line per Rust type exported to TS by ts-rs',
			"cols: dto dto:<Name> | rust <loc> | ts <file> | returned-by <ipc ids> | arg-of <ipc ids> | contains <dto ids> | in <dto ids> | used-by <module>(<n>) | e2e <locs> | doc <text> · grep: grep -F -- 'dto dto:<Name> ' codemap/ipc/dto.md",
			model.dtos.map(dtoLine),
		),
	);
	out.set(
		'wiring.md',
		shard(
			'# wiring: registries and facets, who registers and who fires',
			"cols: reg <id> sink <loc> | stores <binding> <mutation> | doc <text> · reg <id> facet <loc> · reg <id> read-by <loc> <name> · reg <id> fired-by <loc> in <fn> <- <loc> in <fn> · reg <id> registered-at <loc> in <fn> args=<text> -> <callbacks> · reg <id> invoked-at <loc> in <fn> · grep: grep -F -- 'reg <id> ' codemap/wiring.md",
			model.registries.flatMap((r) => wiringLines(model, r, group)),
		),
	);
	out.set('stores.md', renderStores(model));
	for (const cls of EFFECT_CLASSES) out.set(`effects/${cls}.md`, renderEffects(model, cls));
	out.set('INDEX.md', renderIndex(model, counts, inputsHash));
	const sorted = new Map([...out.keys()].sort(cmp).map((k) => [k, out.get(k)]));
	checkBudgets(sorted);
	return sorted;
}
