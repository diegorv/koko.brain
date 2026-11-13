// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * model.mjs
 *
 * The code map model: the F1 inventory of a repo, the facts of `ts.mjs` and
 * `rust.mjs` joined into one object, and the F14 graphs over it (the file
 * import graph both ways, the module graph, hub ranking, entry files, two-hop
 * reach, and the symbol graph of calls, refs, mounts, registry fires, store
 * state, IPC and events). The generator and the query CLI build the same model.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { extractImportsFromSource, locate, resolveSpecifier } from '../import-graph.mjs';
import {
	analyzeRust,
	eventConsts,
	extractRustFile,
	handlerEntries,
	joinCommands,
	joinDtos,
	joinEvents,
	rustEffects,
	rustEmits,
} from './rust.mjs';
import {
	collectRegistries,
	collectStores,
	componentMounts,
	extractContracts,
	extractIpcSites,
	extractTsFile,
	extractUses,
	keySites,
	publicIds,
	reexportNames,
	resolveBindings,
	resolveReexports,
	testRelations,
	tsEffects,
	usersBySymbol,
} from './ts.mjs';

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Root of the crate sources. */
const RUST = 'src-tauri/src';

/** Root of the crate integration tests. */
const RUST_TESTS = 'src-tauri/tests';

/** Root of the crate examples: consumers of the crate rendered like tests, counted in neither `in<n>` nor `t<n>`. */
const RUST_EXAMPLES = 'src-tauri/examples';

/** The test relation of an example that imports a crate file. */
export const EXAMPLE_RELATION = 'example';

/** The layer-rule baseline, an F1 input read as data. */
export const BASELINE = 'src/tests/lib/architecture/layer-baseline.json';

/** Folders the inventory walks. */
const INPUT_ROOTS = ['src/lib', 'src/routes', 'src/tests', 'e2e', RUST, RUST_TESTS, RUST_EXAMPLES];

/** Edge kinds of the symbol graph in BFS neighbor order (`q flow`). */
export const SYMBOL_EDGE_KINDS = ['call', 'ref', 'mount', 'fires', 'state', 'ipc', 'event'];

/** Role of one file from its name. */
export function fileRole(path) {
	if (path.endsWith('.svelte')) return 'component';
	if (path.endsWith('.store.svelte.ts')) return 'store';
	if (path.endsWith('.service.ts')) return 'service';
	if (path.endsWith('.logic.ts')) return 'logic';
	if (path.endsWith('.types.ts')) return 'types';
	if (path.endsWith('.rs')) return 'rust';
	return 'other';
}

/**
 * Lists the module paths of a file inventory: one per folder of
 * `src/lib/{core,features,plugins}`, each other `src/lib` layer, each file
 * directly in `src/lib`, `src/routes`, the crate root and each folder of
 * `src-tauri/src`.
 *
 * @param {{libFiles: string[], routeFiles: string[], rustFiles: string[]}} files repo-relative paths
 * @returns {string[]} in code-unit order
 */
export function discoverModules({ libFiles, routeFiles, rustFiles }) {
	const out = new Set();
	for (const file of libFiles) {
		const { layer, unit } = locate(file);
		if (layer === 'outside') continue;
		out.add(['core', 'features', 'plugins', 'lib-root'].includes(layer) ? `src/lib/${unit}` : `src/lib/${layer}`);
	}
	if (routeFiles.length) out.add('src/routes');
	for (const file of rustFiles) {
		const parts = file.slice(RUST.length + 1).split('/');
		out.add(parts.length === 1 ? RUST : `${RUST}/${parts[0]}`);
	}
	return [...out].sort(cmp);
}

/** The module that holds a file: the longest module path equal to it or containing it, or null. */
export function moduleOf(file, modules) {
	let best = null;
	for (const m of modules) {
		if ((file === m || file.startsWith(`${m}/`)) && (!best || m.length > best.length)) best = m;
	}
	return best;
}

