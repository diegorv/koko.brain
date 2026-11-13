// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * codemap.mjs
 *
 * The code map generator entry (spec sections 11 and F13).
 *
 *   node scripts/codemap.mjs [build]           writes codemap/ (on main or with CI=true only)
 *   node scripts/codemap.mjs --out <dir>       writes the map to <dir>
 *   node scripts/codemap.mjs --stale [--out <dir>]
 *                                              exit 0 when the map's inputs hash matches the tree, else 1
 *
 * The output folder is replaced only when it is missing, empty apart from
 * `.git`, or holds a code map `INDEX.md`. Git and the `CI` variable decide
 * whether an in-place build may write and what `--stale` prints, never the
 * bytes written.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildModel, isInput, readInputs } from './codemap/model.mjs';
import { INDEX_TITLE, renderMap } from './codemap/render.mjs';

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** The repo this generator lives in, the default build root. */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The default output folder, relative to the build root. */
const OUT = 'codemap';

/** Most changed inputs `--stale` lists. */
const STALE_LIST_CAP = 20;

/** The command-line usage, printed on a usage error. */
const USAGE = [
	'usage: node scripts/codemap.mjs [build] [--out <dir>]',
	'       node scripts/codemap.mjs --stale [--out <dir>]',
	'',
].join('\n');

/** The generator's own files, by repo-relative path: they are inputs of the hash. */
function generatorFiles() {
	const own = readdirSync(join(REPO, 'scripts/codemap'))
		.filter((n) => n.endsWith('.mjs'))
		.map((n) => `scripts/codemap/${n}`);
	return new Map(
		['scripts/codemap.mjs', 'scripts/import-graph.mjs', ...own].sort(cmp).map((p) => [p, readFileSync(join(REPO, p), 'utf8')]),
	);
}

/** Whether a repo-relative path is a generator file (hash input, not an F1 input). */
const isGeneratorFile = (p) => p === 'scripts/codemap.mjs' || p === 'scripts/import-graph.mjs' || /^scripts\/codemap\/[^/]+\.mjs$/.test(p);

/** The installed TypeScript version, part of the inputs hash. */
function typescriptVersion() {
	return createRequire(import.meta.url)('typescript/package.json').version;
}

/**
 * The F13 inputs hash: sha256 over the code-unit-sorted `path\0content\0` of
 * every F1 input and generator file, then `typescript@<version>`.
 *
 * @param {Map<string, string>} inputs F1 inputs by repo-relative path, as `readInputs` gives them
 * @returns {string} the first 12 hex chars
 */
export function inputsHash(inputs) {
	const all = new Map([...inputs, ...generatorFiles()]);
	const h = createHash('sha256');
	for (const p of [...all.keys()].sort(cmp)) h.update(`${p}\0${all.get(p)}\0`);
	h.update(`typescript@${typescriptVersion()}`);
	return h.digest('hex').slice(0, 12);
}

/**
 * Replaces the contents of `outAbs` with `files`. A folder is replaced only
 * when it is missing, empty apart from `.git`, or holds an `INDEX.md` whose
 * line 1 is the code map title; `.git` is kept.
 *
 * @param {string} outAbs absolute output folder
 * @param {Map<string, string>} files contents by path under the folder
 * @throws {Error} naming the folder when it holds anything else
 */
export function writeMap(outAbs, files) {
	if (existsSync(outAbs)) {
		const entries = readdirSync(outAbs)
			.filter((e) => e !== '.git')
			.sort(cmp);
		if (entries.length) {
			const index = join(outAbs, 'INDEX.md');
			const marked = existsSync(index) && readFileSync(index, 'utf8').split('\n', 1)[0] === INDEX_TITLE;
			if (!marked) throw new Error(`${outAbs} is not empty and has no code map INDEX.md; refusing to replace it`);
		}
		for (const e of entries) rmSync(join(outAbs, e), { recursive: true, force: true });
	}
	for (const [path, text] of files) {
		mkdirSync(dirname(join(outAbs, path)), { recursive: true });
		writeFileSync(join(outAbs, path), text);
	}
}

/**
 * Runs git in `root`; null when git fails. Inherited `GIT_*` variables are
 * dropped: under a git hook `GIT_DIR` would point git at another repository.
 */
function gitOut(root, args) {
	const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
	try {
		return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env });
	} catch {
		return null;
	}
}

/**
 * The inputs changed since the last commit that touched the map's INDEX (or
 * since HEAD when no commit did), plus untracked inputs, for the `--stale`
 * message only.
 *
 * @returns {{since: string, paths: string[]}} `since` names the base in the message
 */
