import { describe, expect, it } from 'vitest';

import {
	auditAdvisoryIds,
	cargoReqToRange,
	classifyLockMove,
	crateReposFromApi,
	crateVersionsFromApi,
	ghsaPatchedRange,
	ghsaVulnerableRange,
	githubRepoFromUrl,
	isAffected,
	isCompatibleMove,
	isPatched,
	lockedVersionFor,
	newestOutOfRange,
	matchRepoAdvisories,
	parseCargoAudit,
	parseCargoLock,
	parseDirectDeps,
	parseDryRun,
	readCargoCooldownDays,
} from '../../../scripts/check-outdated-cargo.mjs';

/** Build the version map classifyLockMove / newestOutOfRange consume. */
function versionsMap(
	pairs: Array<[string, string, boolean?]>,
): Map<string, { publishedAt: Date; yanked: boolean }> {
	return new Map(pairs.map(([v, t, yanked]) => [v, { publishedAt: new Date(t), yanked: Boolean(yanked) }]));
}

const CUTOFF = new Date('2026-10-03T00:00:00.000Z').getTime();

describe('readCargoCooldownDays', () => {
	const yaml = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    cooldown:
      default-days: 14
  - package-ecosystem: "cargo"
    directory: "/src-tauri"
    cooldown:
      default-days: 7
`;

	it('reads the cargo entry, not the npm one', () => {
		expect(readCargoCooldownDays(yaml)).toBe(7);
	});

	it('throws when the cargo entry has no cooldown', () => {
		expect(() =>
			readCargoCooldownDays('updates:\n  - package-ecosystem: "cargo"\n    directory: "/src-tauri"\n'),
		).toThrow(/cooldown/);
	});

	it('throws when there is no cargo entry or the file is empty', () => {
		expect(() => readCargoCooldownDays('updates:\n  - package-ecosystem: "npm"\n')).toThrow();
		expect(() => readCargoCooldownDays('')).toThrow();
	});
});

describe('parseDryRun', () => {
	it('splits updates, downgrades, additions and removals', () => {
		const out = `    Updating crates.io index
     Locking 3 packages to latest compatible versions
    Updating cc v1.4.7 -> v1.7.0
    Updating toml v1.1.6+spec-1.1.0 -> v1.1.8+spec-1.1.0
 Downgrading foo v2.0.1 -> v2.0.0
      Adding windows-registry v0.6.1
    Removing multiversion v0.8.0
note: pass \`--verbose\` to see 65 unchanged dependencies behind latest
warning: not updating lockfile due to dry run`;

		expect(parseDryRun(out)).toEqual({
			updates: [
				{ name: 'cc', from: '1.4.7', to: '1.7.0' },
				{ name: 'toml', from: '1.1.6+spec-1.1.0', to: '1.1.8+spec-1.1.0' },
			],
			downgrades: [{ name: 'foo', from: '2.0.1', to: '2.0.0' }],
			added: [{ name: 'windows-registry', version: '0.6.1' }],
			removed: [{ name: 'multiversion', version: '0.8.0' }],
		});
	});

	it('returns empty lists when nothing moves', () => {
		expect(parseDryRun('')).toEqual({ updates: [], downgrades: [], added: [], removed: [] });
	});
});

describe('cargoReqToRange', () => {
	it('keeps caret, tilde and exact requirements', () => {
		expect(cargoReqToRange('^0.49.2')).toBe('^0.49.2');
		expect(cargoReqToRange('~1.2')).toBe('~1.2');
		expect(cargoReqToRange('=2.0.0')).toBe('=2.0.0');
	});

	it('turns the Cargo comma into an npm AND', () => {
		expect(cargoReqToRange('>=1.0, <2.0')).toBe('>=1.0 <2.0');
	});

	it('returns null for an empty or unparseable requirement', () => {
		expect(cargoReqToRange('')).toBeNull();
		expect(cargoReqToRange(undefined)).toBeNull();
		expect(cargoReqToRange('not a range')).toBeNull();
	});
});

