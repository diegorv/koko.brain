#!/usr/bin/env node
// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// architecture-map.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * architecture-map.mjs
 *
 * Builds the architecture map: one page per module plus an index, joining the
 * curated docs in `docs/architecture/` (what each module is responsible for,
 * written by people) with facts read from the code (files by role, imports
 * between modules, IPC commands, tests, layer-rule debt). The same commit and
 * the same flags always give byte-identical output.
 *
 * A module is one folder of `src/lib/{core,features,plugins}`, each other
 * `src/lib` layer, `src/lib/utils.ts`, `src/routes`, the Rust crate root files,
 * and each folder of `src-tauri/src`. A curated doc for a folder inside a module
 * (the live-preview docs) makes that folder a module of its own.
 *
 * Usage:
 *   node scripts/architecture-map.mjs                  write docs/architecture/generated/
 *   node scripts/architecture-map.mjs --check          only validate the curated docs
 *   node scripts/architecture-map.mjs --out <dir> [--link-base <url>] [--source <sha>] [--graphify]
 *
 * `--link-base` turns code links into absolute URLs, for pages published
 * where the code is not. `--graphify` adds an index entry for a `graphify/`
 * folder that the caller puts next to the pages. The output sorts by code unit,
 * so the system locale does not change it.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

import { extractImports, locate, resolveSpecifier, scanLib } from './import-graph.mjs';

/** Folder of the curated docs, repo-relative. */
export const DOCS = 'docs/architecture';
/** Default output folder, gitignored. */
export const DEFAULT_OUT = `${DOCS}/generated`;
/** File that marks a folder as generator output, so `--out` never wipes another folder. */
const MARKER = '.architecture-map';

/** Groups in page order, with the title the index shows. */
export const GROUPS = [
	{ id: 'core', title: 'Core' },
	{ id: 'features', title: 'Features' },
	{ id: 'plugins', title: 'Plugins' },
	{ id: 'frontend-root', title: 'App shell, contracts and shared code' },
	{ id: 'rust', title: 'Rust backend' },
];

/** File roles in display order, after the file types of CLAUDE.md "Architecture Guidelines". */
const ROLES = ['component', 'store', 'service', 'logic', 'types', 'rust', 'other'];

/** Neighbors shown per direction in a module diagram; the tables list every one. */
const DIAGRAM_NEIGHBORS = 20;

const RUST = 'src-tauri/src';

/** Code-unit order, independent of the locale (`localeCompare` is not). */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Text with comments blanked out. Quotes listed in `quotes` open strings whose
 * content is kept, so `'https://x'` survives. Rust passes only `"`, because
 * `'` also starts lifetimes.
 */
export function stripComments(text, quotes = `'"\``) {
	let out = '';
	let i = 0;
	while (i < text.length) {
		const c = text[i];
		if (quotes.includes(c)) {
			let j = i + 1;
			while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
			out += text.slice(i, j + 1);
			i = j + 1;
		} else if (c === '/' && text[i + 1] === '/') {
			while (i < text.length && text[i] !== '\n') i++;
		} else if (c === '/' && text[i + 1] === '*') {
			const end = text.indexOf('*/', i + 2);
			const stop = end === -1 ? text.length : end + 2;
			out += text.slice(i, stop).replace(/[^\n]/g, ' ');
			i = stop;
		} else {
			out += c;
			i++;
		}
	}
	return out;
}

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

/** Group of a module path. */
export function groupOf(path) {
	if (path === RUST || path.startsWith(`${RUST}/`)) return 'rust';
	for (const id of ['core', 'features', 'plugins']) if (path.startsWith(`src/lib/${id}/`)) return id;
	return 'frontend-root';
}

/** Coarse layer of a module, the node it gets in the index diagram. */
function layerOf(path) {
	if (groupOf(path) === 'rust') return 'rust';
	if (path === 'src/routes') return 'routes';
	if (path === 'src/lib/utils.ts') return 'utils';
	return path.split('/')[2];
}