function changedInputs(root, outAbs) {
	const index = join(outAbs, 'INDEX.md');
	const rel = index.startsWith(`${root}/`) ? index.slice(root.length + 1) : null;
	const sha = rel ? gitOut(root, ['log', '-1', '--format=%H', '--', rel])?.trim() : '';
	const since = sha ? 'changed inputs:' : `no commit holds ${rel ?? "the map's INDEX.md"}; changed inputs since HEAD:`;
	const changed = (gitOut(root, ['diff', '--name-only', sha || 'HEAD', '--']) ?? '').split('\n');
	const untracked = (gitOut(root, ['ls-files', '--others', '--exclude-standard']) ?? '').split('\n');
	return { since, paths: [...new Set([...changed, ...untracked])].filter((p) => p && (isInput(p) || isGeneratorFile(p))).sort(cmp) };
}

/** `--stale`: compares the tree's inputs hash with the map's INDEX line 2. */
function stale(root, outAbs, out) {
	const hash = inputsHash(readInputs(root));
	const index = join(outAbs, 'INDEX.md');
	const have = existsSync(index) ? (/inputs=sha256:([0-9a-f]{12})/.exec(readFileSync(index, 'utf8'))?.[1] ?? null) : null;
	if (have === hash) {
		out(`codemap is current: inputs=sha256:${hash}\n`);
		return 0;
	}
	out(have ? `codemap is stale: INDEX has inputs=sha256:${have}, the tree gives ${hash}\n` : `codemap is stale: no INDEX.md in ${outAbs}\n`);
	const { since, paths } = changedInputs(root, outAbs);
	if (paths.length) {
		out(`${since}\n${paths.slice(0, STALE_LIST_CAP).map((p) => `  ${p}\n`).join('')}`);
		if (paths.length > STALE_LIST_CAP) out(`  and ${paths.length - STALE_LIST_CAP} more\n`);
	}
	return 1;
}

/**
 * A folder's path through symlinks, lowercased so a case variant on a
 * case-insensitive file system compares equal: the real path of its nearest
 * existing ancestor joined with the rest.
 */
function canonicalPath(abs) {
	let base = abs;
	const rest = [];
	while (!existsSync(base) && dirname(base) !== base) {
		rest.unshift(basename(base));
		base = dirname(base);
	}
	return join(realpathSync(base), ...rest).toLowerCase();
}

/**
 * The generator command line.
 *
 * @param {string[]} argv arguments after the script path
 * @param {{root?: string, env?: Record<string, string | undefined>, cwd?: string,
 *   out?: (text: string) => void, err?: (text: string) => void}} [io] the repo
 *   to map (default: this script's repo), the environment (`CI`), the folder
 *   a relative `--out` resolves against, and the stdout and stderr writers
 * @returns {number} the exit code: 0 written or current, 1 stale or failed,
 *   2 usage error or in-place write refused
 */
export function main(argv, io = {}) {
	const root = io.root ?? REPO;
	const env = io.env ?? process.env;
	const cwd = io.cwd ?? process.cwd();
	const out = io.out ?? ((s) => process.stdout.write(s));
	const err = io.err ?? ((s) => process.stderr.write(s));
	const args = argv[0] === 'build' ? argv.slice(1) : argv;
	let outArg = null;
	let staleMode = false;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--out' && i + 1 < args.length) outArg = args[++i];
		else if (args[i] === '--stale') staleMode = true;
		else {
			err(USAGE);
			return 2;
		}
	}
	const inPlace = resolve(root, OUT);
	const outAbs = outArg === null ? inPlace : resolve(cwd, outArg);
	if (staleMode) return stale(root, outAbs, out);
	const writesInPlace = outAbs === inPlace || canonicalPath(outAbs) === canonicalPath(inPlace);
	if (writesInPlace && env.CI !== 'true' && gitOut(root, ['rev-parse', '--abbrev-ref', 'HEAD'])?.trim() !== 'main') {
		err('codemap/ is written by CI on main; use q (live) or --out <dir>\n');
		return 2;
	}
	try {
		const t0 = performance.now();
		const inputs = readInputs(root);
		const files = renderMap(buildModel(inputs), { inputsHash: inputsHash(inputs) });
		writeMap(outAbs, files);
		const cards = [...files.keys()].filter((p) => p.startsWith('files/') && !p.endsWith('.calls.md')).length;
		err(`codemap: ${inputs.size} inputs, ${files.size} files (${cards} cards) written to ${outAbs} in ${Math.round(performance.now() - t0)} ms\n`);
		return 0;
	} catch (e) {
		err(`${e.message}\n`);
		return 1;
	}
}

/** Whether this module is the script node was started with. */
function isMain() {
	try {
		return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
}

if (isMain()) process.exitCode = main(process.argv.slice(2));
