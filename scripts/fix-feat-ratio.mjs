#!/usr/bin/env node
// @ts-nocheck - build-time CLI script, not part of the app's type-checked
// surface. The unit test imports it, which would otherwise pull it into the
// svelte-check program with no @types for its node usage.
/**
 * fix-feat-ratio.mjs
 *
 * A report, not a gate: counts `fix:` and `feat:` commits per product area and
 * month, so the owner can spot modules that keep needing fixes. The triggers
 * that tell the owner when to read the subjects live in docs/HOTSPOTS.md.
 *
 *   node scripts/fix-feat-ratio.mjs [--since <date>] [--until <date>] [--top N]
 *   node scripts/fix-feat-ratio.mjs --paths '<glob>' [--since <date>] [--until <date>]
 *
 * Table mode reads `git log --no-merges --name-only` and prints one row per
 * area with a `fix:feat` cell per month, the total and the fix/feat ratio. A
 * commit counts once per area it touches and once in TOTAL.
 *
 * `--paths` lists the `fix:` subjects that touch the glob (last 8 weeks unless
 * `--since` is given). It does not filter out in-run review fixes: relay runs
 * rebase and fast-forward, so git alone cannot tell them apart. Read them.
 *
 * Read-only: it runs `git log` and prints to stdout.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Area for commits that touch no product code. */
export const NO_PRODUCT_AREA = '(no product code)';

const LIVE_PREVIEW_PREFIX = 'core/markdown-editor/extensions/live-preview/';
const NAMED_LAYERS = new Set(['utils', 'components', 'types', 'app', 'contracts']);
/** Rust modules whose name has an underscore, so a `<module>_x_test.rs` file keeps the whole name. */
const MULTI_WORD_RUST_MODULES = ['error_monitoring', 'quick_capture'];
/**
 * Rust test stems whose first word is not a src-tauri/src module, mapped to
 * the area they test. `core_tauri_free` is an architecture ratchet, which is
 * not product code (like src/tests/lib/architecture/).
 */
const RUST_TEST_AREA_EXCEPTIONS = new Map([
	['fts_repo', 'rust/db'],
	['history', 'rust/commands'],
	['ipc_contracts', 'contracts'],
	['core_tauri_free', null],
]);

/**
 * Parse a Conventional Commits subject.
 * @param {string} subject
 * @returns {{ type: string, scope: string | null, breaking: boolean } | null} null when not conventional
 */
export function parseSubject(subject) {
	const match = /^([a-z]+)(?:\(([^)]*)\))?(!)?:\s/.exec(subject);
	if (!match) return null;
	return { type: match[1], scope: match[2] ?? null, breaking: match[3] === '!' };
}

/**
 * Map a src/lib-relative path to its area.
 * @param {string} rest path below src/lib/
 * @returns {string | null}
 */
function libAreaOf(rest) {
	if (rest === 'utils.ts') return 'utils';
	if (rest.startsWith(LIVE_PREVIEW_PREFIX)) return 'core/live-preview';
	const parts = rest.split('/');
	if (parts.length < 2) return null;
	if (['core', 'features', 'plugins'].includes(parts[0])) {
		return parts.length >= 3 ? `${parts[0]}/${parts[1]}` : null;
	}
	return NAMED_LAYERS.has(parts[0]) ? parts[0] : null;
}

/**
 * Map a src-tauri/tests path to the Rust module it tests.
 * @param {string} rest path below src-tauri/tests/
 * @returns {string | null}
 */
function rustTestAreaOf(rest) {
	const parts = rest.split('/');
	if (parts.length >= 2) return parts[0] === 'fixtures' ? null : `rust/${parts[0]}`;
	if (!rest.endsWith('.rs')) return null;
	const stem = rest.replace(/\.rs$/, '').replace(/_test$/, '');
	if (RUST_TEST_AREA_EXCEPTIONS.has(stem)) return RUST_TEST_AREA_EXCEPTIONS.get(stem);
	const multi = MULTI_WORD_RUST_MODULES.find((m) => stem === m || stem.startsWith(`${m}_`));
	return `rust/${multi ?? stem.split('_')[0]}`;
}

/**
 * Map a repo-relative file path to its product area. Tests map to the area of
 * the source they cover.
 * @param {string} path
 * @returns {string | null} null when the path is not product code
 */
export function areaOf(path) {
	if (path.startsWith('src/lib/')) return libAreaOf(path.slice('src/lib/'.length));
	if (path.startsWith('src/tests/lib/')) return libAreaOf(path.slice('src/tests/lib/'.length));
	if (path.startsWith('src/routes/')) return 'routes';
	if (path.startsWith('src-tauri/src/')) {
		const first = path.slice('src-tauri/src/'.length).split('/')[0];
		return `rust/${first.replace(/\.rs$/, '')}`;
	}
	if (path.startsWith('src-tauri/tests/')) return rustTestAreaOf(path.slice('src-tauri/tests/'.length));
	return null;
}