/** Whether a path is a crate example. */
const isExample = (path) => path.startsWith(`${RUST_EXAMPLES}/`);

/**
 * Whether a path is a test file: frontend tests, e2e files, crate integration
 * tests and crate examples (non-production consumers with no card).
 */
export const isTestFile = (path) =>
	path.startsWith('src/tests/') || path.startsWith('e2e/') || path.startsWith(`${RUST_TESTS}/`) || isExample(path);

/** The F7 layer of a production file: `rust`, `routes`, or the `src/lib` layer of `locate`. */
export function layerOf(path) {
	if (path.startsWith('src-tauri/')) return 'rust';
	if (path.startsWith('src/routes/')) return 'routes';
	return locate(path).layer;
}

/** Whether a repo-relative path is an F1 input. */
export function isInput(path) {
	if (path === BASELINE) return true;
	if (path.endsWith('.d.ts')) return false;
	if (path.startsWith('src/lib/') || path.startsWith('src/routes/')) return /\.(?:ts|svelte|js)$/.test(path);
	if (path.startsWith('src/tests/') || path.startsWith('e2e/')) return path.endsWith('.ts');
	if (path.startsWith(`${RUST}/`) || path.startsWith(`${RUST_TESTS}/`) || isExample(path)) return path.endsWith('.rs');
	return false;
}

/** Files under `dir` (repo-relative) that pass `keep`, skipping `node_modules`, in code-unit order. */
function walk(root, dir, keep) {
	const abs = join(root, dir);
	if (!existsSync(abs)) return [];
	const out = [];
	const entries = readdirSync(abs, { withFileTypes: true }).sort((a, b) => cmp(a.name, b.name));
	for (const e of entries) {
		const rel = `${dir}/${e.name}`;
		if (e.isDirectory()) {
			if (e.name !== 'node_modules') out.push(...walk(root, rel, keep));
		} else if (e.isFile() && keep(rel)) out.push(rel);
	}
	return out;
}

/**
 * Reads every F1 input of a repo.
 *
 * @param {string} root absolute repo root
 * @returns {Map<string, string>} contents by repo-relative POSIX path, in code-unit order
 */
export function readInputs(root) {
	const paths = INPUT_ROOTS.flatMap((dir) => walk(root, dir, isInput));
	if (existsSync(join(root, BASELINE))) paths.push(BASELINE);
	return new Map([...new Set(paths)].sort(cmp).map((p) => [p, readFileSync(join(root, p), 'utf8')]));
}

/** `map.get(key)`, creating an empty array first. */
function bucket(map, key) {
	if (!map.has(key)) map.set(key, []);
	return map.get(key);
}

/** The name of an import or re-export statement that binds nothing (`import 'x'`). */
export const SIDE_EFFECT_NAME = 'side-effect';

/**
 * The import names of one edge as the target exports them, in source order:
 * `default`, `*`, `type:` for a type-only binding, `dyn:` for an `import()`
 * destructure, `*` for `export * from`, `side-effect` for a statement that
 * binds nothing.
 */
function edgeNames(facts, region, imp) {
	const names = [];
	const add = (n) => {
		if (!names.includes(n)) names.push(n);
	};
	if (imp.kind === 'static' || imp.kind === 'reexport') {
		if (imp.kind === 'static') {
			for (const b of facts.bindings) if (!b.dynamic && b.spec === imp.spec && b.line === imp.line) add(`${b.typeOnly ? 'type:' : ''}${b.imported}`);
		} else for (const n of reexportNames(region, imp.line, imp.spec)) add(n);
		if (!names.length) add(SIDE_EFFECT_NAME);
	} else if (imp.kind === 'dynamic') {
		for (const b of facts.bindings) if (b.dynamic && b.spec === imp.spec && b.importLine === imp.line) add(`dyn:${b.imported}`);
		if (!names.length) add('dyn:*');
	} else add('type:*');
	return names;
}

