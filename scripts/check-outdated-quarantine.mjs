#!/usr/bin/env node
/**
 * check-outdated-quarantine.mjs
 *
 * Cross-references `pnpm outdated` with the supply-chain quarantine policy
 * in pnpm-workspace.yaml (`minimumReleaseAge` + `minimumReleaseAgeExclude`)
 * and reports, per outdated dependency, the newest version that is actually
 * allowed to install right now (i.e. has aged past the quarantine window),
 * plus any newer version still held in quarantine and when it clears.
 *
 * Why: `pnpm outdated`'s "latest" column ignores how long a version has been
 * published, so it can point at a version that `pnpm install`/`pnpm update`
 * will refuse with ERR_PNPM_NO_MATURE_MATCHING_VERSION. This script tells you
 * what you can bump to today without tripping the quarantine.
 *
 * Usage: node scripts/check-outdated-quarantine.mjs
 *        (or: pnpm dlx zx-free — it only needs node + pnpm on PATH)
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

/** Run a command and return stdout, tolerating non-zero exit (pnpm outdated exits 1 when updates exist). */
async function run(cmd, args) {
	try {
		const { stdout } = await exec(cmd, args, { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 });
		return stdout;
	} catch (err) {
		// pnpm outdated returns a non-zero code with valid stdout when deps are outdated.
		if (err.stdout) return err.stdout;
		throw err;
	}
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

/** Pick the highest stable (non-prerelease) version from [version, isoTime] pairs. */
function highest(pairs) {
	let best = null;
	for (const [v] of pairs) {
		if (best === null || semver.gt(v, best)) best = v;
	}
	return best;
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

async function main() {
	const { ageMinutes, excludes } = readQuarantinePolicy();
	const now = Date.now();
	const cutoff = now - ageMinutes * 60 * 1000;

	const outdated = JSON.parse((await run('pnpm', ['outdated', '--format', 'json'])).trim() || '{}');
	const names = Object.keys(outdated);

	const days = Math.round(ageMinutes / 1440);
	console.log(`Quarantine: a release must be ${days}+ days old before pnpm will install it.`);

	if (names.length === 0) {
		console.log('\nEverything is up to date.');
		return;
	}
	console.log(`Checked ${names.length} outdated ${names.length === 1 ? 'dependency' : 'dependencies'}.\n`);

	// Fetch publish times for every outdated package in parallel.
	const rows = await Promise.all(
		names.map(async (name) => {
			const info = outdated[name];
			const current = info.current;
			const isExcluded = excludes.some((re) => re.test(name));

			let times;
			try {
				times = JSON.parse(await run('pnpm', ['view', name, 'time', '--json']));
			} catch {
				return { name, current, error: 'failed to fetch registry data' };
			}

			// Stable versions strictly newer than current, with their publish time.
			const newer = Object.entries(times)
				.filter(([v]) => semver.valid(v) && !semver.prerelease(v) && semver.gt(v, current))
				.map(([v, t]) => [v, t]);

			if (newer.length === 0) return { name, current, current_is_latest: true };

			const latest = highest(newer);
			// Versions that have cleared quarantine (or all of them, if excluded).
			const cleared = isExcluded ? newer : newer.filter(([, t]) => new Date(t).getTime() <= cutoff);
			const installable = cleared.length ? highest(cleared) : null;
			// When the installable version itself left quarantine (publish + window).
			const installableTime = installable ? cleared.find(([v]) => v === installable)[1] : null;
			const installableClearedAt = installableTime
				? new Date(new Date(installableTime).getTime() + ageMinutes * 60 * 1000)
				: null;

			// Every version newer than what we can install today that is still
			// inside the quarantine window, each with the moment it clears. There
			// can be more than one (e.g. 6.43.3 and 6.43.4 both held above 6.43.2).
			const held = newer
				.filter(([v, t]) => (!installable || semver.gt(v, installable)) && new Date(t).getTime() > cutoff)
				.sort(([a], [b]) => semver.compare(a, b))
				.map(([v, t]) => ({ version: v, clearsAt: new Date(new Date(t).getTime() + ageMinutes * 60 * 1000) }));

			return {
				name,
				current,
				installable,
				installableClearedAt,
				latest,
				isExcluded,
				deprecated: info.isDeprecated === true,
				type: info.dependencyType,
				held,
			};
		}),
	);

	// Render. Two plain sections: what you can bump today, and what is still
	// waiting out the quarantine window (soonest-to-unlock first).
	const upgradable = rows.filter((r) => r.installable).sort((a, b) => a.name.localeCompare(b.name));
	const errorRows = rows.filter((r) => r.error);
	const locked = rows
		.flatMap((r) => (r.held || []).map((h) => ({ name: r.name, ...h })))
		.sort((a, b) => a.clearsAt - b.clearsAt);

	const wName = Math.max(7, ...rows.map((r) => r.name.length));
	const pad = (s, n) => String(s).padEnd(n);

	if (upgradable.length) {
		console.log(`UPDATE NOW (${upgradable.length}):`);
		for (const r of upgradable) {
			const tags = [];
			if (r.isExcluded) tags.push('day-0 ok');
			if (r.deprecated) tags.push('DEPRECATED');
			const tag = tags.length ? `  [${tags.join(', ')}]` : '';
			// Show when the installable version left quarantine (not meaningful
			// for exclude-bypassed packages, which never waited).
			const since = r.isExcluded ? '' : `  (since ${shortDate(r.installableClearedAt)})`;
			console.log(`  ${pad(r.name, wName)}  ${pad(r.current, 8)} ->  ${pad(r.installable, 8)}${since}${tag}`.trimEnd());
		}
	} else {
		console.log('UPDATE NOW: nothing — every newer release is still in quarantine.');
	}
	console.log('');

	if (locked.length) {
		console.log(`STILL LOCKED (${locked.length}, soonest first):`);
		for (const l of locked) {
			console.log(`  ${pad(l.name, wName)}  ${pad(l.version, 8)}  unlocks ${unlockStr(l.clearsAt, now)}`);
		}
		console.log('');
	}

	if (errorRows.length) {
		console.log('COULD NOT CHECK (registry error):');
		for (const r of errorRows) console.log(`  ${r.name}: ${r.error}`);
		console.log('');
	}
}

main().catch((err) => {
	console.error('check-outdated-quarantine failed:', err.message);
	process.exit(2);
});
