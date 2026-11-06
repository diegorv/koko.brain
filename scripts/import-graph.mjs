#!/usr/bin/env node
// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// The layer-rule test imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * import-graph.mjs
 *
 * Extracts the import graph of `src/lib` and checks it against the layer rules
 * of ADR-0003. `src/tests/lib/architecture/layer-rules.test.ts` is the gate;
 * this file holds the parts it needs.
 *
 * Parsing uses the `typescript` devDependency's parser only (no type checker),
 * so a file costs one `createSourceFile`. A `.svelte` file contributes each of
 * its `<script>` blocks (module and instance).
 *
 * Usage: `node scripts/import-graph.mjs` prints the current violations as the
 * baseline JSON to stdout. It never writes a file: the baseline only shrinks,
 * and a person deletes its lines by hand.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

/** Repo-relative root of the scanned tree. */
export const LIB = 'src/lib';

/** ADR that owns the layer rules; every failure message points at it. */
export const ADR = 'docs/adr/0003-four-layer-source-taxonomy.md';

/** Repo-relative folder of the `app` layer, the composition root. */
export const APP = 'src/lib/app';

/**
 * The composition roots, as the ADR-0003 table lists them: everything under
 * `src/lib/app/`. They wire the layers together, so they may import every
 * layer, and only `src/routes` may import them. This constant documents the
 * ADR-0003 table (the test asserts they are equal); `ruleFor` enforces the
 * rule by layer, so it does not read this list.
 */
export const COMPOSITION_ROOTS = [`${APP}/**`];

/** Plugin units that may import another plugin unit (documented in ADR-0003). */
export const PLUGIN_ALLOWLIST = {
	'plugins/calendar': ['plugins/periodic-notes'],
	'plugins/one-on-one': ['plugins/periodic-notes'],
	'plugins/quick-capture': ['plugins/periodic-notes'],
	'plugins/mods': ['plugins/queryjs', 'plugins/one-on-one'],
};

/** A `<script>` block in any case, its closing tag allowing attributes or whitespace. */
const SCRIPT_RE = /<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi;

/** Each code region of a file with the number of lines that precede it. */
function codeRegions(file, text) {
	if (!file.endsWith('.svelte')) return [{ code: text, lineOffset: 0 }];
	return [...text.matchAll(SCRIPT_RE)].map((m) => {
		// The block's code starts after the opening tag, whose `[^>]*` holds no `>`.
		const start = m.index + m[0].indexOf('>') + 1;
		return { code: m[1], lineOffset: text.slice(0, start).split('\n').length - 1 };
	});
}

/** True when every specifier of a named import/export list carries an inline `type`. */
function allInlineTypes(elements) {
	return elements.length > 0 && elements.every((e) => e.isTypeOnly);
}

/**
 * Lists the module specifiers of one file: static and type-only imports,
 * `export … from`, `import()` calls and `import('x')` types.
 *
 * @param {string} file path, used only to tell `.svelte` from script files
 * @param {string} text file content
 * @returns {{spec: string | null, kind: 'static' | 'reexport' | 'dynamic' | 'import-type', typeOnly: boolean, line: number}[]}
 *   `spec` is null for an `import()` whose argument is not a plain string literal.
 *   `line` is 1-based, counted from the start of the file.
 */
export function extractImports(file, text) {
	const out = [];
	for (const { code, lineOffset } of codeRegions(file, text)) {
		const sf = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
		const visit = (n) => {
			if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
				const c = n.importClause;
				let typeOnly = c?.phaseModifier === ts.SyntaxKind.TypeKeyword;
				if (c && !typeOnly && !c.name && c.namedBindings && ts.isNamedImports(c.namedBindings))
					typeOnly = allInlineTypes(c.namedBindings.elements);
				out.push({ spec: n.moduleSpecifier.text, kind: 'static', typeOnly, line: lineOf(n) });
			} else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
				const named = n.exportClause && ts.isNamedExports(n.exportClause) ? n.exportClause.elements : [];
				const typeOnly = n.isTypeOnly || allInlineTypes(named);
				out.push({ spec: n.moduleSpecifier.text, kind: 'reexport', typeOnly, line: lineOf(n) });
			} else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
				const a = n.arguments[0];
				const literal = a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a));
				out.push({ spec: literal ? a.text : null, kind: 'dynamic', typeOnly: false, line: lineOf(n) });
			} else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
				out.push({ spec: n.argument.literal.text, kind: 'import-type', typeOnly: true, line: lineOf(n) });
			}
			ts.forEachChild(n, visit);
		};
		visit(sf);
	}
	return out;
}

