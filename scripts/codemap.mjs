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
 *   node scripts/codemap.mjs q <command> … [--no-cache]
 *                                              query a model of the working tree (`q help`)
 *
 * `q` keeps the last model it built in `node_modules/.cache/codemap/model.bin`
 * (git-ignored), keyed by the full inputs hash, and loads it while the hash
 * matches; `--no-cache` builds from scratch and leaves the file alone.
 *
 * The output folder is replaced only when it is missing, empty apart from
 * `.git`, or holds a code map `INDEX.md`. Git and the `CI` variable decide
 * whether an in-place build may write and what `--stale` prints, never the
 * bytes written.
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	writeFileSync,
	writeSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';

import { buildModel, isInput, modelData, readInputs, restoreModel } from './codemap/model.mjs';
import { runQuery } from './codemap/query.mjs';
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
	'       node scripts/codemap.mjs q <command> <arg> [options] [--no-cache]   (q help lists the commands)',
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
 * The full F13 inputs hash: sha256 over the code-unit-sorted
 * `path\0content\0` of every F1 input and generator file, then
 * `typescript@<version>`. The query cache key.
 *
 * @param {Map<string, string>} inputs F1 inputs by repo-relative path, as `readInputs` gives them
 * @returns {string} 64 hex chars
 */
export function inputsDigest(inputs) {
	const all = new Map([...inputs, ...generatorFiles()]);
	const h = createHash('sha256');
	for (const p of [...all.keys()].sort(cmp)) h.update(`${p}\0${all.get(p)}\0`);
	h.update(`typescript@${typescriptVersion()}`);
	return h.digest('hex');
}

/**
 * The F13 inputs hash as INDEX line 2 prints it.
 *
 * @param {Map<string, string>} inputs F1 inputs by repo-relative path, as `readInputs` gives them
 * @returns {string} the first 12 hex chars of `inputsDigest`
 */
export function inputsHash(inputs) {
	return inputsDigest(inputs).slice(0, 12);
}

/** The query model cache, relative to the repo root; `node_modules/` is git-ignored. */
export const MODEL_CACHE = 'node_modules/.cache/codemap/model.bin';

/**
 * Line 1 of the cache file. The Node version is part of it because `v8`
 * serialization is only guaranteed to round-trip on the Node that wrote it.
 */
const CACHE_FORMAT = `codemap-model-cache 1 node ${process.version}`;

/** sha256 of a buffer, in hex. */
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * The model data in the cache file when its format line, key, payload length
 * and payload checksum all match; null for a missing, foreign, truncated or
 * damaged file.
 *
 * File layout: `<CACHE_FORMAT>\nkey <digest>\npayload <sha256> <bytes>\n<v8 payload>`.
 */
function readCache(file, key) {
	let buf;
	try {
		buf = readFileSync(file);
	} catch {
		return null;
	}
	const head = `${CACHE_FORMAT}\nkey ${key}\n`;
	if (buf.length < head.length || buf.toString('latin1', 0, head.length) !== head) return null;
	const nl = buf.indexOf(10, head.length);
	if (nl < 0) return null;
	const sum = /^payload ([0-9a-f]{64}) (\d+)$/.exec(buf.toString('latin1', head.length, nl));
	const payload = buf.subarray(nl + 1);
	if (!sum || payload.length !== Number(sum[2]) || sha256(payload) !== sum[1]) return null;
	try {
		return deserialize(payload);
	} catch {
		return null;
	}
}

/** True when a process with this pid exists (a permission error still means it does). */
function pidAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (e) {
		return e.code === 'EPERM';
	}
}

/** Removes the temp files a killed writer left beside the cache file; those of live processes stay. */
function sweepTempFiles(file) {
	const dir = dirname(file);
	const prefix = `${basename(file)}.`;
	let names;
	try {
		names = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of names) {
		const m = name.startsWith(prefix) && /^(\d+)\.[0-9a-f]+\.tmp$/.exec(name.slice(prefix.length));
		if (m && !pidAlive(Number(m[1]))) rmSync(join(dir, name), { force: true });
	}
}

/**
 * Writes the cache file through a temp file in the same folder and a rename,
 * so a reader, or a concurrent `q`, sees either a whole file or the previous
 * one. A failed write leaves no temp file and does not fail the query: the
 * cache only saves time. Temp files of dead processes are swept first.
 */
function writeCache(file, key, model) {
	const tmp = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
	try {
		const payload = serialize(modelData(model));
		mkdirSync(dirname(file), { recursive: true });
		sweepTempFiles(file);
		const fd = openSync(tmp, 'w');
		try {
			writeSync(fd, `${CACHE_FORMAT}\nkey ${key}\npayload ${sha256(payload)} ${payload.length}\n`, null, 'latin1');
			writeSync(fd, payload);
		} finally {
			closeSync(fd);
		}
		renameSync(tmp, file);
	} catch {
		rmSync(tmp, { force: true });
	}
}

/**
 * The model of a repo's working tree for `q`: loaded from `MODEL_CACHE` when
 * its key equals the tree's full inputs hash, else built and written there.
 *
 * @param {string} root absolute repo root
 * @param {{cache?: boolean}} [opts] `cache: false` builds without reading or writing the file
 * @returns {{model: ReturnType<typeof buildModel>, hit: boolean}} `hit` when the model came from the file
 */
export function cachedModel(root, { cache = true } = {}) {
	const inputs = readInputs(root);
	if (!cache) return { model: buildModel(inputs), hit: false };
	const key = inputsDigest(inputs);
	const file = join(root, MODEL_CACHE);
	const data = readCache(file, key);
	if (data) return { model: restoreModel(data, inputs), hit: true };
	const model = buildModel(inputs);
	writeCache(file, key, model);
	return { model, hit: false };
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
 * @returns {number} the exit code: 0 written, current or found, 1 stale,
 *   failed, no match or ambiguous, 2 usage error or in-place write refused
 */
export function main(argv, io = {}) {
	const root = io.root ?? REPO;
	const env = io.env ?? process.env;
	const cwd = io.cwd ?? process.cwd();
	const out = io.out ?? ((s) => process.stdout.write(s));
	const err = io.err ?? ((s) => process.stderr.write(s));
	if (argv[0] === 'q') {
		const qArgs = argv.slice(1).filter((a) => a !== '--no-cache');
		const cache = qArgs.length === argv.length - 1;
		const res = runQuery(qArgs, () => cachedModel(root, { cache }).model);
		if (res.stdout) out(res.stdout);
		if (res.stderr) err(res.stderr);
		return res.code;
	}
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