/**
 * @typedef {{ fix: number, feat: number }} Counts
 * @typedef {{ byMonth: Record<string, Counts>, total: Counts }} Row
 */

/** @returns {Row} */
function emptyRow() {
	return { byMonth: {}, total: { fix: 0, feat: 0 } };
}

function bump(row, month, type) {
	row.byMonth[month] ??= { fix: 0, feat: 0 };
	row.byMonth[month][type] += 1;
	row.total[type] += 1;
}

/**
 * Count fix and feat commits per area and month.
 * @param {Array<{ date: string, subject: string, files: string[] }>} commits
 *   `date` is ISO 8601; its first 7 characters are the month bucket.
 * @returns {{ months: string[], areas: Record<string, Row>, total: Row }}
 */
export function aggregate(commits) {
	/** @type {Record<string, Row>} */
	const areas = {};
	const total = emptyRow();
	const months = new Set();
	for (const commit of commits) {
		const type = parseSubject(commit.subject)?.type;
		if (type !== 'fix' && type !== 'feat') continue;
		const month = commit.date.slice(0, 7);
		months.add(month);
		bump(total, month, type);
		const touched = new Set(commit.files.map(areaOf).filter((area) => area !== null));
		if (touched.size === 0) touched.add(NO_PRODUCT_AREA);
		for (const area of touched) {
			areas[area] ??= emptyRow();
			bump(areas[area], month, type);
		}
	}
	return { months: [...months].sort(), areas, total };
}

/**
 * Parse `git log --name-only --format=%x1e%cI%x1f%s` output.
 * @param {string} raw
 * @returns {Array<{ date: string, subject: string, files: string[] }>}
 */
export function parseGitLog(raw) {
	return raw
		.split('\x1e')
		.filter((record) => record.trim() !== '')
		.map((record) => {
			const [header, ...lines] = record.split('\n');
			const [date, subject] = header.split('\x1f');
			return { date, subject, files: lines.filter((l) => l.trim() !== '') };
		});
}

function cell(counts) {
	return `${counts?.fix ?? 0}:${counts?.feat ?? 0}`;
}

function ratio(counts) {
	return counts.feat === 0 ? '-' : (counts.fix / counts.feat).toFixed(2);
}

/**
 * Render the month-by-area table, areas ordered by fix count.
 * @param {ReturnType<typeof aggregate>} result
 * @param {number} [top] keep only the N areas with the most fixes
 */
export function formatTable(result, top) {
	let names = Object.keys(result.areas).sort(
		(a, b) => result.areas[b].total.fix - result.areas[a].total.fix || a.localeCompare(b),
	);
	if (top !== undefined) names = names.slice(0, top);
	const header = ['area', ...result.months, 'total', 'fix/feat'];
	const rows = names.map((name) => {
		const row = result.areas[name];
		return [name, ...result.months.map((m) => cell(row.byMonth[m])), cell(row.total), ratio(row.total)];
	});
	const t = result.total;
	rows.push(['TOTAL', ...result.months.map((m) => cell(t.byMonth[m])), cell(t.total), ratio(t.total)]);
	const widths = header.map((_, i) => Math.max(...[header, ...rows].map((r) => r[i].length)));
	return [header, ...rows].map((r) => r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()).join('\n');
}

function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		if (!['--since', '--until', '--paths', '--top'].includes(flag)) throw new Error(`unknown argument: ${flag}`);
		const value = argv[++i];
		if (value === undefined) throw new Error(`${flag} needs a value`);
		args[flag.slice(2)] = value;
	}
	if (args.top !== undefined) {
		const top = Number(args.top);
		if (!Number.isInteger(top) || top < 1) throw new Error('--top needs a positive integer');
		args.top = top;
	}
	return args;
}

function gitLog(args) {
	return execFileSync('git', ['log', '--no-merges', ...args], {
		cwd: repoRoot,
		encoding: 'utf8',
		maxBuffer: 256 * 1024 * 1024,
	});
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const range = [];
	if (args.since) range.push(`--since=${args.since}`);
	if (args.until) range.push(`--until=${args.until}`);

	if (args.paths) {
		if (!args.since) range.push('--since=8.weeks.ago');
		const raw = gitLog([...range, '--format=%h %cs %s', '--', `:(glob)${args.paths}`]);
		const fixes = raw
			.split('\n')
			.filter((line) => parseSubject(line.split(' ').slice(2).join(' '))?.type === 'fix');
		console.log(`${fixes.length} fix commit(s) touching ${args.paths}`);
		for (const line of fixes) console.log(line);
		return;
	}

	const commits = parseGitLog(gitLog([...range, '--name-only', '--format=%x1e%cI%x1f%s']));
	console.log(formatTable(aggregate(commits), args.top));
}

// Only read git history when run as a CLI. The pure helpers above are imported
// by src/tests/scripts/fix-feat-ratio.test.ts.
const runAsCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsCli) {
	try {
		main();
	} catch (err) {
		console.error('fix-feat-ratio failed:', err.message);
		process.exit(2);
	}
}