/**
 * Resolves a specifier to a repo-relative path. `#lib/` and relative
 * specifiers are internal; anything else is a package.
 *
 * @param {string} from repo-relative POSIX path of the importing file
 * @param {string} spec module specifier
 * @param {(path: string) => boolean} exists whether a repo-relative file exists
 * @returns {string | null} the file it names, the unresolved path when no
 *   candidate exists (so its layer still classifies), or null for a package
 */
export function resolveSpecifier(from, spec, exists) {
	let base;
	if (spec.startsWith('#lib/')) base = posix.join(LIB, spec.slice('#lib/'.length));
	else if (spec.startsWith('.')) base = posix.join(posix.dirname(from), spec);
	else return null;
	const noJs = base.replace(/\.js$/, '');
	const candidates = [base, `${noJs}.ts`, `${base}.ts`, `${base}/index.ts`, `${noJs}/index.ts`];
	return candidates.find(exists) ?? base;
}

/**
 * Names the layer and unit of a repo-relative path. A unit is one folder of
 * `core/`, `features/` or `plugins/`, or the whole layer otherwise.
 *
 * @param {string} path repo-relative POSIX path
 * @returns {{layer: string, unit: string}} layer `outside` for paths not under
 *   `src/lib`, `lib-root` for files directly in it
 */
export function locate(path) {
	if (!path.startsWith(`${LIB}/`)) return { layer: 'outside', unit: path };
	const parts = path.slice(LIB.length + 1).split('/');
	if (parts.length === 1) return { layer: 'lib-root', unit: parts[0] };
	const layer = parts[0];
	return { layer, unit: ['core', 'features', 'plugins'].includes(layer) ? `${layer}/${parts[1]}` : layer };
}

/** Layers every layer may import. */
const OPEN_LAYERS = new Set(['contracts']);

/**
 * Returns the rule an edge breaks, or null. Package imports (`to` null) and
 * imports of `src/lib/contracts/` break none. `src/routes` is not scanned, so
 * "only routes import `app/`" means no scanned file outside `app/` may.
 */
function ruleFor(from, to, pluginAllowlist) {
	if (to === null) return null;
	const f = locate(from);
	const t = locate(to);
	if (OPEN_LAYERS.has(t.layer)) return null;
	if (t.layer === 'app' && f.layer !== 'app') return 'app-inbound';
	if (f.layer === 'app') return null;
	if (f.layer === 'core' && t.layer === 'features') return 'core->features';
	if (f.layer === 'core' && t.layer === 'plugins') return 'core->plugins';
	if (f.layer === 'features' && t.layer === 'plugins') return 'features->plugins';
	if (f.layer === 'utils' && t.layer !== 'utils' && t.layer !== 'outside') return 'utils->non-utils';
	if (f.layer === 'types' && t.layer !== 'types' && t.layer !== 'outside') return 'types->lib';
	if (f.layer === 'components' && ['core', 'features', 'plugins'].includes(t.layer)) return 'components/ui->app';
	if (f.layer === 'plugins' && t.layer === 'plugins' && f.unit !== t.unit && !pluginAllowlist[f.unit]?.includes(t.unit))
		return 'plugin->plugin';
	return null;
}

/**
 * Lists the edges that break a layer rule.
 *
 * @param {{from: string, to: string | null, line: number}[]} edges repo-relative paths
 * @param {{pluginAllowlist?: Record<string, string[]>}} [opts]
 * @returns {{from: string, to: string, line: number, rule: string}[]}
 */
export function findViolations(edges, opts = {}) {
	const allow = opts.pluginAllowlist ?? PLUGIN_ALLOWLIST;
	const out = [];
	for (const e of edges) {
		const rule = ruleFor(e.from, e.to, allow);
		if (rule) out.push({ from: e.from, to: e.to, line: e.line, rule });
	}
	return out;
}

/** The baseline entry of a violation: `<from> -> <resolved to>`, no line number. */
export function baselineKey(v) {
	return `${v.from} -> ${v.to}`;
}