describe('crateVersionsFromApi', () => {
	it('maps versions to publish date and yanked flag', () => {
		const versions = crateVersionsFromApi({
			versions: [
				{ num: '0.8.4', created_at: '2026-09-30T00:00:00Z', yanked: false },
				{ num: '0.8.3', created_at: '2026-09-01T00:00:00Z', yanked: true },
			],
		});

		expect(versions?.get('0.8.4')).toEqual({ publishedAt: new Date('2026-09-30T00:00:00Z'), yanked: false });
		expect(versions?.get('0.8.3')?.yanked).toBe(true);
	});

	it('skips entries without a valid version or date', () => {
		const versions = crateVersionsFromApi({ versions: [{ num: 'bogus', created_at: 'x' }, { num: '1.0.0' }] });

		expect(versions?.size).toBe(0);
	});

	it('returns null for an error payload', () => {
		expect(crateVersionsFromApi({ errors: [{ detail: 'Not Found' }] })).toBeNull();
		expect(crateVersionsFromApi(null)).toBeNull();
	});
});

describe('classifyLockMove', () => {
	it('offers the newest cleared version and locks the younger ones', () => {
		const cc = versionsMap([
			['1.4.7', '2026-08-01T00:00:00Z'],
			['1.5.0', '2026-09-20T00:00:00Z'],
			['1.6.0', '2026-10-02T00:00:00Z'],
			['1.7.0', '2026-10-09T00:00:00Z'],
		]);

		const result = classifyLockMove(cc, '1.4.7', '1.7.0', CUTOFF);

		expect(result.installable).toBe('1.6.0');
		expect(result.installableAt).toEqual(new Date('2026-10-02T00:00:00Z'));
		expect(result.locked.map((l: { version: string }) => l.version)).toEqual(['1.7.0']);
		expect(result.yanked).toEqual([]);
	});

	it('never offers a version above the dry-run target', () => {
		// The target is what every requirement in the graph allows; a newer
		// release on crates.io is out of reach for this lockfile.
		const cc = versionsMap([
			['1.4.7', '2026-08-01T00:00:00Z'],
			['1.6.0', '2026-09-01T00:00:00Z'],
			['2.0.0', '2026-09-02T00:00:00Z'],
		]);

		expect(classifyLockMove(cc, '1.4.7', '1.6.0', CUTOFF).installable).toBe('1.6.0');
	});

	it('skips yanked versions and reports them', () => {
		const yoke = versionsMap([
			['0.8.3', '2026-08-01T00:00:00Z', true],
			['0.8.4', '2026-09-30T00:00:00Z', true],
			['0.8.5', '2026-10-01T00:00:00Z'],
		]);

		const result = classifyLockMove(yoke, '0.8.3', '0.8.5', CUTOFF);

		expect(result.installable).toBe('0.8.5');
		expect(result.yanked).toEqual(['0.8.4']);
	});

	it('returns nothing installable when every candidate is inside the window', () => {
		const mio = versionsMap([
			['1.2.3', '2026-08-01T00:00:00Z'],
			['1.2.4', '2026-10-05T00:00:00Z'],
		]);

		const result = classifyLockMove(mio, '1.2.3', '1.2.4', CUTOFF);

		expect(result.installable).toBeNull();
		expect(result.installableAt).toBeNull();
		expect(result.locked.map((l: { version: string }) => l.version)).toEqual(['1.2.4']);
	});

	it('ignores prereleases unless the move itself involves one', () => {
		const stable = versionsMap([
			['1.0.0', '2026-08-01T00:00:00Z'],
			['1.1.0-rc.1', '2026-09-01T00:00:00Z'],
			['1.1.0', '2026-09-02T00:00:00Z'],
		]);
		const ort = versionsMap([
			['2.0.0-rc.12', '2026-08-01T00:00:00Z'],
			['2.0.0-rc.13', '2026-09-01T00:00:00Z'],
		]);

		expect(classifyLockMove(stable, '1.0.0', '1.1.0', CUTOFF).installable).toBe('1.1.0');
		expect(classifyLockMove(stable, '1.0.0', '1.1.0', CUTOFF).locked).toEqual([]);
		expect(classifyLockMove(ort, '2.0.0-rc.12', '2.0.0-rc.13', CUTOFF).installable).toBe('2.0.0-rc.13');
	});

	it('returns an empty result for an empty version map', () => {
		expect(classifyLockMove(new Map(), '1.0.0', '1.0.1', CUTOFF)).toEqual({
			installable: null,
			installableAt: null,
			locked: [],
			yanked: [],
		});
	});
});

