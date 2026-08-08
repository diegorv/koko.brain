#!/usr/bin/env node
// @ts-nocheck - build-time CLI script, not part of the app's type-checked
// surface. The unit test imports it, which would otherwise pull it into the
// svelte-check program with no @types for its node/semver usage.
// Quarantine-aware npm audit.
//
// Why this exists:
// `pnpm audit --audit-level=moderate` returns a non-zero exit code as soon
// as any moderate-or-higher advisory exists. The repo also runs a 7-day
// supply-chain quarantine (`minimumReleaseAge` in pnpm-workspace.yaml) that
// refuses to resolve any package version published less than 7 days ago.
// When upstream ships a security patch, there is a window (up to 7 days)
// where the advisory is published, the patch is published, but the
// quarantine still blocks the resolver. During that window the two
// policies conflict and the audit job goes red even though the project is
// behaving exactly as designed.
//
// This script splits advisories into two buckets:
//
//   actionable  -> at least one patched version is older than the
//                  quarantine window. We *could* be on the patched
//                  version. Exit non-zero so CI fails.
//
//   quarantined -> patched versions exist but every one of them is
//                  still inside the quarantine window. Quarantine is
//                  doing its job. Emit a `::warning::` annotation and
//                  exit 0.
//
//   major-bump   -> the only installable patches are outside the semver
//                   range the installed version can be lifted to (i.e. a
//                   different major). A lockfile refresh cannot reach
//                   them; the dependent package has to update first, or a
//                   hand-written `overrides` entry has to force a major
//                   bump that will likely break the dependent. Warn and
//                   exit 0 — this is not something CI can fix.
//
// Patch candidates are always intersected with `^installedVersion` before
// being graded. Without that intersection an advisory like nanoid's
// (`patched: >=3.3.17`) matches nanoid@4.0.0 from 2022, and the script
// reports "install 4.0.0 or newer" for a package whose only dependent
// (postcss) declares `nanoid: ^3.3.16` and would break on the ESM-only v4.
//
// The script also fails on the usual hard errors: malformed audit output,
// unreachable registry, missing publish times, etc. Those are surfaced
// loudly because they would otherwise silently hide a real vulnerability.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

const WORKSPACE_FILE = 'pnpm-workspace.yaml';
const DEFAULT_MIN_AGE_MINUTES = 10080; // 7 days, must match pre-commit-dep-age.sh

function readMinReleaseAgeMinutes() {
	const yaml = readFileSync(WORKSPACE_FILE, 'utf8');
	const match = yaml.match(/^\s*minimumReleaseAge:\s*(\d+)/m);
	if (!match) {
		console.error(
			`::error::Could not find 'minimumReleaseAge' in ${WORKSPACE_FILE}. ` +
				'Supply-chain quarantine policy is missing. Refusing to grade advisories.'
		);
		process.exit(2);
	}
	return parseInt(match[1], 10);
}

function runJson(cmd, args) {
	const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	if (res.error) throw res.error;
	// `pnpm audit` exits non-zero when advisories exist; treat the JSON as
	// authoritative regardless of exit code.
	const stdout = (res.stdout || '').trim();
	if (!stdout) {
		throw new Error(
			`Command produced no stdout: ${cmd} ${args.join(' ')}\nstderr: ${res.stderr || '(empty)'}`
		);
	}
	try {
		return JSON.parse(stdout);
	} catch (err) {
		throw new Error(
			`Failed to parse JSON from ${cmd} ${args.join(' ')}: ${err.message}\n` +
				`stdout (first 500 chars): ${stdout.slice(0, 500)}`
		);
	}
}

function fetchPublishTimes(pkg) {
	const times = runJson('pnpm', ['view', pkg, 'time', '--json']);
	// `time` includes a `created` and `modified` entry alongside versions.
	// Strip them so the caller only sees actual version keys.
	const out = {};
	for (const [k, v] of Object.entries(times)) {
		if (k === 'created' || k === 'modified') continue;
		out[k] = v;
	}
	return out;
}

