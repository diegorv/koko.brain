#!/usr/bin/env node
// @ts-nocheck - build-time CLI script, not part of the app's type-checked
// surface. The unit test imports it, which would otherwise pull it into the
// svelte-check program with no @types for its node/semver usage.
/**
 * check-outdated-cargo.mjs
 *
 * The Rust counterpart of check-outdated-quarantine.mjs. Reports, for
 * src-tauri/Cargo.lock, which crate updates are installable right now under the
 * repo's cooldown policy, which are still held by it and when they clear, which
 * direct dependencies have releases their Cargo.toml requirement does not
 * reach, and what `cargo audit` flags.
 *
 * Policy: a crate release must be at least `cooldown.default-days` old (the
 * `cargo` entry of .github/dependabot.yml, 7 days). Unlike npm there is no
 * resolver-side gate (pnpm's `minimumReleaseAge`): cargo resolves the newest
 * compatible release no matter its age, so the window is applied by hand with
 * `cargo update -p <crate> --precise <version>`. RUSTSEC fixes are the one
 * exception: they are applied even inside the window, so SECURITY rows say so.
 *
 * Where the candidates come from: `cargo update --dry-run`. That is exactly
 * what the resolver would move inside every requirement in the graph, direct
 * and transitive alike, so no requirement has to be re-derived here. For each
 * move `from -> to` the script fetches the crate's versions from crates.io and
 * picks the newest one in `(from, to]` that has cleared the window and is not
 * yanked. A move whose target is still too young can therefore still offer an
 * older, cleared step.
 *
 * Why not `cargo outdated`: it reports one row per dependency edge, mixes
 * requirement-compatible and resolvable versions (it listed syn 2 -> 3 as
 * "compat"), and knows nothing about release age.
 *
 * crates.io asks crawlers for at most one request per second, so lookups are
 * sequential and spaced; a full run takes a minute or two.
 *
 * Usage: node scripts/check-outdated-cargo.mjs
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
const crateDir = resolve(repoRoot, 'src-tauri');
const manifestPath = resolve(crateDir, 'Cargo.toml');

/** Gap between crates.io API requests, per the crates.io crawler policy (1 req/s). */
const REQUEST_GAP_MS = 1000;

/** crates.io rejects requests without a User-Agent that identifies the client. */
const USER_AGENT = 'kokobrain-check-outdated-cargo (https://github.com/diegorv/koko.brain)';