describe('isCompatibleMove', () => {
	it('accepts a move inside the caret range', () => {
		expect(isCompatibleMove('1.4.7', '1.7.0')).toBe(true);
		expect(isCompatibleMove('0.8.57', '0.8.59')).toBe(true);
	});

	it('flags a 0.x minor or a major jump', () => {
		// winreg 0.55 -> 0.56 only resolves once embed-resource asks for ^0.56.
		expect(isCompatibleMove('0.55.0', '0.56.0')).toBe(false);
		expect(isCompatibleMove('0.1.1', '0.2.0')).toBe(false);
		expect(isCompatibleMove('1.9.0', '2.0.0')).toBe(false);
	});
});

describe('newestOutOfRange', () => {
	const sentry = versionsMap([
		['0.49.3', '2026-09-21T00:00:00Z'],
		['0.50.0', '2026-09-25T00:00:00Z'],
		['0.51.0', '2026-10-08T00:00:00Z'],
		['0.52.0', '2026-09-26T00:00:00Z', true],
	]);

	it('returns the newest cleared, non-yanked release the requirement misses', () => {
		expect(newestOutOfRange(sentry, '0.49.3', '^0.49.2', CUTOFF)).toEqual({
			version: '0.50.0',
			publishedAt: new Date('2026-09-25T00:00:00Z'),
		});
	});

	it('returns null when the requirement already reaches the newest release', () => {
		expect(newestOutOfRange(sentry, '0.50.0', '^0.50', CUTOFF)).toBeNull();
	});

	it('ignores prereleases of a stable dependency', () => {
		const notify = versionsMap([
			['8.2.0', '2026-01-01T00:00:00Z'],
			['9.0.0-rc.5', '2026-09-01T00:00:00Z'],
		]);

		expect(newestOutOfRange(notify, '8.2.0', '^8', CUTOFF)).toBeNull();
	});

	it('returns null for a missing range', () => {
		expect(newestOutOfRange(sentry, '0.49.3', null, CUTOFF)).toBeNull();
	});
});

describe('parseCargoLock', () => {
	it('collects registry crates and every locked version', () => {
		const lock = `version = 4

[[package]]
name = "kokobrain"
version = "3.0.7"

[[package]]
name = "syn"
version = "2.0.119"
source = "registry+https://github.com/rust-lang/crates.io-index"

[[package]]
name = "syn"
version = "3.0.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
dependencies = [
 "proc-macro2",
]

[[package]]
name = "forked"
version = "0.1.0"
source = "git+https://example.com/forked#abc"
`;

		const crates = parseCargoLock(lock);

		expect(crates.get('syn')).toEqual(['2.0.119', '3.0.6']);
		expect(crates.has('kokobrain')).toBe(false);
		expect(crates.has('forked')).toBe(false);
	});

	it('returns an empty map for an empty lockfile', () => {
		expect(parseCargoLock('').size).toBe(0);
	});
});

describe('parseDirectDeps', () => {
	const registry = 'registry+https://github.com/rust-lang/crates.io-index';

	it('keeps registry dependencies and merges kinds', () => {
		const deps = parseDirectDeps({
			packages: [
				{
					dependencies: [
						{ name: 'tokio', req: '^1', kind: null, source: registry },
						{ name: 'tokio', req: '^1', kind: 'dev', source: registry },
						{ name: 'tauri-build', req: '^2', kind: 'build', source: registry },
						{ name: 'local', req: '*', kind: null, source: null },
					],
				},
			],
		});

		expect(deps.get('tokio')).toEqual({ req: '^1', kinds: ['normal', 'dev'] });
		expect(deps.get('tauri-build')).toEqual({ req: '^2', kinds: ['build'] });
		expect(deps.has('local')).toBe(false);
	});

	it('returns an empty map for missing metadata', () => {
		expect(parseDirectDeps(undefined).size).toBe(0);
	});
});

describe('lockedVersionFor', () => {
	it('picks the newest locked version the requirement accepts', () => {
		expect(lockedVersionFor(['2.0.119', '3.0.6'], '^2')).toBe('2.0.119');
		expect(lockedVersionFor(['0.20.0', '0.20.1'], '^0.20')).toBe('0.20.1');
	});

	it('handles a prerelease requirement', () => {
		expect(lockedVersionFor(['2.0.0-rc.13'], '^2.0.0-rc.13')).toBe('2.0.0-rc.13');
	});

	it('returns null when the crate is not locked', () => {
		expect(lockedVersionFor(undefined, '^1')).toBeNull();
		expect(lockedVersionFor([], '^1')).toBeNull();
	});
});