/**
 * Versions currently installed for the advisory's package, taken from the
 * audit `findings`. An advisory can list several (the same package resolved
 * at two majors in different branches of the tree).
 */
export function installedVersionsOf(adv) {
	const findings = Array.isArray(adv?.findings) ? adv.findings : [];
	const versions = findings
		.map((f) => f?.version)
		.filter((v) => typeof v === 'string' && semver.valid(v, { loose: false }));
	return [...new Set(versions)];
}

/**
 * Keep only the patched versions a lockfile refresh could actually reach:
 * those inside `^installed` for at least one installed version. A caret
 * range is the widest bump a dependent's own declared range is likely to
 * permit. With no installed version known (malformed findings), every
 * patched version stays a candidate — better to over-report than to hide.
 */
export function compatiblePatches(patchedVersions, installedVersions) {
	if (installedVersions.length === 0) return [...patchedVersions];
	return patchedVersions.filter((v) =>
		installedVersions.some((installed) => semver.satisfies(v, `^${installed}`, { includePrerelease: false }))
	);
}

/**
 * Grade one advisory. Pure: `times` is the registry's `{version: isoDate}`
 * map (already stripped of `created`/`modified`), injected by the caller so
 * this can be unit-tested without hitting the network.
 */
export function classifyAdvisory(adv, times, minAgeMs, now) {
	const pkg = adv.module_name;
	const range = adv.patched_versions;
	if (!pkg || !range) {
		return { kind: 'malformed', adv };
	}
	const allVersions = Object.keys(times)
		.filter((v) => semver.valid(v, { loose: false, includePrerelease: false }));
	const patchedVersions = allVersions.filter((v) => {
		try {
			return semver.satisfies(v, range, { includePrerelease: false });
		} catch {
			return false;
		}
	});
	if (patchedVersions.length === 0) {
		return { kind: 'no-patch', pkg, range, adv };
	}

	const isInstallable = (v) => {
		const t = Date.parse(times[v]);
		return Number.isFinite(t) && now - t >= minAgeMs;
	};

	const installedVersions = installedVersionsOf(adv);
	const candidates = compatiblePatches(patchedVersions, installedVersions);
	const youngestPatch = [...patchedVersions].sort(semver.rcompare)[0];

	if (candidates.length === 0) {
		// Every patch sits outside `^installed`. Only reachable through a
		// major bump of the transitive dep, which CI cannot do on its own.
		const oldestInstallable = patchedVersions.filter(isInstallable).sort(semver.compare)[0];
		if (!oldestInstallable) {
			return { kind: 'quarantined', pkg, range, youngestPatch, adv };
		}
		return { kind: 'major-bump', pkg, range, installedVersions, oldestInstallable, youngestPatch, adv };
	}

	const installablePatches = candidates.filter(isInstallable);
	const youngestCompatiblePatch = [...candidates].sort(semver.rcompare)[0];
	if (installablePatches.length === 0) {
		return { kind: 'quarantined', pkg, range, youngestPatch: youngestCompatiblePatch, adv };
	}
	const oldestInstallable = installablePatches.sort(semver.compare)[0];
	return {
		kind: 'actionable',
		pkg,
		range,
		oldestInstallable,
		youngestPatch: youngestCompatiblePatch,
		adv,
	};
}