/**
 * Builds the model of a tree of F1 inputs.
 *
 * Graphs (F14):
 * - `edges`: one per (importer, line, target) for TS import statements
 *   (static, type-only, re-export, `import()` with a literal) resolving to an
 *   inventory file, and Rust F16 edges; `packageImports` holds the
 *   `@tauri-apps/*` imports as `pkg:<specifier>` targets.
 * - `importers` / `imports`: the edges by target and by importer.
 * - `moduleEdges`: production file pairs across modules, weighted by
 *   distinct (from file, to file) pairs.
 * - `hubs`: production files by (distinct production importer files desc,
 *   distinct test importer files desc, path), examples counted in neither;
 *   `hubsByLayer` the same per F7 layer.
 * - `entryFiles`: per module, its files with a production importer outside
 *   it, by (external importer files desc, path).
 * - `in2(file)` / `out2(file)`: production files two import hops away, minus
 *   direct neighbors and the file.
 * - `moduleIn2Pairs(m)` / `moduleOut2Pairs(m)`: the modules of the files two
 *   file hops from a file of `m`, minus `m` and its direct neighbor modules,
 *   each with its count of distinct (far file, middle file) pairs; a module
 *   path with no file chain behind it is not reach.
 * - `symbolEdges`: the symbol graph (see `symbolGraph`).
 *
 * @param {Map<string, string>} inputs contents by repo-relative path, as `readInputs` gives them
 * @param {{reverse?: boolean}} [opts] `reverse` feeds every input list to the
 *   extractors in reverse order (a determinism test hook; `files` is then
 *   reversed too, every derived list keeps its order)
 */