describe('parseCargoAudit', () => {
	it('flattens vulnerabilities and warnings', () => {
		const rows = parseCargoAudit({
			vulnerabilities: {
				list: [
					{
						advisory: { id: 'RUSTSEC-2026-0001', title: 'h2 flood' },
						package: { name: 'h2', version: '0.4.19' },
						versions: { patched: ['>=0.4.20'] },
					},
				],
			},
			warnings: {
				yanked: [{ kind: 'yanked', advisory: null, package: { name: 'yoke-derive', version: '0.8.3' } }],
			},
		});

		expect(rows).toEqual([
			{
				kind: 'vulnerability',
				id: 'RUSTSEC-2026-0001',
				name: 'h2',
				version: '0.4.19',
				title: 'h2 flood',
				patched: ['>=0.4.20'],
			},
			{ kind: 'yanked', id: null, name: 'yoke-derive', version: '0.8.3', title: 'yanked', patched: [] },
		]);
	});

	it('returns no rows for a clean or malformed report', () => {
		expect(parseCargoAudit({ vulnerabilities: { list: [] }, warnings: {} })).toEqual([]);
		expect(parseCargoAudit(null)).toEqual([]);
	});
});

describe('isPatched', () => {
	it('matches any patched requirement', () => {
		expect(isPatched('0.11.18', ['>=0.11.18'])).toBe(true);
		expect(isPatched('1.2.4', ['>=2.0.0', '^1.2.3'])).toBe(true);
	});

	it('rejects a version outside every patched requirement', () => {
		expect(isPatched('0.11.17', ['>=0.11.18'])).toBe(false);
	});

	it('returns false when there is no patch', () => {
		expect(isPatched('1.0.0', [])).toBe(false);
	});
});

describe('auditAdvisoryIds', () => {
	it('collects RUSTSEC ids and their aliases from vulnerabilities and warnings', () => {
		const ids = auditAdvisoryIds({
			vulnerabilities: {
				list: [{ advisory: { id: 'RUSTSEC-2026-0001', aliases: ['GHSA-aaaa-bbbb-cccc', 'CVE-2026-1'] } }],
			},
			warnings: { unmaintained: [{ advisory: { id: 'RUSTSEC-2024-0436', aliases: [] } }], yanked: [{ advisory: null }] },
		});

		expect([...ids].sort()).toEqual(['CVE-2026-1', 'GHSA-aaaa-bbbb-cccc', 'RUSTSEC-2024-0436', 'RUSTSEC-2026-0001']);
	});

	it('returns an empty set for a clean or malformed report', () => {
		expect(auditAdvisoryIds({ vulnerabilities: { list: [] }, warnings: {} }).size).toBe(0);
		expect(auditAdvisoryIds(null).size).toBe(0);
	});
});

describe('githubRepoFromUrl', () => {
	it('reduces workspace subpaths and .git suffixes to owner/repo', () => {
		expect(githubRepoFromUrl('https://github.com/quinn-rs/quinn')).toBe('quinn-rs/quinn');
		expect(githubRepoFromUrl('https://github.com/wasm-bindgen/wasm-bindgen/tree/master/crates/macro')).toBe(
			'wasm-bindgen/wasm-bindgen',
		);
		expect(githubRepoFromUrl('git+https://github.com/Owner/Repo.git')).toBe('owner/repo');
		expect(githubRepoFromUrl('https://www.github.com/a/b/')).toBe('a/b');
	});

	it('returns null for other hosts and missing URLs', () => {
		expect(githubRepoFromUrl('https://gitlab.com/a/b')).toBeNull();
		expect(githubRepoFromUrl('https://github.com/only-owner')).toBeNull();
		expect(githubRepoFromUrl(null)).toBeNull();
		expect(githubRepoFromUrl(undefined)).toBeNull();
	});
});

describe('crateReposFromApi', () => {
	it('maps crate ids to their repository, null when unset', () => {
		const repos = crateReposFromApi({
			crates: [
				{ id: 'quinn-proto', repository: 'https://github.com/quinn-rs/quinn' },
				{ id: 'no-repo', repository: null },
			],
		});

		expect([...repos]).toEqual([
			['quinn-proto', 'https://github.com/quinn-rs/quinn'],
			['no-repo', null],
		]);
	});

	it('returns an empty map for an error payload', () => {
		expect(crateReposFromApi({ errors: [{ detail: 'Not Found' }] }).size).toBe(0);
		expect(crateReposFromApi(null).size).toBe(0);
	});
});