function main() {
	const minAgeMin = readMinReleaseAgeMinutes() ?? DEFAULT_MIN_AGE_MINUTES;
	const minAgeMs = minAgeMin * 60 * 1000;
	const now = Date.now();
	console.log(
		`Quarantine policy: ${minAgeMin} minutes (${(minAgeMin / 1440).toFixed(1)} days). ` +
			'Patches younger than this are treated as quarantined, not actionable.'
	);

	const audit = runJson('pnpm', ['audit', '--json', '--audit-level=moderate']);
	const advisories = Object.values(audit.advisories ?? {});
	if (advisories.length === 0) {
		console.log('No advisories at audit level moderate. OK.');
		return 0;
	}

	const actionable = [];
	const quarantined = [];
	const majorBump = [];
	const noPatch = [];
	const malformed = [];

	for (const adv of advisories) {
		const times = adv.module_name ? fetchPublishTimes(adv.module_name) : {};
		const result = classifyAdvisory(adv, times, minAgeMs, now);
		if (result.kind === 'actionable') actionable.push(result);
		else if (result.kind === 'quarantined') quarantined.push(result);
		else if (result.kind === 'major-bump') majorBump.push(result);
		else if (result.kind === 'no-patch') noPatch.push(result);
		else malformed.push(result);
	}

	if (quarantined.length > 0) {
		console.log('\n--- Quarantined (patch exists but is inside the quarantine window) ---');
		for (const r of quarantined) {
			const line =
				`${r.pkg} (${r.adv.severity}): ${r.adv.title}\n` +
				`  patched range: ${r.range} | newest patch: ${r.youngestPatch} (within ${(minAgeMin / 1440).toFixed(1)}d quarantine)\n` +
				`  advisory: ${r.adv.url}`;
			console.log(`::warning::${r.pkg}@${r.youngestPatch} patch quarantined by minimumReleaseAge policy`);
			console.log(line);
		}
	}

	if (majorBump.length > 0) {
		console.log('\n--- Patch exists only outside the installed major (dependent must update) ---');
		for (const r of majorBump) {
			const installed = r.installedVersions.join(', ') || 'unknown';
			console.log(
				`::warning::${r.pkg}: patch requires a major bump (installed ${installed}, patched range ${r.range})`
			);
			console.log(
				`${r.pkg} (${r.adv.severity}): ${r.adv.title}\n` +
					`  installed: ${installed} | oldest installable patch: ${r.oldestInstallable} (different major)\n` +
					`  a lockfile refresh cannot reach it; the dependent package has to widen its range first\n` +
					`  advisory: ${r.adv.url}`
			);
		}
	}

	if (noPatch.length > 0) {
		console.log('\n--- No patched version published yet ---');
		for (const r of noPatch) {
			console.log(`::warning::${r.pkg} has no patched version satisfying ${r.range} yet`);
			console.log(`${r.pkg} (${r.adv.severity}): ${r.adv.title} | ${r.adv.url}`);
		}
	}

	if (malformed.length > 0) {
		console.log('\n--- Malformed advisory entries (no module_name or patched_versions) ---');
		for (const r of malformed) {
			console.log(`::error::Malformed advisory: ${JSON.stringify(r.adv).slice(0, 400)}`);
		}
	}

	if (actionable.length > 0) {
		console.log('\n--- Actionable advisories (installable patch is available, update required) ---');
		for (const r of actionable) {
			const line =
				`${r.pkg} (${r.adv.severity}): ${r.adv.title}\n` +
				`  install: ${r.oldestInstallable} or newer (patched range: ${r.range})\n` +
				`  advisory: ${r.adv.url}`;
			console.log(`::error::${r.pkg}: install ${r.oldestInstallable} or newer to resolve ${r.adv.url}`);
			console.log(line);
		}
		console.log(
			`\nFailing the audit job: ${actionable.length} actionable advisor${actionable.length === 1 ? 'y' : 'ies'} ` +
				`with installable patches.`
		);
		return 1;
	}

	if (malformed.length > 0) {
		// Malformed advisories shouldn't silently pass. Treat as a build error.
		console.log(
			`\nFailing the audit job: ${malformed.length} malformed advisory entr${malformed.length === 1 ? 'y' : 'ies'}.`
		);
		return 1;
	}

	console.log(
		`\nAll ${advisories.length} advisor${advisories.length === 1 ? 'y is' : 'ies are'} ` +
			'either still inside the supply-chain quarantine window, blocked behind a major bump of the ' +
			'dependent, or have no patched version published yet. Nothing CI can install; CI will pass.'
	);
	return 0;
}

// Only hit the registry when run as a CLI. The pure helpers above are
// imported by src/tests/scripts/quarantine-aware-audit.test.ts.
const runAsCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsCli) {
	try {
		process.exit(main());
	} catch (err) {
		console.error(`::error::Quarantine-aware audit script crashed: ${err.message}`);
		console.error(err.stack);
		process.exit(2);
	}
}