/** The failure message for a violation that is not in the baseline. */
export function formatViolation(v) {
	return [
		`${v.from}:${v.line} imports ${v.to}, which breaks the ${v.rule} rule (${ADR}).`,
		'  Fix it in one of two ways:',
		'  1. Invert the dependency with a registration API: the lower layer exports a register function',
		'     and src/lib/app/ wires the implementation in (see registerCollectionNoteChangeConsumer).',
		'  2. Move the code down to the layer that owns it (utils/, core/, or a shared contract).',
		'  The baseline (src/tests/lib/architecture/layer-baseline.json) and the composition-root list',
		'  change only with owner sign-off.',
	].join('\n');
}

/** The failure message for a baseline entry no edge matches any more. */
export function formatStale(entry) {
	return `Stale baseline entry, no import matches it any more. Delete the line containing this entry from src/tests/lib/architecture/layer-baseline.json and lower BASELINE_SIZE in layer-rules.test.ts by one:\n\t${JSON.stringify(entry)}`;
}

/**
 * Compares violations with the baseline both ways.
 *
 * @param {{from: string, to: string, line: number, rule: string}[]} violations
 * @param {string[]} baseline entries `<from> -> <resolved to>`
 * @returns {{unlisted: string[], stale: string[]}} one failure message per
 *   violation missing from the baseline, and per entry no violation matches
 */
export function checkBaseline(violations, baseline) {
	const listed = new Set(baseline);
	const seen = new Set(violations.map(baselineKey));
	return {
		unlisted: violations.filter((v) => !listed.has(baselineKey(v))).map(formatViolation),
		stale: baseline.filter((entry) => !seen.has(entry)).map(formatStale),
	};
}

/** Lists the `.ts` and `.svelte` files under `dir`, `.d.ts` excluded. */
function walk(dir) {
	const out = [];
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, e.name);
		if (e.isDirectory()) out.push(...walk(full));
		else if (/\.(ts|svelte)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(full);
	}
	return out;
}

/**
 * Reads every file under `src/lib` and returns its import edges.
 *
 * @param {string} root absolute repo root
 * @returns {{files: string[], edges: {from: string, spec: string | null, to: string | null, kind: string, typeOnly: boolean, line: number}[]}}
 *   repo-relative POSIX paths; `to` is null for a package or a non-literal `import()`
 */
export function scanLib(root) {
	const toRel = (abs) => relative(root, abs).split(sep).join('/');
	const exists = (rel) => {
		const abs = join(root, rel);
		return existsSync(abs) && statSync(abs).isFile();
	};
	const files = walk(join(root, LIB)).map(toRel).sort();
	const edges = [];
	for (const from of files) {
		for (const imp of extractImports(from, readFileSync(join(root, from), 'utf8'))) {
			const to = imp.spec === null ? null : resolveSpecifier(from, imp.spec, exists);
			edges.push({ from, to, ...imp });
		}
	}
	return { files, edges };
}

/** The sorted, unique baseline for the current tree. */
export function currentBaseline(root) {
	return [...new Set(findViolations(scanLib(root).edges).map(baselineKey))].sort();
}

/**
 * Lists the directed feature pairs of an edge list: `a -> b` for each import
 * from `features/a/...` to `features/b/...`, a != b. Every edge kind counts,
 * type-only ones included.
 *
 * @param {{from: string, to: string | null}[]} edges repo-relative paths
 * @returns {string[]} sorted, unique feature-name pairs
 */
export function featurePairs(edges) {
	const out = new Set();
	for (const e of edges) {
		if (e.to === null) continue;
		const f = locate(e.from);
		const t = locate(e.to);
		if (f.layer !== 'features' || t.layer !== 'features' || f.unit === t.unit) continue;
		out.add(`${f.unit.slice('features/'.length)} -> ${t.unit.slice('features/'.length)}`);
	}
	return [...out].sort();
}

/** Adjacency map of `a -> b` pairs, each target list sorted so results are stable. */
function adjacency(pairs) {
	const adj = new Map();
	for (const pair of pairs) {
		const [a, b] = pair.split(' -> ');
		if (!adj.has(a)) adj.set(a, []);
		if (!adj.has(b)) adj.set(b, []);
		adj.get(a).push(b);
	}
	for (const targets of adj.values()) targets.sort();
	return adj;
}

/**
 * Tarjan's strongly-connected components over `a -> b` pairs.
 *
 * @param {string[]} pairs
 * @returns {string[][]} components with two or more nodes (a self-edge alone
 *   is not a cycle), each sorted, ordered by first node
 */