export function buildModel(inputs, { reverse = false } = {}) {
	const sorted = [...inputs.keys()].filter((p) => p !== BASELINE).sort(cmp);
	const paths = reverse ? sorted.reverse() : sorted;
	const inventory = new Set(paths);
	const exists = (p) => inventory.has(p);
	const isTest = isTestFile;
	const tsPaths = paths.filter((p) => p.endsWith('.ts') || p.endsWith('.svelte'));
	const rustPaths = paths.filter((p) => p.endsWith('.rs'));
	const tsFiles = new Map(tsPaths.map((p) => [p, extractTsFile(p, inputs.get(p))]));
	const rustFiles = new Map(rustPaths.map((p) => [p, extractRustFile(p, inputs.get(p))]));

	const modules = discoverModules({
		libFiles: paths.filter((p) => p.startsWith('src/lib/')),
		routeFiles: paths.filter((p) => p.startsWith('src/routes/')),
		rustFiles: rustPaths.filter((p) => p.startsWith(`${RUST}/`)),
	});
	const moduleCache = new Map(paths.map((p) => [p, isTest(p) ? null : moduleOf(p, modules)]));
	const modOf = (f) => (moduleCache.has(f) ? moduleCache.get(f) : moduleOf(f, modules));

	const resolved = resolveBindings(tsFiles);
	const reexports = resolveReexports(tsFiles);
	const uses = extractUses(tsFiles, resolved);
	const mounts = componentMounts(tsFiles, resolved);
	const users = usersBySymbol(resolved, uses, isTest, mounts);
	const stores = collectStores(tsFiles, uses, isTest);
	const publicSymbols = publicIds(resolved, modOf, isTest);
	const rust = analyzeRust(rustFiles);

	const contract = extractContracts(tsFiles);
	const ipcSites = extractIpcSites(tsFiles, resolved);
	const handlers = handlerEntries(rustFiles.get(`${RUST}/lib.rs`));
	const commandNames = new Set([...handlers.map((h) => h.command), ...contract.commands.map((c) => c.name)]);
	const commands = joinCommands(
		handlers,
		rustFiles,
		contract,
		ipcSites.calls.filter((c) => !isTest(c.file)),
		keySites(tsFiles, commandNames),
	);
	const consts = eventConsts(rustFiles.get(`${RUST}/events.rs`));
	const events = joinEvents(consts, contract, rustEmits(rustFiles, consts), ipcSites.listens.filter((l) => !isTest(l.file)));
	const dtos = joinDtos(rustFiles, tsPaths, contract, resolved, reexports, isTest, modOf);

	const registries = collectRegistries(tsFiles, uses, isTest);
	const effects = [
		...tsEffects(tsFiles, uses, isTest),
		...rustPaths.flatMap((p) => rustEffects(rustFiles.get(p)).map((s) => ({ ...s, arg: '' }))),
	].sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.sink, b.sink) || cmp(a.arg, b.arg));

	const rustTests = new Map();
	for (const e of rust.edges)
		if ((e.from.startsWith(`${RUST_TESTS}/`) || isExample(e.from)) && !isTest(e.target))
			rustTests.set(`${e.target}\0${e.from}`, {
				test: e.from,
				relation: isExample(e.from) ? EXAMPLE_RELATION : 'imports',
				target: e.target,
				mirror: false,
			});
	const tests = [...testRelations(tsFiles, exists), ...rustTests.values()].sort(
		(a, b) => cmp(a.target, b.target) || Number(b.mirror) - Number(a.mirror) || cmp(a.relation, b.relation) || cmp(a.test, b.test),
	);

	// File graph.
	const edgeMap = new Map();
	const packageImports = [];
	for (const from of tsPaths) {
		const facts = tsFiles.get(from);
		for (const region of facts.regions) {
			for (const imp of extractImportsFromSource(region.sf, region.lineOffset)) {
				if (imp.spec === null) continue;
				if (imp.spec.startsWith('@tauri-apps/')) {
					packageImports.push({ from, line: imp.line, target: `pkg:${imp.spec}`, names: edgeNames(facts, region, imp) });
					continue;
				}
				const target = resolveSpecifier(from, imp.spec, exists);
				if (target === null || !exists(target) || target === from) continue;
				const key = `${from}\0${String(imp.line).padStart(9, '0')}\0${target}`;
				const prev = edgeMap.get(key);
				const names = edgeNames(facts, region, imp);
				if (prev) for (const n of names) prev.names.includes(n) || prev.names.push(n);
				else edgeMap.set(key, { from, line: imp.line, target, kind: imp.kind, typeOnly: imp.typeOnly, names });
			}
		}
	}
	for (const e of rust.edges) {
		const key = `${e.from}\0${String(e.line).padStart(9, '0')}\0${e.target}`;
		edgeMap.set(key, { from: e.from, line: e.line, target: e.target, kind: 'use', typeOnly: false, names: e.names });
	}
	const edges = [...edgeMap.keys()].sort(cmp).map((k) => edgeMap.get(k));
	packageImports.sort((a, b) => cmp(a.from, b.from) || a.line - b.line || cmp(a.target, b.target));
	const importers = new Map();
	const imports = new Map();
	for (const e of edges) {
		bucket(importers, e.target).push(e);
		bucket(imports, e.from).push(e);
	}

	const production = paths.filter((p) => !isTest(p));
	const distinct = (list, pick, keep) => [...new Set(list.filter(keep).map(pick))].sort(cmp);
	const prodImporters = (f) => distinct(importers.get(f) ?? [], (e) => e.from, (e) => !isTest(e.from));
	const testImporters = (f) => distinct(importers.get(f) ?? [], (e) => e.from, (e) => isTest(e.from) && !isExample(e.from));
	const prodTargets = (f) => distinct(imports.get(f) ?? [], (e) => e.target, (e) => !isTest(e.target));

	const hubs = production
		.map((file) => ({ file, layer: layerOf(file), prod: prodImporters(file).length, test: testImporters(file).length }))
		.sort((a, b) => b.prod - a.prod || b.test - a.test || cmp(a.file, b.file));
	const hubsByLayer = new Map();
	for (const h of hubs) bucket(hubsByLayer, h.layer).push(h);
	const hubKeys = [...hubsByLayer.keys()].sort(cmp);
	const hubLayers = new Map(hubKeys.map((k) => [k, hubsByLayer.get(k)]));

	const pairCounts = new Map();
	for (const e of edges) {
		if (isTest(e.from) || isTest(e.target)) continue;
		const fm = modOf(e.from);
		const tm = modOf(e.target);
		if (!fm || !tm || fm === tm) continue;
		const key = `${fm}\0${tm}`;
		if (!pairCounts.has(key)) pairCounts.set(key, new Set());
		pairCounts.get(key).add(`${e.from}\0${e.target}`);
	}
	const moduleEdges = [...pairCounts.keys()].sort(cmp).map((key) => {
		const [from, to] = key.split('\0');
		return { from, to, pairs: pairCounts.get(key).size };
	});

	const entryFiles = new Map(modules.map((m) => [m, []]));
	for (const file of production) {
		const m = modOf(file);
		if (!m) continue;
		const ext = prodImporters(file).filter((f) => modOf(f) !== m);
		if (ext.length) entryFiles.get(m).push({ file, importers: ext });
	}
	for (const list of entryFiles.values()) list.sort((a, b) => b.importers.length - a.importers.length || cmp(a.file, b.file));

	const twoHop = (start, next) => {
		const direct = next(start);
		const near = new Set([start, ...direct]);
		return [...new Set(direct.flatMap(next))].filter((f) => !near.has(f)).sort(cmp);
	};
	const productionOf = new Map(modules.map((m) => [m, []]));
	for (const f of production) if (modOf(f)) productionOf.get(modOf(f)).push(f);
	const moduleTwoHop = (m, next) => {
		const files = productionOf.get(m) ?? [];
		const near = new Set([m]);
		for (const f of files) for (const g of next(f)) if (modOf(g)) near.add(modOf(g));
		const pairs = new Map();
		for (const f of files)
			for (const mid of next(f))
				for (const far of next(mid)) {
					const fm = modOf(far);
					if (!fm || near.has(fm)) continue;
					if (!pairs.has(fm)) pairs.set(fm, new Set());
					pairs.get(fm).add(`${far}\0${mid}`);
				}
		return new Map([...pairs.keys()].sort(cmp).map((k) => [k, pairs.get(k).size]));
	};

	const symbolEdges = symbolGraph({ tsFiles, uses, rust, commands, events, registries, stores, mounts, isTest });

	return {
		inputs,
		files: paths,
		modules,
		moduleOf: modOf,
		isTest,
		layerOf,
		fileRole,
		baseline: inputs.has(BASELINE) ? JSON.parse(inputs.get(BASELINE)) : [],
		ts: tsFiles,
		rust: rustFiles,
		resolved,
		reexports,
		uses,
		users,
		rustUsers: rust.users,
		rustCalls: rust.calls,
		publicSymbols,
		stores,
		contract,
		commands,
		events,
		dtos,
		registries,
		mounts,
		effects,
		tests,
		edges,
		packageImports,
		importers,
		imports,
		hubs,
		hubsByLayer: hubLayers,
		moduleEdges,
		entryFiles,
		in2: (file) => twoHop(file, prodImporters),
		out2: (file) => twoHop(file, prodTargets),
		moduleIn2Pairs: (m) => moduleTwoHop(m, prodImporters),
		moduleOut2Pairs: (m) => moduleTwoHop(m, prodTargets),
		symbolEdges,
	};
}