describe('ghsaVulnerableRange', () => {
	it('reads the comma as AND when that is satisfiable', () => {
		expect(ghsaVulnerableRange('>= 0.11.0, <= 0.11.18')).toBe('>= 0.11.0 <= 0.11.18');
	});

	it('falls back to OR when the AND reading matches nothing (quinn-udp)', () => {
		expect(ghsaVulnerableRange('< 0.5.16, >= 0.6.0 < 0.6.3')).toBe('< 0.5.16 || >= 0.6.0 < 0.6.3');
	});

	it('keeps bare versions and hyphen ranges as GitHub writes them', () => {
		expect(ghsaVulnerableRange('0.11.17')).toBe('0.11.17');
		expect(ghsaVulnerableRange('0.11.0 - 0.11.6')).toBe('0.11.0 - 0.11.6');
	});

	it('reads `none` as no version at all (smallvec)', () => {
		const range = ghsaVulnerableRange('none');
		expect(range).not.toBeNull();
		expect(isAffected('1.16.2', { vulnerableRange: 'none', patchedVersions: '2.0.0-alpha.12' })).toBe(false);
		expect(isAffected('0.0.0', { vulnerableRange: 'None', patchedVersions: null })).toBe(false);
	});

	it('returns null for empty or unreadable input', () => {
		expect(ghsaVulnerableRange('')).toBeNull();
		expect(ghsaVulnerableRange(null)).toBeNull();
		expect(ghsaVulnerableRange('every version')).toBeNull();
	});
});

describe('ghsaPatchedRange', () => {
	it('reads a single bare version as "this one and later"', () => {
		expect(ghsaPatchedRange('0.11.19')).toBe('>=0.11.19');
		expect(ghsaPatchedRange('>= 0.11.19')).toBe('>=0.11.19');
	});

	it('caps every release line but the newest at its next breaking version', () => {
		expect(ghsaPatchedRange('>= 0.5.16, >= 0.6.3')).toBe('>=0.5.16 <0.6.0 || >=0.6.3');
		expect(ghsaPatchedRange('0.10.5, 0.9.5')).toBe('>=0.9.5 <0.10.0 || >=0.10.5');
		expect(ghsaPatchedRange('1.2.3, 2.0.1')).toBe('>=1.2.3 <2.0.0 || >=2.0.1');
	});

	it('keeps tilde lines and leaves only the newest one open (rustix)', () => {
		expect(ghsaPatchedRange('~0.35.15, ~0.36.16, ~0.37.25, ~0.38.19')).toBe(
			'~0.35.15 || ~0.36.16 || ~0.37.25 || >=0.38.19',
		);
	});

	it('joins a `<` part to the line before it', () => {
		expect(ghsaPatchedRange('>= 1.2.0, < 2.0.0, >= 2.0.4')).toBe('>= 1.2.0 < 2.0.0 || >=2.0.4');
		expect(ghsaPatchedRange('>= 1.2.0, < 2.0.0')).toBe('>=1.2.0');
	});

	it('returns null for empty or unreadable input', () => {
		expect(ghsaPatchedRange('')).toBeNull();
		expect(ghsaPatchedRange(undefined)).toBeNull();
		expect(ghsaPatchedRange('see release notes')).toBeNull();
	});
});

