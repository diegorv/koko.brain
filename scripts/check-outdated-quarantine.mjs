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

function fmtDate(d) {
	// e.g. 2026-06-23 18:48 UTC
	return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

async function main() {
	const { ageMinutes, excludes } = readQuarantinePolicy();
	const now = Date.now();
	const cutoff = now - ageMinutes * 60 * 1000;

	const outdated = JSON.parse((await run('pnpm', ['outdated', '--format', 'json'])).trim() || '{}');
	const names = Object.keys(outdated);

	console.log(
		`Quarantine policy: minimumReleaseAge=${ageMinutes} min (${(ageMinutes / 1440).toFixed(1)} days)` +
			`${excludes.length ? `, ${excludes.length} exclude pattern(s)` : ''}`,
	);
	console.log(`Cutoff: versions published on/before ${fmtDate(new Date(cutoff))} are installable.\n`);

	if (names.length === 0) {
		console.log('Everything is up to date. Nothing to check.');
		return;
	}

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
				latest,
				isExcluded,
				deprecated: info.isDeprecated === true,
				type: info.dependencyType,
				held,
			};
		}),
	);

	// Render.
	const installableRows = rows.filter((r) => r.installable);
	const heldRows = rows.filter((r) => !r.installable && r.held && r.held.length);
	const errorRows = rows.filter((r) => r.error);

	const pad = (s, n) => String(s).padEnd(n);
	const wName = Math.max(7, ...rows.map((r) => r.name.length));
	const wCur = Math.max(7, ...rows.map((r) => String(r.current).length));

	if (installableRows.length) {
		console.log('Installable now (out of quarantine):');
		console.log(`  ${pad('Package', wName)}  ${pad('Current', wCur)}  -> Installable   Notes`);
		for (const r of installableRows.sort((a, b) => a.name.localeCompare(b.name))) {
			const notes = [];
			if (r.isExcluded) notes.push('exclude bypass');
			if (r.deprecated) notes.push('DEPRECATED');
			if (r.held.length) {
				notes.push(`held: ${r.held.map((h) => `${h.version} (${fmtDate(h.clearsAt)})`).join(', ')}`);
			}
			console.log(`  ${pad(r.name, wName)}  ${pad(r.current, wCur)}  -> ${pad(r.installable, 12)}  ${notes.join('; ')}`);
		}
		console.log('');
	}

	if (heldRows.length) {
		console.log('Held in quarantine (no installable upgrade yet):');
		for (const r of heldRows.sort((a, b) => a.name.localeCompare(b.name))) {
			const list = r.held.map((h) => `${h.version} (${fmtDate(h.clearsAt)})`).join(', ');
			console.log(`  ${pad(r.name, wName)}  ${pad(r.current, wCur)}  ${list}`);
		}
		console.log('');
	}

	if (errorRows.length) {
		console.log('Could not check (registry error):');
		for (const r of errorRows) console.log(`  ${r.name}: ${r.error}`);
		console.log('');
	}

	console.log(
		`Summary: ${installableRows.length} installable now, ${heldRows.length} held in quarantine, ` +
			`${errorRows.length} errored, of ${names.length} outdated.`,
	);
}

main().catch((err) => {
	console.error('check-outdated-quarantine failed:', err.message);
	process.exit(2);
});
