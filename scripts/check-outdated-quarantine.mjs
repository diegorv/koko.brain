#!/usr/bin/env node
// @ts-nocheck - build-time CLI script, not part of the app's type-checked
// surface. The unit test imports it, which would otherwise pull it into the
// svelte-check program with no @types for its node/semver usage.
/**
 * check-outdated-quarantine.mjs
 *
 * Cross-references the installed dependency tree with the supply-chain
 * quarantine policy in pnpm-workspace.yaml (`minimumReleaseAge` +
 * `minimumReleaseAgeExclude`) and reports, per dependency, the newest version
 * that is actually allowed to install right now (i.e. has aged past the
 * quarantine window), plus any newer version still held in quarantine and when
 * it clears. It also folds in `pnpm audit` so a security patch is never hidden
 * behind the quarantine reporting.
 *
 * Why: a version's age gates whether `pnpm install`/`pnpm update` will accept
 * it, so the registry's "latest" is not the same as "what you can bump to
 * today". This script answers the second question.
 *
 * Why not `pnpm outdated`: it applies `minimumReleaseAge` itself and OMITS a
 * package entirely when every newer version is still quarantined. That hides
 * exactly the case that matters most — a security patch published in the last
 * few days. This script reads the installed tree and the registry directly, so
 * a package with only quarantined upgrades still shows up as locked.
 *
 * Usage: node scripts/check-outdated-quarantine.mjs
 *
 * Exit code: 0 always, unless an unexpected error occurs (then 2).
 */

import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';
import semver from 'semver';

const exec = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Max concurrent `pnpm view` spawns. Keeps the registry sweep from forking ~90 processes at once. */
const CONCURRENCY = 8;

/** Run a command and return stdout, tolerating non-zero exit (pnpm audit exits 1 when vulnerabilities exist). */
async function run(cmd, args) {
	try {
		const { stdout } = await exec(cmd, args, { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 });
		return stdout;
	} catch (err) {
		// pnpm audit returns a non-zero code with valid stdout when advisories exist.
		if (err.stdout) return err.stdout;
		throw err;
	}
}

/** Run `fn` over `items` with at most `limit` in flight, preserving input order in the result. */
async function mapLimit(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i], i);
		}
	});
	await Promise.all(workers);
	return results;
}

/** Convert a minimumReleaseAgeExclude glob (e.g. `@tauri-apps/*`) into a RegExp. */
function globToRegExp(glob) {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	return new RegExp(`^${escaped}$`);
}