describe('isAffected', () => {
	it('flags a version inside the vulnerable range that is not patched', () => {
		const entry = { vulnerableRange: '>= 0.11.0, <= 0.11.18', patchedVersions: '0.11.19' };
		expect(isAffected('0.11.18', entry)).toBe(true);
		expect(isAffected('0.11.19', entry)).toBe(false);
		expect(isAffected('0.10.9', entry)).toBe(false);
	});

	it('lets a patched version win over an open-ended vulnerable range', () => {
		const entry = { vulnerableRange: '> 0.7.0', patchedVersions: '>= 0.11.18' };
		expect(isAffected('0.11.19', entry)).toBe(false);
		expect(isAffected('0.11.17', entry)).toBe(true);
	});

	it('keeps an unpatched middle line affected (quinn-udp 0.6.1)', () => {
		const entry = { vulnerableRange: '< 0.5.16, >= 0.6.0 < 0.6.3', patchedVersions: '>= 0.5.16, >= 0.6.3' };
		expect(isAffected('0.5.15', entry)).toBe(true);
		expect(isAffected('0.5.16', entry)).toBe(false);
		expect(isAffected('0.6.1', entry)).toBe(true);
		expect(isAffected('0.6.3', entry)).toBe(false);
	});

	it('treats versions after the newest patched line as fixed (rustix 1.x)', () => {
		const entry = { vulnerableRange: '>0.35.11', patchedVersions: '~0.35.15, ~0.36.16, ~0.37.25, ~0.38.19' };
		expect(isAffected('1.1.5', entry)).toBe(false);
		expect(isAffected('0.37.25', entry)).toBe(false);
		expect(isAffected('0.37.24', entry)).toBe(true);
	});

	it('treats unpatched as affected when only the patched field is readable', () => {
		expect(isAffected('1.0.0', { vulnerableRange: 'all of them', patchedVersions: '1.0.1' })).toBe(true);
		expect(isAffected('1.0.1', { vulnerableRange: 'all of them', patchedVersions: '1.0.1' })).toBe(false);
	});

	it('returns null when neither field can be read', () => {
		expect(isAffected('1.0.0', { vulnerableRange: null, patchedVersions: null })).toBeNull();
	});
});

describe('matchRepoAdvisories', () => {
	const lock = new Map([
		['quinn-proto', ['0.11.18']],
		['quinn-udp', ['0.5.16']],
	]);
	const advisory = (over: Record<string, unknown> = {}) => ({
		ghsa_id: 'GHSA-53rm-773f-4q8c',
		cve_id: null,
		state: 'published',
		withdrawn_at: null,
		severity: 'high',
		summary: 'MAX_STREAM_DATA frame opens streams over the stream limit',
		vulnerabilities: [
			{
				package: { ecosystem: 'rust', name: 'quinn-proto' },
				vulnerable_version_range: '>= 0.11.0, <= 0.11.18',
				patched_versions: '0.11.19',
			},
		],
		...over,
	});

	it('reports a locked version the advisory affects', () => {
		expect(matchRepoAdvisories([advisory()], lock)).toEqual([
			{
				id: 'GHSA-53rm-773f-4q8c',
				severity: 'high',
				summary: 'MAX_STREAM_DATA frame opens streams over the stream limit',
				name: 'quinn-proto',
				version: '0.11.18',
				vulnerableRange: '>= 0.11.0, <= 0.11.18',
				patchedVersions: '0.11.19',
				affected: true,
			},
		]);
	});

	it('skips patched versions, crates not in the lock and non-rust entries', () => {
		const patched = advisory({
			vulnerabilities: [
				{ package: { ecosystem: 'rust', name: 'quinn-udp' }, vulnerable_version_range: '< 0.5.16', patched_versions: '0.5.16' },
				{ package: { ecosystem: 'rust', name: 'quinn' }, vulnerable_version_range: '< 1', patched_versions: '1.0.0' },
				{ package: { ecosystem: 'npm', name: 'quinn-proto' }, vulnerable_version_range: '< 1', patched_versions: null },
			],
		});

		expect(matchRepoAdvisories([patched], lock)).toEqual([]);
	});

	it('skips withdrawn, unpublished and already-audited advisories', () => {
		expect(matchRepoAdvisories([advisory({ withdrawn_at: '2026-10-01T00:00:00Z' })], lock)).toEqual([]);
		expect(matchRepoAdvisories([advisory({ state: 'draft' })], lock)).toEqual([]);
		expect(matchRepoAdvisories([advisory()], lock, new Set(['GHSA-53rm-773f-4q8c']))).toEqual([]);
		expect(matchRepoAdvisories([advisory({ cve_id: 'CVE-2026-9' })], lock, new Set(['CVE-2026-9']))).toEqual([]);
	});

	it('reports each advisory once even when two repositories return it', () => {
		expect(matchRepoAdvisories([advisory(), advisory()], lock)).toHaveLength(1);
	});

	it('keeps unreadable ranges as affected: null so they are checked by hand', () => {
		const rows = matchRepoAdvisories(
			[advisory({ vulnerabilities: [{ package: { ecosystem: 'rust', name: 'quinn-proto' } }] })],
			lock,
		);

		expect(rows).toHaveLength(1);
		expect(rows[0].affected).toBeNull();
	});

	it('returns no rows for empty input', () => {
		expect(matchRepoAdvisories([], lock)).toEqual([]);
		expect(matchRepoAdvisories([advisory()], new Map())).toEqual([]);
	});
});