/** Run a command and return stdout + stderr, tolerating non-zero exit (cargo audit exits 1 on findings). */
async function run(cmd, args, cwd = repoRoot) {
	try {
		const { stdout, stderr } = await exec(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
		return { stdout, stderr };
	} catch (err) {
		if (err.stdout || err.stderr) return { stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
		throw err;
	}
}

/**
 * Cooldown in days for the `cargo` ecosystem in .github/dependabot.yml.
 *
 * That file is the only place the Rust window is written down, so reading it
 * keeps this report and Dependabot from drifting apart. Throws when the entry
 * or its `cooldown.default-days` is missing rather than silently assuming 0.
 *
 * @param {string} yamlText Raw dependabot.yml contents.
 * @returns {number}
 */
export function readCargoCooldownDays(yamlText) {
	const cfg = parseYaml(yamlText) ?? {};
	const entry = (cfg.updates ?? []).find((u) => u?.['package-ecosystem'] === 'cargo');
	const days = Number(entry?.cooldown?.['default-days']);
	if (!entry || !Number.isFinite(days) || days <= 0) {
		throw new Error('dependabot.yml has no cargo `cooldown.default-days`; refusing to grade release age.');
	}
	return days;
}

/**
 * Parse the moves printed by `cargo update --dry-run` (cargo writes them to stderr).
 *
 * @param {string} text Raw cargo output.
 * @returns {{
 *   updates: Array<{name: string, from: string, to: string}>,
 *   downgrades: Array<{name: string, from: string, to: string}>,
 *   added: Array<{name: string, version: string}>,
 *   removed: Array<{name: string, version: string}>,
 * }}
 */
export function parseDryRun(text) {
	const result = { updates: [], downgrades: [], added: [], removed: [] };
	for (const line of text.split('\n')) {
		let m = line.match(/^\s*(Updating|Downgrading)\s+(\S+)\s+v(\S+)\s+->\s+v(\S+)/);
		if (m) {
			(m[1] === 'Updating' ? result.updates : result.downgrades).push({ name: m[2], from: m[3], to: m[4] });
			continue;
		}
		m = line.match(/^\s*(Adding|Removing)\s+(\S+)\s+v(\S+)/);
		if (m) (m[1] === 'Adding' ? result.added : result.removed).push({ name: m[2], version: m[3] });
	}
	return result;
}

/**
 * Translate a Cargo version requirement into an npm `semver` range.
 *
 * `cargo metadata` already normalises a bare `2` to `^2`, and the operator
 * semantics (`^`, `~`, `=`, `>=`, `<`, `*`) match npm's, including the 0.x
 * caret rules. The one syntax difference is the comma Cargo uses to AND
 * comparators, which npm writes as a space.
 *
 * @param {string | null | undefined} req Cargo requirement, e.g. `^0.49.2` or `>=1.0, <2.0`.
 * @returns {string | null} An npm range, or null when it cannot be parsed.
 */
export function cargoReqToRange(req) {
	if (typeof req !== 'string' || !req.trim()) return null;
	const range = req
		.split(',')
		.map((part) => part.trim())
		.join(' ');
	return semver.validRange(range) ? range : null;
}

/**
 * Turn a crates.io `/api/v1/crates/<name>` payload into version -> metadata.
 *
 * @param {unknown} raw Parsed API response.
 * @returns {Map<string, {publishedAt: Date, yanked: boolean}> | null} Null for an error payload.
 */
export function crateVersionsFromApi(raw) {
	if (!raw || typeof raw !== 'object' || !Array.isArray(raw.versions)) return null;
	const versions = new Map();
	for (const v of raw.versions) {
		if (!semver.valid(v?.num) || !v.created_at) continue;
		versions.set(v.num, { publishedAt: new Date(v.created_at), yanked: Boolean(v.yanked) });
	}
	return versions;
}

/** Whether a prerelease version may be offered, given the endpoints of a move. */
function prereleaseAllowed(version, ...anchors) {
	return !semver.prerelease(version) || anchors.some((a) => a && semver.prerelease(a));
}

/**
 * Grade a lockfile move `from -> to` (from `cargo update --dry-run`) against the
 * cooldown.
 *
 * Candidates are the non-yanked versions in `(from, to]`; the dry-run target is
 * the upper bound because it is what every requirement in the graph allows.
 * `installable` is the newest candidate published at or before `cutoff`;
 * `locked` lists the candidates above it that are still inside the window.
 * Prereleases are only considered when `from` or `to` is one (ort 2.0.0-rc.*).
 *
 * @param {Map<string, {publishedAt: Date, yanked: boolean}>} versions Crate versions.
 * @param {string} from Version in Cargo.lock.
 * @param {string} to Version the dry-run would move to.
 * @param {number} cutoff Epoch ms; published at or before this has cleared the window.
 * @returns {{installable: string | null, installableAt: Date | null, locked: Array<{version: string, publishedAt: Date}>, yanked: string[]}}
 */
export function classifyLockMove(versions, from, to, cutoff) {
	const inWindow = [...versions].filter(
		([v]) => semver.gt(v, from) && semver.lte(v, to) && prereleaseAllowed(v, from, to),
	);
	const yanked = inWindow.filter(([, m]) => m.yanked).map(([v]) => v);
	const candidates = inWindow.filter(([, m]) => !m.yanked);

	let installable = null;
	for (const [v, m] of candidates) {
		if (m.publishedAt.getTime() > cutoff) continue;
		if (!installable || semver.gt(v, installable)) installable = v;
	}
	const locked = candidates
		.filter(([v, m]) => m.publishedAt.getTime() > cutoff && (!installable || semver.gt(v, installable)))
		.sort(([a], [b]) => semver.compare(a, b))
		.map(([version, m]) => ({ version, publishedAt: m.publishedAt }));

	return {
		installable,
		installableAt: installable ? versions.get(installable).publishedAt : null,
		locked,
		yanked: yanked.sort(semver.compare),
	};
}

/**
 * Whether a lockfile move stays semver-compatible with the locked version.
 *
 * An incompatible move (winreg 0.55 -> 0.56, a 0.x minor) cannot come from the
 * crate's own dependents as they stand: some dependent must change its
 * requirement first (embed-resource 3.0.12 is what asks for winreg ^0.56).
 * `cargo update -p <crate> --precise` on such a row fails until that dependent
 * moves, so the report flags it.
 *
 * @param {string} from Version in Cargo.lock.
 * @param {string} to Target version.
 * @returns {boolean}
 */
export function isCompatibleMove(from, to) {
	return semver.satisfies(to, `^${from}`, { includePrerelease: true });
}

/**
 * Newest release of a direct dependency that its Cargo.toml requirement does
 * not reach, or null. Only releases past the cooldown and not yanked count, so
 * the row is something a requirement edit could actually adopt today.
 *
 * @param {Map<string, {publishedAt: Date, yanked: boolean}>} versions Crate versions.
 * @param {string} current Version in Cargo.lock.
 * @param {string | null} range npm range of the requirement (see cargoReqToRange).
 * @param {number} cutoff Epoch ms.
 * @returns {{version: string, publishedAt: Date} | null}
 */
export function newestOutOfRange(versions, current, range, cutoff) {
	if (!range) return null;
	let best = null;
	for (const [v, m] of versions) {
		if (m.yanked || m.publishedAt.getTime() > cutoff) continue;
		if (!semver.gt(v, current) || !prereleaseAllowed(v, current)) continue;
		if (semver.satisfies(v, range, { includePrerelease: true })) continue;
		if (!best || semver.gt(v, best.version)) best = { version: v, publishedAt: m.publishedAt };
	}
	return best;
}

/**
 * Every crates.io package in a Cargo.lock, as name -> versions.
 *
 * @param {string} lockText Raw Cargo.lock contents.
 * @returns {Map<string, string[]>}
 */
export function parseCargoLock(lockText) {
	const crates = new Map();
	for (const block of lockText.split('[[package]]').slice(1)) {
		const name = block.match(/^name = "([^"]+)"/m)?.[1];
		const version = block.match(/^version = "([^"]+)"/m)?.[1];
		const source = block.match(/^source = "([^"]+)"/m)?.[1] ?? '';
		if (!name || !version || !source.startsWith('registry+')) continue;
		crates.set(name, [...(crates.get(name) ?? []), version]);
	}
	return crates;
}