/** Read minimumReleaseAge (minutes) and exclude patterns from pnpm-workspace.yaml. */
function readQuarantinePolicy() {
	const raw = readFileSync(resolve(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
	const cfg = parseYaml(raw) ?? {};
	const ageMinutes = Number(cfg.minimumReleaseAge ?? 0);
	const excludes = Array.isArray(cfg.minimumReleaseAgeExclude)
		? cfg.minimumReleaseAgeExclude.map(globToRegExp)
		: [];
	return { ageMinutes, excludes };
}

/** Installed direct dependencies as a Map of name -> version, from the real tree (not package.json ranges). */
async function readInstalledDirectDeps() {
	const parsed = JSON.parse((await run('pnpm', ['ls', '--depth', '0', '--json'])).trim() || '[]');
	const pkg = Array.isArray(parsed) ? parsed[0] : parsed;
	const installed = new Map();
	for (const group of ['dependencies', 'devDependencies']) {
		for (const [name, info] of Object.entries(pkg?.[group] ?? {})) {
			if (info?.version) installed.set(name, { version: info.version, dev: group === 'devDependencies' });
		}
	}
	return installed;
}

/** Advisories from `pnpm audit`, grouped by module name. Includes transitive packages. */
async function readAudit() {
	let parsed;
	try {
		parsed = JSON.parse((await run('pnpm', ['audit', '--json'])).trim() || '{}');
	} catch {
		return null; // Audit unavailable (offline, registry error) — reported to the user, not fatal.
	}
	const byModule = new Map();
	for (const adv of Object.values(parsed.advisories ?? {})) {
		const list = byModule.get(adv.module_name) ?? [];
		list.push({
			title: adv.title,
			severity: adv.severity,
			patchedVersions: adv.patched_versions,
			url: adv.url,
			// Distinct installed versions flagged by this advisory.
			installedVersions: [...new Set((adv.findings ?? []).map((f) => f.version))],
		});
		byModule.set(adv.module_name, list);
	}
	return byModule;
}

/**
 * Turn a registry `time` object into a Map of stable version -> publish Date.
 *
 * Drops the non-version `created`/`modified` keys, every prerelease, and any
 * version above the `latest` dist-tag. That last filter matters: some packages
 * carry mistagged or abandoned releases that are semver-greater than anything
 * the maintainers actually ship (e.g. `codemirror@6.65.7` published while
 * `latest` is 6.0.2), and treating those as an upgrade would be wrong.
 *
 * @param {Record<string, string> | undefined} timeObj Registry `time` field.
 * @param {string | undefined} latest The `latest` dist-tag, if known.
 * @returns {Map<string, Date>}
 */
export function stableVersionsUpToLatest(timeObj, latest) {
	const times = new Map();
	for (const [v, t] of Object.entries(timeObj ?? {})) {
		if (!semver.valid(v) || semver.prerelease(v)) continue;
		if (latest && semver.gt(v, latest)) continue;
		times.set(v, new Date(t));
	}
	return times;
}

/**
 * Split the versions newer than `current` into what can be installed today and
 * what the quarantine still holds.
 *
 * @param {Map<string, Date>} times Stable version -> publish Date.
 * @param {string} current Installed version.
 * @param {number} cutoff Epoch ms; a release published at or before this has cleared quarantine.
 * @param {boolean} excluded Whether the package bypasses quarantine entirely.
 * @returns {{installable: string | null, installableAt: Date | null, locked: Array<{version: string, publishedAt: Date}>}}
 *   `installable` is the highest version available now; `locked` lists every
 *   version above it that is still inside the window (empty when excluded).
 */
export function classifyUpgrades(times, current, cutoff, excluded) {
	const newer = [...times].filter(([v]) => semver.gt(v, current));
	if (newer.length === 0) return { installable: null, installableAt: null, locked: [] };

	const cleared = excluded ? newer : newer.filter(([, t]) => t.getTime() <= cutoff);
	let installable = null;
	for (const [v] of cleared) {
		if (installable === null || semver.gt(v, installable)) installable = v;
	}
	const locked = excluded
		? []
		: newer
				.filter(([v, t]) => (!installable || semver.gt(v, installable)) && t.getTime() > cutoff)
				.sort(([a], [b]) => semver.compare(a, b))
				.map(([version, publishedAt]) => ({ version, publishedAt }));

	return {
		installable,
		installableAt: installable ? times.get(installable) : null,
		locked,
	};
}

/** Fetch publish times for a package. Null if the registry call fails. */
async function fetchPublishTimes(name) {
	let raw;
	try {
		raw = JSON.parse(await run('pnpm', ['view', name, 'time', 'dist-tags', '--json']));
	} catch {
		return null;
	}
	return stableVersionsUpToLatest(raw.time, raw['dist-tags']?.latest);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Compact UTC date, e.g. "Jun 14". */
function shortDate(d) {
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Human-friendly "when does this unlock", e.g. "Jun 30, 18:48 UTC (in 3h)". */
function unlockStr(d, now) {
	const mins = Math.round((d.getTime() - now) / 60000);
	let rel;
	if (mins <= 0) rel = 'now';
	else if (mins < 60) rel = `in ${mins}m`;
	else if (mins < 60 * 36) rel = `in ${Math.round(mins / 60)}h`;
	else rel = `in ${Math.round(mins / 1440)}d`;
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mm = String(d.getUTCMinutes()).padStart(2, '0');
	return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hh}:${mm} UTC (${rel})`;
}

const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };

async function main() {
	const { ageMinutes, excludes } = readQuarantinePolicy();
	const now = Date.now();
	const cutoff = now - ageMinutes * 60 * 1000;
	const isExcluded = (name) => excludes.some((re) => re.test(name));

	const installed = await readInstalledDirectDeps();
	const audit = await readAudit();

	// Every package we need registry timing for: all direct deps, plus any
	// vulnerable transitive package so its patch release can be dated too.
	const names = new Set(installed.keys());
	if (audit) for (const name of audit.keys()) names.add(name);

	const days = Math.round(ageMinutes / 1440);
	console.log(`Quarantine: a release must be ${days}+ days old before pnpm will install it.`);
	console.log(`Checking ${names.size} packages (${installed.size} direct, registry lookup each).\n`);

	const timesByName = new Map();
	const failed = [];
	await mapLimit([...names], CONCURRENCY, async (name) => {
		const times = await fetchPublishTimes(name);
		if (times === null) failed.push(name);
		else timesByName.set(name, times);
	});

	// ---- Upgrade view: direct deps with a newer stable release. ----
	const upgradable = [];
	const locked = [];
	for (const [name, { version: current, dev }] of installed) {
		const times = timesByName.get(name);
		if (!times) continue;

		const excluded = isExcluded(name);
		const { installable, installableAt, locked: held } = classifyUpgrades(times, current, cutoff, excluded);
		if (installable) {
			upgradable.push({
				name,
				current,
				installable,
				dev,
				excluded,
				// When this version left quarantine (publish time + window).
				clearedAt: new Date(installableAt.getTime() + ageMinutes * 60 * 1000),
			});
		}
		for (const h of held) {
			locked.push({
				name,
				version: h.version,
				clearsAt: new Date(h.publishedAt.getTime() + ageMinutes * 60 * 1000),
			});
		}
	}
	upgradable.sort((a, b) => a.name.localeCompare(b.name));
	locked.sort((a, b) => a.clearsAt - b.clearsAt);

	// ---- Security view: which packages carry advisories, one row per package. ----
	// Deliberately NOT a re-implementation of advisory classification: whether an
	// advisory is actionable or merely quarantined is decided by
	// scripts/quarantine-aware-audit.mjs (the script CI runs). Here the audit is
	// only used to flag the packages, so a quarantined release is recognisable as
	// a security patch rather than a routine bump.
	const security = [];
	for (const [name, advisories] of audit ?? []) {
		const worst = advisories.reduce((a, b) =>
			SEVERITY_ORDER[a.severity] <= SEVERITY_ORDER[b.severity] ? a : b,
		);
		security.push({
			name,
			severity: worst.severity,
			count: advisories.length,
			title: worst.title,
			installedVersions: [...new Set(advisories.flatMap((a) => a.installedVersions))],
			direct: installed.has(name),
		});
	}
	security.sort(
		(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.name.localeCompare(b.name),
	);

	/** Severity tag for a version that closes at least one advisory on this package, else ''. */
	const securityTag = (name, version) => {
		const advisories = audit?.get(name);
		if (!advisories) return '';
		const fixes = advisories.filter((a) => semver.satisfies(version, a.patchedVersions));
		return fixes.length
			? ` [SECURITY ${fixes.reduce((a, b) => (SEVERITY_ORDER[a.severity] <= SEVERITY_ORDER[b.severity] ? a : b)).severity}]`
			: '';
	};

	// ---- Render. ----
	const allNames = [...names];
	const wName = Math.max(7, ...allNames.map((n) => n.length));
	const pad = (s, n) => String(s).padEnd(n);

	if (audit === null) {
		console.log('SECURITY: could not run `pnpm audit` — advisories not checked.\n');
	} else if (security.length === 0) {
		console.log('SECURITY: no known advisories.\n');
	} else {
		console.log(`SECURITY (${security.length} affected packages, most severe first):`);
		const wSev = Math.max(...security.map((s) => s.severity.length)) + 2;
		for (const s of security) {
			const scope = s.direct ? 'direct' : 'transitive';
			const more = s.count > 1 ? ` (+${s.count - 1} more)` : '';
			console.log(
				`  ${pad(`[${s.severity}]`, wSev)} ${pad(s.name, wName)}  ${pad(s.installedVersions.join(', '), 8)}  ${scope}`,
			);
			console.log(`  ${' '.repeat(wSev)} ${pad('', wName)}  ${s.title}${more}`);
		}
		// A transitive package cannot be bumped from package.json; it needs the
		// parent to release or a pnpm.overrides entry.
		if (security.some((s) => !s.direct)) {
			console.log('\n  Transitive entries need an upstream bump or a pnpm.overrides pin.');
		}
		console.log('\n  Run `node scripts/quarantine-aware-audit.mjs` for the actionable/quarantined split.');
		console.log('');
	}

	if (upgradable.length) {
		console.log(`UPDATE NOW (${upgradable.length}):`);
		for (const r of upgradable) {
			const tags = [];
			if (r.excluded) tags.push('day-0 ok');
			if (r.dev) tags.push('dev');
			const tag = tags.length ? `  [${tags.join(', ')}]` : '';
			// Not meaningful for exclude-bypassed packages, which never waited.
			const since = r.excluded ? '' : `  (since ${shortDate(r.clearedAt)})`;
			const sec = securityTag(r.name, r.installable);
			console.log(
				`  ${pad(r.name, wName)}  ${pad(r.current, 8)} ->  ${pad(r.installable, 8)}${since}${tag}${sec}`.trimEnd(),
			);
		}
	} else {
		console.log('UPDATE NOW: nothing — every newer release is still in quarantine.');
	}
	console.log('');

	if (locked.length) {
		console.log(`STILL LOCKED (${locked.length}, soonest first):`);
		for (const l of locked) {
			const sec = securityTag(l.name, l.version);
			console.log(
				`  ${pad(l.name, wName)}  ${pad(l.version, 8)}  unlocks ${unlockStr(l.clearsAt, now)}${sec}`,
			);
		}
		console.log('');
	}

	if (failed.length) {
		console.log('COULD NOT CHECK (registry error):');
		for (const name of failed.sort()) console.log(`  ${name}`);
		console.log('');
	}
}

// Only sweep the registry when run as a CLI. The pure helpers above are
// imported by src/tests/scripts/check-outdated-quarantine.test.ts.
const runAsCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsCli) {
	main().catch((err) => {
		console.error('check-outdated-quarantine failed:', err.message);
		process.exit(2);
	});
}