export function stronglyConnected(pairs) {
	const adj = adjacency(pairs);
	const index = new Map();
	const low = new Map();
	const stack = [];
	const onStack = new Set();
	const out = [];
	const visit = (v) => {
		index.set(v, index.size);
		low.set(v, index.get(v));
		stack.push(v);
		onStack.add(v);
		for (const w of adj.get(v)) {
			if (!index.has(w)) {
				visit(w);
				low.set(v, Math.min(low.get(v), low.get(w)));
			} else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
		}
		if (low.get(v) !== index.get(v)) return;
		const scc = [];
		let w;
		do {
			w = stack.pop();
			onStack.delete(w);
			scc.push(w);
		} while (w !== v);
		if (scc.length > 1) out.push(scc.sort());
	};
	for (const v of [...adj.keys()].sort()) if (!index.has(v)) visit(v);
	return out.sort((x, y) => x[0].localeCompare(y[0]));
}

/**
 * The shortest cycle through the pair `from -> to`.
 *
 * @param {string[]} pairs `a -> b` pairs, the given one included
 * @returns {string[] | null} `[from, to, ..., from]`, or null when no path leads back
 */
export function cyclePath(pairs, from, to) {
	const adj = adjacency(pairs);
	const prev = new Map([[to, null]]);
	const queue = [to];
	while (queue.length > 0) {
		const v = queue.shift();
		if (v === from) {
			const back = [];
			for (let n = from; n !== null; n = prev.get(n)) back.unshift(n);
			return [from, ...back];
		}
		for (const w of adj.get(v) ?? []) {
			if (!prev.has(w)) {
				prev.set(w, v);
				queue.push(w);
			}
		}
	}
	return null;
}

/** Repo-relative path of the feature-cycle baseline. */
export const FEATURE_BASELINE = 'src/tests/lib/architecture/feature-cycle-baseline.json';

/** The failure message for a feature pair inside a cycle that is not in the baseline. */
export function formatFeatureCycle(pair, path) {
	return [
		`features/${pair.replace(' -> ', ' -> features/')} is inside a feature cycle: ${path.join(' -> ')} (${ADR}).`,
		'  Break the cycle in one of two ways:',
		'  1. Invert the dependency with a registration API: the imported feature exports a register function',
		'     and src/lib/app/ wires the implementation in (see registerCollectionNoteChangeConsumer).',
		'  2. Move the shared piece down into core/ or utils/, where both features can import it.',
		`  featureCycleEdges in ${FEATURE_BASELINE} only shrinks; adding a pair needs owner sign-off.`,
	].join('\n');
}

/** The failure message for a baselined cycle pair that is gone or no longer inside a cycle. */
export function formatStaleFeatureCycle(pair) {
	return `Stale featureCycleEdges entry, this pair is no longer inside a feature cycle. Delete the line containing this entry from featureCycleEdges in ${FEATURE_BASELINE} and lower FEATURE_CYCLE_EDGES_SIZE in feature-cycle.test.ts by one:\n\t${JSON.stringify(pair)}`;
}

/**
 * Compares the pairs inside feature cycles with the baseline both ways. A new
 * cycle, a feature joining a cycle and a new pair inside one all show up as
 * an unlisted intra-cycle pair.
 *
 * @param {string[]} pairs every `a -> b` feature pair
 * @param {string[]} cycleBaseline the baselined intra-cycle pairs
 * @returns {{unlisted: string[], stale: string[]}} failure messages
 */
export function checkFeatureCycles(pairs, cycleBaseline) {
	const memberOf = new Map();
	stronglyConnected(pairs).forEach((scc, i) => scc.forEach((f) => memberOf.set(f, i)));
	const intra = pairs.filter((pair) => {
		const [a, b] = pair.split(' -> ');
		return memberOf.has(a) && memberOf.get(a) === memberOf.get(b);
	});
	const listed = new Set(cycleBaseline);
	const inside = new Set(intra);
	return {
		unlisted: intra
			.filter((pair) => !listed.has(pair))
			.map((pair) => formatFeatureCycle(pair, cyclePath(pairs, ...pair.split(' -> ')))),
		stale: cycleBaseline.filter((pair) => !inside.has(pair)).map(formatStaleFeatureCycle),
	};
}

/** Whether this module is the script node was started with. */
function isMain() {
	try {
		return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		// `node -e "import(...)" arg` puts a non-file in argv[1]: realpathSync throws.
		return false;
	}
}

if (isMain()) {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const t0 = performance.now();
	const baseline = currentBaseline(root);
	console.log(JSON.stringify(baseline, null, '\t'));
	console.error(`${baseline.length} entries, ${Math.round(performance.now() - t0)} ms`);
}