/** Whether an enclosing name is a reactive scope (`$effect@<line>`, `X=$derived`, `$derived@<line>`). */
const isReactiveScope = (name) => /^\$effect(?:\.pre)?@\d+$|=\$derived$|^\$derived@\d+$/.test(name);

/**
 * The F14 symbol graph over production code, one edge per (kind, from, to),
 * each with the location of its first fact:
 * - `call` / `ref`: F4 uses from `<file>:<enclosing>` to the target (`call`
 *   for `call` and `mcall`, `ref` for every other kind); Rust F16/F20 rows
 *   (`ref` for a Rust `ref`, `call` for the others).
 * - `ipc`: TS enclosing → `ipc:<cmd>` → the Rust `cmd` fn.
 * - `event`: Rust emit enclosing → `event:<name>` → TS listener enclosing.
 * - `fires`: each F11 `read-by` function → each registered callback.
 * - `state`: the enclosing of a writer of a `do` member → the enclosing of
 *   each reader of a `get` member whose `w-via` names that `do` member.
 * - `mount`: `<X>:(markup)` → `<Y>:default`; a component's `default` → its
 *   `(script)` (when it has an instance script), `(markup)` and reactive scopes.
 *
 * @returns {{kind: string, from: string, to: string, file: string, line: number}[]}
 *   by (from, kind in SYMBOL_EDGE_KINDS order, to)
 */