/**
 * Lists the module paths of a file inventory, sorted.
 *
 * @param {{libFiles: string[], routeFiles: string[], rustFiles: string[]}} files repo-relative paths
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
	return [...out].sort();
}

/** The module that holds a file: the longest module path equal to it or containing it. */
export function moduleOf(file, modules) {
	let best = null;
	for (const m of modules) {
		if ((file === m || file.startsWith(`${m}/`)) && (!best || m.length > best.length)) best = m;
	}
	return best;
}

/**
 * Top-level crate modules a Rust file names through `crate::` paths (brace
 * imports over several lines included), plus bare `name::` paths to the
 * modules in `bare`, which is how the crate root names its own modules.
 * Comments are skipped.
 */
export function rustModuleRefs(text, bare = []) {
	const code = stripComments(text, '"');
	const out = new Set();
	for (const m of code.matchAll(/\bcrate::(\{|\w+)/g)) {
		if (m[1] !== '{') {
			out.add(m[1]);
			continue;
		}
		let depth = 0;
		let part = '';
		for (let i = m.index + m[0].length - 1; i < code.length; i++) {
			const c = code[i];
			if (c === '{') depth++;
			else if (c === '}') depth--;
			if (depth === 0 || (depth === 1 && c === ',')) {
				const name = part.trim().split('::')[0];
				if (/^\w+$/.test(name)) out.add(name);
				part = '';
				if (depth === 0) break;
			} else if (!(depth === 1 && c === '{')) part += c;
		}
	}
	if (bare.length) for (const m of code.matchAll(new RegExp(`(?<![\\w:])(${bare.join('|')})::`, 'g'))) out.add(m[1]);
	return [...out].sort(cmp);
}

/** Commands listed in `generate_handler![...]`, each with its top-level crate module. */
export function handlerCommands(libRs) {
	const block = libRs.match(/generate_handler!\[([\s\S]*?)\]/);
	if (!block) return [];
	const out = [];
	for (const raw of block[1].split('\n')) {
		const entry = raw.replace(/\/\/.*$/, '').trim().replace(/,$/, '');
		if (!entry) continue;
		const parts = entry.split('::');
		out.push({ command: parts[parts.length - 1], module: parts[0] });
	}
	return out;
}

/** Commands a frontend file sends through `call()` from `src/lib/contracts/ipc.ts`. */
export function commandCalls(text) {
	return [...stripComments(text).matchAll(/(?<![\w.])call\(\s*['"]([a-z0-9_]+)['"]/g)].map((m) => m[1]);
}

/** Splits a curated doc into its frontmatter `summary` and its body. */
export function parseCurated(text) {
	const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!m) return { summary: null, body: text.trim() };
	const front = parseYaml(m[1]) ?? {};
	return { summary: typeof front.summary === 'string' ? front.summary : null, body: text.slice(m[0].length).trim() };
}

/** Top folders whose backticked paths in a curated doc must exist. */
const CHECKED_ROOTS = /^(src|src-tauri|docs|scripts|e2e|help)\//;

/** Backticked repo paths a curated doc names, placeholders such as `<feature>` and globs left out. */
function namedPaths(body) {
	const out = new Set();
	for (const m of body.matchAll(/`([^`\s]+)`/g)) {
		const p = m[1].replace(/\/$/, '');
		if (CHECKED_ROOTS.test(p) && !/[<>*{}]/.test(p)) out.add(p);
	}
	return [...out].sort(cmp);
}

/** Path of `target` as seen from `fromDir`, POSIX style. */
function rel(fromDir, target) {
	return posix.relative(fromDir, target) || '.';
}

/**
 * Rewrites the links of a curated text for the page it is copied into.
 * Backticked repo paths become links (to the module's page when it has one,
 * else to the code), and relative Markdown links are re-based from the
 * source file to the page. URLs and anchors are left alone.
 *
 * @param {string} text curated Markdown
 * @param {{sourceDir: string, pageDir: string, exists: (p: string) => boolean,
 *   linkBase?: string, pages?: Map<string, string>}} opts `sourceDir` and
 *   `pageDir` are repo-relative; `pages` maps a module path to its page path,
 *   repo-relative
 */
export function linkify(text, { sourceDir, pageDir, exists, linkBase, pages }) {
	const target = (repoPath) => {
		if (pages?.has(repoPath)) return rel(pageDir, pages.get(repoPath));
		return linkBase ? `${linkBase}/${repoPath}` : rel(pageDir, repoPath);
	};
	// Re-base relative links first, so the links made from backticks below are not re-based again.
	const rebased = text.replace(/\]\(([^)\s]+)\)/g, (whole, href) => {
		if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) return whole;
		const [path, anchor] = href.split('#');
		const repoPath = posix.normalize(posix.join(sourceDir, path));
		if (repoPath.startsWith('..')) return whole;
		return `](${target(repoPath)}${anchor ? `#${anchor}` : ''})`;
	});
	return rebased.replace(/(?<!\[)`([^`\s]+)`(?!\]\()/g, (whole, p) => {
		const clean = p.replace(/\/$/, '');
		return exists(clean) || pages?.has(clean) ? `[\`${p}\`](${target(clean)})` : whole;
	});
}

/** Files under `dir` (repo-relative) that pass `keep`, repo-relative and sorted. */
function walk(root, dir, keep) {
	const abs = join(root, dir);
	if (!existsSync(abs)) return [];
	const out = [];
	for (const e of readdirSync(abs, { withFileTypes: true })) {
		const relPath = `${dir}/${e.name}`;
		if (e.isDirectory()) out.push(...walk(root, relPath, keep));
		else if (keep(relPath)) out.push(relPath);
	}
	return out.sort(cmp);
}

const isSource = (p) => /\.(ts|svelte|js)$/.test(p) && !p.endsWith('.d.ts');

/**
 * Reads the code and the curated docs of a repo into one model.
 *
 * @param {string} root absolute path of the repo
 */
export function buildModel(root) {
	const exists = (p) => existsSync(join(root, p));
	const { files: libFiles, edges: libEdges } = scanLib(root);
	const routeFiles = walk(root, 'src/routes', isSource);
	const rustFiles = walk(root, RUST, (p) => p.endsWith('.rs'));

	const docFiles = walk(root, `${DOCS}/modules`, (p) => p.endsWith('.md'));
	const docs = new Map(
		docFiles.map((f) => [f.slice(`${DOCS}/modules/`.length, -'.md'.length), { docPath: f, ...parseCurated(readFileSync(join(root, f), 'utf8')) }]),
	);

	const discovered = discoverModules({ libFiles, routeFiles, rustFiles });
	const nested = [...docs.keys()].filter((p) => !discovered.includes(p) && exists(p) && moduleOf(p, discovered));
	const paths = [...discovered, ...nested].sort();

	// Frontend edges: one per import statement that resolves into another module.
	const counts = new Map();
	const bump = (from, to) => {
		if (!from || !to || from === to) return;
		const key = `${from}\n${to}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	};
	const routeEdges = routeFiles.flatMap((from) =>
		extractImports(from, readFileSync(join(root, from), 'utf8')).map((imp) => ({
			from,
			to: imp.spec === null ? null : resolveSpecifier(from, imp.spec, (p) => exists(p) && statSync(join(root, p)).isFile()),
		})),
	);
	for (const e of [...libEdges, ...routeEdges]) if (e.to) bump(moduleOf(e.from, paths), moduleOf(e.to, paths));

	// Rust edges: one per file that names another crate module.
	const crateModule = (name) => {
		if (paths.includes(`${RUST}/${name}`)) return `${RUST}/${name}`;
		if (exists(`${RUST}/${name}.rs`)) return RUST;
		return null;
	};
	const topLevel = [...new Set(rustFiles.map((f) => f.slice(RUST.length + 1).split('/')[0].replace(/\.rs$/, '')))].sort();
	for (const file of rustFiles) {
		const isRoot = file === `${RUST}/lib.rs` || file === `${RUST}/main.rs`;
		for (const name of rustModuleRefs(readFileSync(join(root, file), 'utf8'), isRoot ? topLevel : [])) {
			bump(moduleOf(file, paths), crateModule(name));
		}
	}
	const edges = [...counts]
		.map(([key, count]) => {
			const [from, to] = key.split('\n');
			return { from, to, count };
		})
		.sort((a, b) => cmp(a.from, b.from) || cmp(a.to, b.to));

	// IPC commands with the frontend modules that call them.
	const libRs = exists(`${RUST}/lib.rs`) ? readFileSync(join(root, `${RUST}/lib.rs`), 'utf8') : '';
	const callers = new Map();
	for (const file of [...libFiles, ...routeFiles]) {
		const mod = moduleOf(file, paths);
		for (const cmd of commandCalls(readFileSync(join(root, file), 'utf8'))) {
			if (!callers.has(cmd)) callers.set(cmd, new Set());
			callers.get(cmd).add(mod);
		}
	}
	const commands = handlerCommands(libRs)
		.map(({ command, module }) => ({
			command,
			rust: crateModule(module) ?? RUST,
			callers: [...(callers.get(command) ?? [])].sort(),
		}))
		.sort((a, b) => cmp(a.command, b.command));

	const testFiles = walk(root, 'src/tests', isSource);
	const allFiles = [...libFiles, ...walk(root, 'src/lib', (p) => p.endsWith('.js')), ...routeFiles, ...rustFiles];
	const baselinePath = 'src/tests/lib/architecture/layer-baseline.json';
	const baseline = exists(baselinePath) ? JSON.parse(readFileSync(join(root, baselinePath), 'utf8')) : [];

	const modules = paths.map((path) => {
		const own = allFiles.filter((f) => moduleOf(f, paths) === path);
		const roles = {};
		for (const role of ROLES) {
			const n = own.filter((f) => fileRole(f) === role).length;
			if (n) roles[role] = n;
		}
		let tests = null;
		// Frontend tests mirror the source tree under src/tests/. Rust tests are
		// inline or in src-tauri/tests/ and are not mapped to a module.
		if (path.startsWith('src/')) {
			const dir = `src/tests/${path.slice('src/'.length)}`;
			const mine = testFiles.filter((f) => f.startsWith(`${dir}/`) && moduleOf(`src/${f.slice('src/tests/'.length)}`, paths) === path);
			if (mine.length) tests = { dir, files: mine.length };
		}
		const doc = docs.get(path);
		return {
			path,
			group: groupOf(path),
			files: own.length,
			roles,
			tests,
			summary: doc?.summary ?? null,
			body: doc?.body ?? null,
			docPath: doc?.docPath ?? null,
			namedPaths: doc ? namedPaths(doc.body) : [],
			debt: baseline.filter((entry) => entry.split(' -> ').some((side) => moduleOf(side, paths) === path)),
		};
	});

	const read = (p) => (exists(p) ? readFileSync(join(root, p), 'utf8').trim() : null);
	return {
		root,
		modules,
		edges,
		commands,
		overview: read(`${DOCS}/overview.md`),
		groups: Object.fromEntries(GROUPS.map((g) => [g.id, read(`${DOCS}/groups/${g.id}.md`)])),
		orphanDocs: [...docs.entries()].filter(([p]) => !paths.includes(p)).map(([p, d]) => ({ path: p, docPath: d.docPath })),
		exists,
	};
}

/**
 * Checks the curated docs against the code: every module has a doc with a
 * summary, every doc is at the path of an existing module, and every repo path
 * a doc names in backticks exists.
 *
 * @returns {string[]} one sorted message per problem, empty when all is well
 */
export function validate(model) {
	const out = [];
	for (const m of model.modules) {
		if (!m.docPath) {
			out.push(`${m.path}: no doc; write ${DOCS}/modules/${m.path}.md`);
			continue;
		}
		if (!m.summary) out.push(`${m.docPath}: no \`summary:\` in the frontmatter`);
		for (const p of m.namedPaths) if (!model.exists(p)) out.push(`${m.docPath}: names ${p}, which does not exist`);
	}
	for (const d of model.orphanDocs) out.push(`${d.docPath}: ${d.path} does not exist; delete the doc or fix its path`);
	return out.sort();
}

/** Mermaid node id of a module path. */
const nodeId = (path) => `m_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

/** Short label of a module path. */
const shortName = (path) => (path.startsWith('src/lib/') ? path.slice('src/lib/'.length) : path);

/** Page path of a module, relative to the output folder. */
const pageOf = (path) => `modules/${path}.md`;

/** Escapes a table cell. */
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');

/** Singular and plural label of each role. */
const ROLE_LABELS = {
	component: ['component', 'components'],
	store: ['store', 'stores'],
	service: ['service', 'services'],
	logic: ['logic file', 'logic files'],
	types: ['types file', 'types files'],
	rust: ['Rust file', 'Rust files'],
	other: ['other', 'other'],
};

/** "3 components, 1 store" from a role count map. */
export function rolesText(roles) {
	return ROLES.filter((r) => roles[r]).map((r) => `${roles[r]} ${ROLE_LABELS[r][roles[r] === 1 ? 0 : 1]}`).join(', ');
}

/** The Mermaid diagram of one module with its direct neighbors. */
function moduleDiagram(m, deps, users) {
	const lines = ['```mermaid', 'flowchart LR', `\t${nodeId(m.path)}["${shortName(m.path)}"]:::self`];
	const side = (list, dir) => {
		const shown = list.slice(0, DIAGRAM_NEIGHBORS);
		for (const e of shown) {
			const other = dir === 'out' ? e.to : e.from;
			lines.push(`\t${nodeId(other)}["${shortName(other)}"]`);
			lines.push(dir === 'out' ? `\t${nodeId(m.path)} -->|${e.count}| ${nodeId(other)}` : `\t${nodeId(other)} -->|${e.count}| ${nodeId(m.path)}`);
		}
		const hidden = list.length - shown.length;
		if (hidden > 0) {
			const id = `${nodeId(m.path)}_more_${dir}`;
			lines.push(`\t${id}["+${hidden} more"]`);
			lines.push(dir === 'out' ? `\t${nodeId(m.path)} -.-> ${id}` : `\t${id} -.-> ${nodeId(m.path)}`);
		}
	};
	side(users, 'in');
	side(deps, 'out');
	lines.push('\tclassDef self stroke-width:3px', '```');
	return lines.join('\n');
}

/**
 * Renders the model into pages.
 *
 * @param {object} model from `buildModel`
 * @param {{outDir: string, linkBase?: string, sourceSha?: string, graphify?: boolean}} opts
 *   `outDir` is repo-relative and only used to compute relative links
 * @returns {Map<string, string>} page path relative to `outDir` -> content
 */
export function render(model, { outDir, linkBase, sourceSha, graphify }) {
	const pages = new Map();
	const pageRepo = new Map(model.modules.map((m) => [m.path, posix.join(outDir, pageOf(m.path))]));
	const allPaths = model.modules.map((m) => m.path);
	const codeLink = (pageDir, repoPath, label = repoPath) =>
		`[\`${label}\`](${linkBase ? `${linkBase}/${repoPath}` : rel(pageDir, repoPath)})`;
	const pageLink = (pageDir, path) => `[\`${path}\`](${rel(pageDir, pageRepo.get(path))})`;
	const curated = (text, sourceDir, pageDir) =>
		linkify(text, { sourceDir, pageDir, exists: model.exists, linkBase, pages: pageRepo });

	for (const m of model.modules) {
		const pageDir = posix.dirname(pageRepo.get(m.path));
		const deps = model.edges.filter((e) => e.from === m.path).sort((a, b) => b.count - a.count || cmp(a.to, b.to));
		const users = model.edges.filter((e) => e.to === m.path).sort((a, b) => b.count - a.count || cmp(a.from, b.from));
		const out = [`# \`${m.path}\``, ''];
		if (m.summary) out.push(`> ${m.summary}`, '');
		const meta = [`Group: [${GROUPS.find((g) => g.id === m.group).title}](${rel(pageDir, posix.join(outDir, 'README.md'))}#${m.group})`];
		meta.push(`Code: ${codeLink(pageDir, m.path)}`);
		if (m.tests) meta.push(`Tests: ${codeLink(pageDir, m.tests.dir)} (${m.tests.files} ${m.tests.files === 1 ? 'file' : 'files'})`);
		if (m.docPath) meta.push(`Edit this text in ${codeLink(pageDir, m.docPath)}`);
		out.push(meta.join(' · '), '');
		if (m.body) out.push(curated(m.body, posix.dirname(m.docPath), pageDir), '');

		out.push('## From the code', '', '_Everything below is generated from the code._', '');
		out.push(`**Files:** ${m.files}${m.files ? ` (${rolesText(m.roles)})` : ''}`, '');
		const nested = model.modules.filter((n) => n.path !== m.path && moduleOf(n.path, allPaths.filter((x) => x !== n.path)) === m.path);
		if (nested.length) {
			out.push('**Documented subfolders:**', '');
			for (const n of nested) out.push(`- ${pageLink(pageDir, n.path)}: ${cell(n.summary)}`);
			out.push('');
		}
		const table = (title, list, key) => {
			out.push(`### ${title}`, '');
			if (!list.length) return out.push('None.', '');
			out.push('| Module | Imports |', '|---|---|');
			for (const e of list) out.push(`| ${pageLink(pageDir, e[key])} | ${e.count} |`);
			out.push('');
		};
		table('Depends on', deps, 'to');
		table('Used by', users, 'from');
		out.push(
			m.group === 'rust'
				? '_For Rust modules an import is a source file that names the other module through a `crate::` path._'
				: '_An import is one import statement, type-only imports included._',
			'',
		);

		const sent = model.commands.filter((c) => c.callers.includes(m.path));
		const served = model.commands.filter((c) => c.rust === m.path);
		if (sent.length) {
			out.push('### IPC commands it calls', '', '| Command | Rust module |', '|---|---|');
			for (const c of sent) out.push(`| \`${c.command}\` | ${pageLink(pageDir, c.rust)} |`);
			out.push('');
		}
		if (served.length) {
			out.push('### IPC commands it registers', '', '| Command | Called from |', '|---|---|');
			for (const c of served) out.push(`| \`${c.command}\` | ${c.callers.map((p) => pageLink(pageDir, p)).join(', ') || 'no `call()` found'} |`);
			out.push('');
		}
		if (m.debt.length) {
			out.push('### Layer-rule debt', '', `Baseline entries of ${codeLink(pageDir, 'src/tests/lib/architecture/layer-baseline.json', 'layer-baseline.json')} that touch this module:`, '');
			for (const d of m.debt) out.push(`- \`${d}\``);
			out.push('');
		}
		out.push('### Neighbors', '', moduleDiagram(m, deps, users), '');
		pages.set(pageOf(m.path), `${out.join('\n').trimEnd()}\n`);
	}

	// Index.
	const idx = ['# Kokobrain architecture map', ''];
	idx.push(
		`Generated by \`node scripts/architecture-map.mjs\`${sourceSha ? ` from commit \`${sourceSha}\`` : ''}. Do not edit these pages: the prose comes from \`${DOCS}/\` on main and the rest from the code.`,
		'',
	);
	idx.push('- [Layer diagram](#layer-diagram)');
	for (const g of GROUPS) idx.push(`- [${g.title}](#${g.id})`);
	idx.push('- [Graph data](#graph-data)', '');
	if (model.overview) idx.push(curated(model.overview, DOCS, outDir), '');

	idx.push('<a id="layer-diagram"></a>', '', '## Layer diagram', '', 'Import statements between layers (Rust: source files), and IPC commands from each frontend layer to Rust.', '');
	const layerEdges = new Map();
	for (const e of model.edges) {
		const a = layerOf(e.from), b = layerOf(e.to);
		if (a !== b) layerEdges.set(`${a}\n${b}`, (layerEdges.get(`${a}\n${b}`) ?? 0) + e.count);
	}
	const ipc = new Map();
	for (const c of model.commands) for (const p of c.callers) ipc.set(layerOf(p), (ipc.get(layerOf(p)) ?? new Set()).add(c.command));
	const layers = [...new Set(model.modules.map((m) => layerOf(m.path)))].sort();
	idx.push('```mermaid', 'flowchart TB');
	for (const l of layers) idx.push(`\tL_${l}["${l}"]`);
	for (const [key, n] of [...layerEdges].sort(([a], [b]) => cmp(a, b))) {
		const [a, b] = key.split('\n');
		idx.push(`\tL_${a} -->|${n}| L_${b}`);
	}
	for (const [l, set] of [...ipc].sort(([a], [b]) => cmp(a, b))) idx.push(`\tL_${l} -.->|${set.size} commands| L_rust`);
	idx.push('```', '');

	for (const g of GROUPS) {
		const mods = model.modules.filter((m) => m.group === g.id);
		idx.push(`<a id="${g.id}"></a>`, '', `## ${g.title}`, '');
		if (model.groups[g.id]) idx.push(curated(model.groups[g.id], `${DOCS}/groups`, outDir), '');
		idx.push('| Module | Summary | Files | Depends on | Used by |', '|---|---|---|---|---|');
		for (const m of mods) {
			const deps = model.edges.filter((e) => e.from === m.path).length;
			const users = model.edges.filter((e) => e.to === m.path).length;
			idx.push(`| [\`${m.path}\`](${pageOf(m.path)}) | ${cell(m.summary)} | ${m.files} | ${deps} | ${users} |`);
		}
		idx.push('');
	}

	idx.push('<a id="graph-data"></a>', '', '## Graph data', '');
	idx.push('- [`graph/modules.json`](graph/modules.json): modules, module edges and IPC commands, the data behind these pages.');
	if (graphify) {
		idx.push(
			'- [`graphify/`](graphify/): symbol-level graph from [graphify](https://github.com/Graphify-Labs/graphify), code-only mode. `graph.html` is interactive; `GRAPH_REPORT.md` lists hubs and communities; `graph.json` answers `graphify query`, `graphify path` and `graphify explain`.',
		);
	}
	idx.push('');
	pages.set('README.md', `${idx.join('\n').trimEnd()}\n`);

	const json = {
		modules: model.modules.map((m) => ({ path: m.path, group: m.group, summary: m.summary, files: m.files, roles: m.roles, tests: m.tests })),
		edges: model.edges,
		commands: model.commands,
	};
	pages.set('graph/modules.json', `${JSON.stringify(json, null, '\t')}\n`);
	return pages;
}

/** Entries of an output folder that a run keeps: a git worktree link, and graphify output written by another step. */
const KEEP = new Set(['.git', 'graphify']);

/**
 * Writes pages to `outAbs`, replacing earlier generator output only. A folder
 * that has content other than `KEEP` and no marker is refused, so a wrong
 * `--out` never deletes someone's files.
 */
export function writePages(outAbs, pages) {
	if (existsSync(outAbs)) {
		const entries = readdirSync(outAbs).filter((e) => !KEEP.has(e));
		if (entries.length && !existsSync(join(outAbs, MARKER))) {
			throw new Error(`${outAbs} is not empty and has no ${MARKER} marker; refusing to replace it`);
		}
		for (const e of entries) rmSync(join(outAbs, e), { recursive: true, force: true });
	}
	for (const [path, content] of pages) {
		mkdirSync(dirname(join(outAbs, path)), { recursive: true });
		writeFileSync(join(outAbs, path), content);
	}
	writeFileSync(join(outAbs, MARKER), 'Written by scripts/architecture-map.mjs. Everything here is replaced on the next run.\n');
}

/** Whether this module is the script node was started with. */
function isMain() {
	try {
		return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
}

if (isMain()) {
	const argv = process.argv.slice(2);
	const flag = (name) => {
		const i = argv.indexOf(name);
		return i === -1 ? undefined : argv[i + 1];
	};
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const model = buildModel(root);
	const problems = validate(model);
	if (problems.length) {
		console.error(`The curated docs in ${DOCS}/ do not match the code:\n\t${problems.join('\n\t')}`);
		process.exit(1);
	}
	if (argv.includes('--check')) {
		console.error(`${model.modules.length} modules, docs match the code.`);
		process.exit(0);
	}
	const outAbs = resolve(root, flag('--out') ?? DEFAULT_OUT);
	const outDir = relative(root, outAbs).split(sep).join('/');
	if (outDir.startsWith('..') && !flag('--link-base')) {
		// Relative links from outside the repo would spell out the absolute path of the checkout.
		console.error('--out outside the repo needs --link-base <url>');
		process.exit(1);
	}
	const pages = render(model, { outDir, linkBase: flag('--link-base'), sourceSha: flag('--source'), graphify: argv.includes('--graphify') });
	writePages(outAbs, pages);
	console.error(`${pages.size} files written to ${outDir}/`);
}