/**
 * Direct crates.io dependencies of the root package from `cargo metadata
 * --no-deps`, one entry per crate (a crate listed under several kinds or
 * targets keeps its first requirement and merges the kinds).
 *
 * @param {unknown} metadata Parsed `cargo metadata` output.
 * @returns {Map<string, {req: string, kinds: string[]}>}
 */
export function parseDirectDeps(metadata) {
	const root = metadata?.packages?.[0];
	const deps = new Map();
	for (const d of root?.dependencies ?? []) {
		if (!String(d.source ?? '').startsWith('registry+')) continue;
		const kind = d.kind ?? 'normal';
		const existing = deps.get(d.name);
		if (existing) {
			if (!existing.kinds.includes(kind)) existing.kinds.push(kind);
		} else {
			deps.set(d.name, { req: d.req, kinds: [kind] });
		}
	}
	return deps;
}

/**
 * Version of a direct dependency in Cargo.lock: the newest locked version that
 * satisfies its requirement (a crate can be locked at several majors).
 *
 * @param {string[] | undefined} locked Versions of the crate in Cargo.lock.
 * @param {string | null} range npm range of the requirement.
 * @returns {string | null}
 */
export function lockedVersionFor(locked, range) {
	if (!locked?.length) return null;
	const matching = range ? locked.filter((v) => semver.satisfies(v, range, { includePrerelease: true })) : locked;
	return matching.sort(semver.rcompare)[0] ?? null;
}

/**
 * Flatten `cargo audit --json` into one row per finding.
 *
 * `vulnerabilities.list` holds the RUSTSEC vulnerabilities; `warnings` groups
 * the informational kinds (unmaintained, unsound, yanked). Advisories ignored
 * in src-tauri/.cargo/audit.toml are already dropped from the vulnerability
 * list by cargo-audit.
 *
 * @param {unknown} raw Parsed `cargo audit --json` output.
 * @returns {Array<{kind: string, id: string | null, name: string, version: string, title: string, patched: string[]}>}
 */
export function parseCargoAudit(raw) {
	const rows = [];
	const push = (kind, entry) => {
		rows.push({
			kind,
			id: entry?.advisory?.id ?? null,
			name: entry?.package?.name,
			version: entry?.package?.version,
			title: entry?.advisory?.title ?? kind,
			patched: entry?.versions?.patched ?? [],
		});
	};
	for (const v of raw?.vulnerabilities?.list ?? []) push('vulnerability', v);
	for (const [kind, list] of Object.entries(raw?.warnings ?? {})) {
		for (const w of list ?? []) push(w?.kind ?? kind, w);
	}
	return rows;
}