function symbolGraph({ tsFiles, uses, rust, commands, events, registries, stores, mounts, isTest }) {
	const map = new Map();
	const add = (kind, from, to, file, line) => {
		const key = `${kind}\0${from}\0${to}`;
		if (!map.has(key)) map.set(key, { kind, from, to, file, line });
	};
	const scopes = new Map();
	for (const u of uses) {
		if (isTest(u.file)) continue;
		add(u.kind === 'call' || u.kind === 'mcall' ? 'call' : 'ref', `${u.file}:${u.enclosing}`, u.target, u.file, u.line);
		if (isReactiveScope(u.enclosing)) bucket(scopes, u.file).push(u);
	}
	for (const c of rust.calls) if (!isTest(c.file)) add(c.kind === 'ref' ? 'ref' : 'call', `${c.file}:${c.enclosing}`, c.target, c.file, c.line);
	for (const c of commands) {
		const id = `ipc:${c.name}`;
		for (const s of c.callers) add('ipc', `${s.file}:${s.enclosing}`, id, s.file, s.line);
		if (c.rust) add('ipc', id, `${c.rust.file}:${c.name}`, c.rust.file, c.rust.line);
	}
	for (const e of events) {
		const id = `event:${e.name}`;
		for (const s of e.emits) add('event', `${s.file}:${s.enclosing}`, id, s.file, s.line);
		for (const l of e.listens) add('event', id, `${l.file}:${l.enclosing}`, l.file, l.line);
	}
	for (const r of registries)
		for (const rb of r.readBy) for (const reg of r.registeredAt) for (const cb of reg.callbacks) add('fires', rb.id, cb, reg.file, reg.line);
	for (const st of stores) {
		const getters = st.members.filter((m) => m.kind === 'get');
		for (const d of st.members) {
			if (d.kind !== 'do') continue;
			const readers = getters.filter((g) => g.wVia.includes(d.name)).flatMap((g) => g.readers);
			for (const w of d.writers) for (const r of readers) add('state', `${w.file}:${w.enclosing}`, `${r.file}:${r.enclosing}`, w.file, w.line);
		}
	}
	for (const m of mounts) if (!isTest(m.file)) add('mount', `${m.file}:(markup)`, `${m.target}:default`, m.file, m.line);
	for (const [file, facts] of tsFiles) {
		if (!file.endsWith('.svelte') || isTest(file)) continue;
		const id = `${file}:default`;
		if (facts.regions.some((r) => !r.module)) add('mount', id, `${file}:(script)`, file, 1);
		add('mount', id, `${file}:(markup)`, file, 1);
		for (const u of scopes.get(file) ?? []) add('mount', id, `${file}:${u.enclosing}`, file, u.line);
	}
	const order = new Map(SYMBOL_EDGE_KINDS.map((k, i) => [k, i]));
	return [...map.values()].sort((a, b) => cmp(a.from, b.from) || order.get(a.kind) - order.get(b.kind) || cmp(a.to, b.to));
}
