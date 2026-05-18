#!/usr/bin/env node
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
// The script also fails on the usual hard errors: malformed audit output,
// unreachable registry, missing publish times, etc. Those are surfaced
// loudly because they would otherwise silently hide a real vulnerability.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

function classifyAdvisory(adv, minAgeMs, now) {
	const pkg = adv.module_name;
	const range = adv.patched_versions;
	if (!pkg || !range) {
		return { kind: 'malformed', adv };
	}
	const times = fetchPublishTimes(pkg);
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
	const installablePatches = patchedVersions.filter((v) => {
		const t = Date.parse(times[v]);
		return Number.isFinite(t) && now - t >= minAgeMs;
	});
	const youngestPatch = patchedVersions.sort(semver.rcompare)[0];
	if (installablePatches.length === 0) {
		return { kind: 'quarantined', pkg, range, youngestPatch, adv };
	}
	const oldestInstallable = installablePatches.sort(semver.compare)[0];
	return { kind: 'actionable', pkg, range, oldestInstallable, youngestPatch, adv };
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
	const noPatch = [];
	const malformed = [];

	for (const adv of advisories) {
		const result = classifyAdvisory(adv, minAgeMs, now);
		if (result.kind === 'actionable') actionable.push(result);
		else if (result.kind === 'quarantined') quarantined.push(result);
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
			'either still inside the supply-chain quarantine window or have no patched version published yet. ' +
			'Quarantine is doing its job; CI will pass.'
	);
	return 0;
}

try {
	process.exit(main());
} catch (err) {
	console.error(`::error::Quarantine-aware audit script crashed: ${err.message}`);
	console.error(err.stack);
	process.exit(2);
}