/**
 * Whether `version` is patched for a RUSTSEC row. `patched` holds Cargo
 * requirements (`>=0.11.18`, `^1.2.3`); any match counts.
 *
 * @param {string} version Candidate version.
 * @param {string[]} patched Patched requirements from the advisory.
 * @returns {boolean}
 */
export function isPatched(version, patched) {
	return patched.some((req) => {
		const range = cargoReqToRange(req);
		return range ? semver.satisfies(version, range, { includePrerelease: true }) : false;
	});
}

/** Fetch a crate's versions from crates.io; null on a network or API error. */
async function fetchCrateVersions(name) {
	try {
		const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
		});
		if (!res.ok) return null;
		return crateVersionsFromApi(await res.json());
	} catch {
		return null;
	}
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
	const cooldownDays = readCargoCooldownDays(readFileSync(resolve(repoRoot, '.github/dependabot.yml'), 'utf8'));
	const now = Date.now();
	const windowMs = cooldownDays * 86_400_000;
	const cutoff = now - windowMs;

	const dry = parseDryRun(
		(await run('cargo', ['update', '--dry-run', '--manifest-path', manifestPath])).stderr,
	);
	const directDeps = parseDirectDeps(
		JSON.parse(
			(await run('cargo', ['metadata', '--format-version', '1', '--no-deps', '--manifest-path', manifestPath]))
				.stdout,
		),
	);
	const lock = parseCargoLock(readFileSync(resolve(crateDir, 'Cargo.lock'), 'utf8'));

	let audit = null;
	try {
		// Run from src-tauri so cargo-audit picks up src-tauri/.cargo/audit.toml.
		audit = parseCargoAudit(JSON.parse((await run('cargo', ['audit', '--json'], crateDir)).stdout));
	} catch {
		audit = null; // cargo-audit missing or offline — reported, not fatal.
	}
	const vulns = (audit ?? []).filter((a) => a.kind === 'vulnerability');

	const names = new Set([...dry.updates.map((u) => u.name), ...directDeps.keys(), ...vulns.map((v) => v.name)]);
	console.log(`Cooldown: a crate release must be ${cooldownDays}+ days old (dependabot.yml, cargo).`);
	console.log(`Checking ${names.size} crates on crates.io, one request per second.\n`);

	const versionsByName = new Map();
	const failed = [];
	for (const name of names) {
		const versions = await fetchCrateVersions(name);
		if (versions) versionsByName.set(name, versions);
		else failed.push(name);
		await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
	}

	/** RUSTSEC ids a version fixes for this crate. */
	const fixes = (name, version) =>
		vulns.filter((v) => v.name === name && isPatched(version, v.patched)).map((v) => v.id);

	// ---- Lockfile moves inside the requirements. ----
	const updateNow = [];
	const locked = [];
	const yankedSkipped = [];
	for (const { name, from, to } of dry.updates) {
		const versions = versionsByName.get(name);
		if (!versions) continue;
		const graded = classifyLockMove(versions, from, to, cutoff);
		if (graded.installable) {
			updateNow.push({
				name,
				from,
				to: graded.installable,
				clearedAt: new Date(graded.installableAt.getTime() + windowMs),
				direct: directDeps.has(name),
				compatible: isCompatibleMove(from, graded.installable),
				replacesYanked: (audit ?? []).some((a) => a.kind === 'yanked' && a.name === name && a.version === from),
			});
		}
		for (const l of graded.locked) {
			locked.push({ name, version: l.version, clearsAt: new Date(l.publishedAt.getTime() + windowMs) });
		}
		for (const v of graded.yanked) yankedSkipped.push(`${name}@${v}`);
	}
	updateNow.sort((a, b) => a.name.localeCompare(b.name));
	locked.sort((a, b) => a.clearsAt - b.clearsAt);

	// ---- Direct dependencies whose requirement caps them. ----
	const outOfRange = [];
	for (const [name, { req, kinds }] of directDeps) {
		const versions = versionsByName.get(name);
		const range = cargoReqToRange(req);
		const current = lockedVersionFor(lock.get(name), range);
		if (!versions || !current) continue;
		const newer = newestOutOfRange(versions, current, range, cutoff);
		if (newer) outOfRange.push({ name, current, version: newer.version, req, kinds });
	}
	outOfRange.sort((a, b) => a.name.localeCompare(b.name));

	// ---- Render. ----
	const allNames = [
		...updateNow.map((r) => r.name),
		...locked.map((r) => r.name),
		...outOfRange.map((r) => r.name),
		...(audit ?? []).map((a) => a.name),
	];
	const wName = Math.max(7, ...allNames.map((n) => n.length));
	const pad = (s, n) => String(s).padEnd(n);

	if (audit === null) {
		console.log('SECURITY: could not run `cargo audit --json` — advisories not checked.\n');
	} else if (audit.length === 0) {
		console.log('SECURITY: no advisories or warnings.\n');
	} else {
		console.log(`SECURITY (${audit.length}, cargo audit):`);
		for (const a of audit) {
			const id = a.id ? `  ${a.id}` : '';
			console.log(`  ${pad(`[${a.kind}]`, 16)} ${pad(a.name, wName)}  ${pad(a.version, 10)}${id}`);
			console.log(`  ${' '.repeat(16)} ${pad('', wName)}  ${a.title}`);
		}
		if (vulns.length) {
			console.log('\n  RUSTSEC vulnerability fixes are applied even inside the cooldown window.');
		}
		console.log('');
	}

	if (updateNow.length) {
		console.log(`UPDATE NOW (${updateNow.length}) — \`cargo update -p <crate> --precise <version>\`:`);
		for (const r of updateNow) {
			const tags = [];
			if (r.direct) tags.push('direct');
			if (!r.compatible) tags.push('needs dependent bump');
			if (r.replacesYanked) tags.push('replaces yanked');
			const tag = tags.length ? `  [${tags.join(', ')}]` : '';
			const ids = fixes(r.name, r.to);
			const sec = ids.length ? `  [SECURITY ${ids.join(', ')}]` : '';
			console.log(
				`  ${pad(r.name, wName)}  ${pad(r.from, 10)} ->  ${pad(r.to, 10)}  (since ${shortDate(r.clearedAt)})${tag}${sec}`,
			);
		}
		console.log('\n  `cargo update -p` may also re-point unrelated edges (windows-sys and');
		console.log('  friends); diff Cargo.lock and keep only the intended crates.');
		if (updateNow.some((r) => !r.compatible)) {
			console.log('  [needs dependent bump]: semver-incompatible move; it only resolves once');
			console.log('  the dependent that asks for the new line is updated too.');
		}
	} else {
		const reason = locked.length ? ' — every newer release is still in the cooldown window.' : '.';
		console.log(`UPDATE NOW: nothing${reason}`);
	}
	console.log('');

	if (locked.length) {
		console.log(`STILL LOCKED (${locked.length}, soonest first):`);
		for (const l of locked) {
			const ids = fixes(l.name, l.version);
			const sec = ids.length ? `  [SECURITY ${ids.join(', ')}: apply now]` : '';
			console.log(`  ${pad(l.name, wName)}  ${pad(l.version, 10)}  unlocks ${unlockStr(l.clearsAt, now)}${sec}`);
		}
		console.log('');
	}

	if (outOfRange.length) {
		console.log(`OUT OF RANGE (${outOfRange.length}) — released, but the Cargo.toml requirement does not reach them:`);
		for (const r of outOfRange) {
			const kind = r.kinds.filter((k) => k !== 'normal');
			const tag = kind.length ? `  [${kind.join(', ')}]` : '';
			console.log(`  ${pad(r.name, wName)}  ${pad(r.current, 10)} ->  ${pad(r.version, 10)}  (declared ${r.req})${tag}`);
		}
		console.log('\n  Each needs a deliberate Cargo.toml edit; Tauri crates move in lockstep');
		console.log('  with their @tauri-apps/* npm packages.');
		console.log('');
	}

	if (dry.added.length || dry.removed.length || dry.downgrades.length) {
		console.log('SIDE EFFECTS of a full `cargo update`:');
		for (const a of dry.added) console.log(`  + ${a.name} ${a.version}`);
		for (const r of dry.removed) console.log(`  - ${r.name} ${r.version}`);
		for (const d of dry.downgrades) console.log(`  v ${d.name} ${d.from} -> ${d.to}  (downgrade)`);
		console.log('');
	}

	if (yankedSkipped.length) {
		console.log(`YANKED, skipped: ${yankedSkipped.join(', ')}\n`);
	}

	if (failed.length) {
		console.log('COULD NOT CHECK (crates.io error):');
		for (const name of failed.sort()) console.log(`  ${name}`);
		console.log('');
	}
}

// Only sweep crates.io when run as a CLI. The pure helpers above are imported
// by src/tests/scripts/check-outdated-cargo.test.ts.
const runAsCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsCli) {
	main().catch((err) => {
		console.error('check-outdated-cargo failed:', err.message);
		process.exit(2);
	});
}
