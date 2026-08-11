import { describe, expect, it } from 'vitest';

import {
	classifyUpgrades,
	isWithinDeclaredRange,
	parseDeclaredRanges,
	parseInstalledDeps,
	parseLockfilePackages,
	publishTimesFromView,
	reachableTransitiveUpgrade,
	stableVersionsUpToLatest,
} from '../../../scripts/check-outdated-quarantine.mjs';

/** Build a registry-shaped `time` object from [version, isoDate] pairs. */
function timeObj(pairs: Array<[string, string]>): Record<string, string> {
	return Object.fromEntries([
		['created', '2020-01-01T00:00:00.000Z'],
		['modified', '2026-08-08T00:00:00.000Z'],
		...pairs,
	]);
}

/** Build the Map that classifyUpgrades consumes. */
function timesMap(pairs: Array<[string, string]>): Map<string, Date> {
	return new Map(pairs.map(([v, t]) => [v, new Date(t)]));
}

describe('stableVersionsUpToLatest', () => {
	it('keeps stable versions and drops the created/modified metadata keys', () => {
		const times = stableVersionsUpToLatest(
			timeObj([
				['1.0.0', '2026-01-01T00:00:00.000Z'],
				['1.1.0', '2026-02-01T00:00:00.000Z'],
			]),
			'1.1.0',
		);

		expect([...times.keys()]).toEqual(['1.0.0', '1.1.0']);
		expect(times.get('1.1.0')).toEqual(new Date('2026-02-01T00:00:00.000Z'));
	});

	it('drops prereleases', () => {
		const times = stableVersionsUpToLatest(
			timeObj([
				['2.0.0', '2026-01-01T00:00:00.000Z'],
				['2.1.0-beta.1', '2026-02-01T00:00:00.000Z'],
			]),
			'2.0.0',
		);

		expect([...times.keys()]).toEqual(['2.0.0']);
	});

	it('drops versions above the latest dist-tag', () => {
		// Real case: codemirror ships 6.0.2 as latest while a mistagged 6.65.7
		// sits in the registry. Reporting 6.65.7 as an upgrade would be wrong.
		const times = stableVersionsUpToLatest(
			timeObj([
				['6.0.1', '2026-01-01T00:00:00.000Z'],
				['6.0.2', '2026-02-01T00:00:00.000Z'],
				['6.65.7', '2026-03-01T00:00:00.000Z'],
			]),
			'6.0.2',
		);

		expect([...times.keys()]).toEqual(['6.0.1', '6.0.2']);
	});

	it('keeps every stable version when the latest dist-tag is unknown', () => {
		const times = stableVersionsUpToLatest(
			timeObj([
				['1.0.0', '2026-01-01T00:00:00.000Z'],
				['9.9.9', '2026-03-01T00:00:00.000Z'],
			]),
			undefined,
		);

		expect([...times.keys()]).toEqual(['1.0.0', '9.9.9']);
	});

	it('returns an empty map for missing input', () => {
		expect(stableVersionsUpToLatest(undefined, '1.0.0').size).toBe(0);
	});
});

describe('parseInstalledDeps', () => {
	it('reads both dependency groups and flags dev deps', () => {
		const installed = parseInstalledDeps([
			{
				dependencies: { marked: { from: 'marked', version: '18.0.9' } },
				devDependencies: { vitest: { from: 'vitest', version: '4.1.10' } },
			},
		]);

		expect(installed.get('marked')).toEqual({
			version: '18.0.9',
			dev: false,
			registryName: 'marked',
		});
		expect(installed.get('vitest')?.dev).toBe(true);
	});

	it('resolves an npm alias to the aliased registry name', () => {
		// The bug this guards: `"@typescript/native": "npm:typescript@^7.0.2"` was
		// looked up under the alias, which 404s, so TypeScript 7 releases never
		// reached the report. pnpm reports the real name in `from`.
		const installed = parseInstalledDeps([
			{
				devDependencies: {
					'@typescript/native': { from: 'typescript', version: '7.0.2' },
					typescript: { from: 'typescript', version: '6.0.3' },
				},
			},
		]);

		expect(installed.get('@typescript/native')).toEqual({
			version: '7.0.2',
			dev: true,
			registryName: 'typescript',
		});
		// The alias keeps its declared name as the key, so both coexist.
		expect(installed.get('typescript')?.version).toBe('6.0.3');
	});

	it('falls back to the declared name when `from` is absent', () => {
		const installed = parseInstalledDeps([{ dependencies: { yaml: { version: '2.9.0' } } }]);

		expect(installed.get('yaml')?.registryName).toBe('yaml');
	});

	it('skips entries without a resolved version', () => {
		const installed = parseInstalledDeps([
			{ dependencies: { broken: { from: 'broken' }, ok: { from: 'ok', version: '1.0.0' } } },
		]);

		expect(installed.has('broken')).toBe(false);
		expect(installed.has('ok')).toBe(true);
	});

	it('accepts a bare object payload and returns empty for missing input', () => {
		expect(parseInstalledDeps({ dependencies: { yaml: { version: '2.9.0' } } }).size).toBe(1);
		expect(parseInstalledDeps([]).size).toBe(0);
		expect(parseInstalledDeps(undefined).size).toBe(0);
	});
});

describe('parseLockfilePackages', () => {
	const lock = [
		"lockfileVersion: '9.0'",
		'importers:',
		'  .:',
		'    dependencies:',
		'      marked:',
		'        version: 18.0.9',
		'packages:',
		"  '@antfu/install-pkg@1.1.0':",
		'    resolution: {integrity: sha512-aaa}',
		'  marked@18.0.9:',
		'    resolution: {integrity: sha512-bbb}',
		'  picomatch@4.0.4:',
		'  picomatch@4.0.5:',
		"  'bits-ui@2.18.1(svelte@5.56.8)':",
		'  not-a-version@workspace:',
		'snapshots:',
		'  marked@18.0.9: {}',
		'  should-not-appear@9.9.9: {}',
	].join('\n');

	it('collects every resolved package from the packages section', () => {
		const packages = parseLockfilePackages(lock);

		expect(packages.get('marked')).toEqual(new Set(['18.0.9']));
		expect(packages.get('@antfu/install-pkg')).toEqual(new Set(['1.1.0']));
	});

	it('keeps every version when a package is resolved more than once', () => {
		expect(parseLockfilePackages(lock).get('picomatch')).toEqual(new Set(['4.0.4', '4.0.5']));
	});

	it('strips the peer-dependency suffix from the version', () => {
		expect(parseLockfilePackages(lock).get('bits-ui')).toEqual(new Set(['2.18.1']));
	});

	it('stops at the snapshots section so entries are not double counted', () => {
		// snapshots: repeats the same keys with dependency edges; reading it would
		// only duplicate work and could pull in keys the packages list omits.
		expect(parseLockfilePackages(lock).has('should-not-appear')).toBe(false);
	});

	it('skips keys whose version is not valid semver', () => {
		expect(parseLockfilePackages(lock).has('not-a-version')).toBe(false);
	});

	it('returns empty for a lockfile with no packages section', () => {
		expect(parseLockfilePackages("lockfileVersion: '9.0'\nimporters:\n  .: {}\n").size).toBe(0);
	});
});

describe('reachableTransitiveUpgrade', () => {
	const cutoff = new Date('2026-08-01T00:00:00.000Z').getTime();

	it('picks the newest cleared version inside ^installed', () => {
		const move = reachableTransitiveUpgrade(
			timesMap([
				['1.2.0', '2026-06-01T00:00:00.000Z'],
				['1.3.0', '2026-07-01T00:00:00.000Z'],
				['1.4.0', '2026-07-20T00:00:00.000Z'],
			]),
			new Set(['1.2.0']),
			cutoff,
		);

		expect(move).toEqual({ from: '1.2.0', to: '1.4.0' });
	});

	it('ignores versions outside ^installed', () => {
		// A dependent's range is unknown, so a caret is the widest plausible bump;
		// a new major is not something a lockfile refresh would take.
		const move = reachableTransitiveUpgrade(
			timesMap([
				['1.2.0', '2026-06-01T00:00:00.000Z'],
				['2.0.0', '2026-06-15T00:00:00.000Z'],
			]),
			new Set(['1.2.0']),
			cutoff,
		);

		expect(move).toBeNull();
	});

	it('ignores versions still inside the quarantine window', () => {
		const move = reachableTransitiveUpgrade(
			timesMap([
				['1.2.0', '2026-06-01T00:00:00.000Z'],
				['1.5.0', '2026-08-09T00:00:00.000Z'],
			]),
			new Set(['1.2.0']),
			cutoff,
		);

		expect(move).toBeNull();
	});

	it('considers every installed copy when a package is resolved twice', () => {
		const move = reachableTransitiveUpgrade(
			timesMap([
				['1.2.0', '2026-06-01T00:00:00.000Z'],
				['2.0.0', '2026-06-02T00:00:00.000Z'],
				['2.1.0', '2026-07-01T00:00:00.000Z'],
			]),
			new Set(['1.2.0', '2.0.0']),
			cutoff,
		);

		expect(move).toEqual({ from: '2.0.0', to: '2.1.0' });
	});

	it('returns null when nothing newer exists', () => {
		const move = reachableTransitiveUpgrade(
			timesMap([['1.2.0', '2026-06-01T00:00:00.000Z']]),
			new Set(['1.2.0']),
			cutoff,
		);

		expect(move).toBeNull();
	});
});

describe('parseDeclaredRanges', () => {
	it('reads ranges from both dependency groups', () => {
		const ranges = parseDeclaredRanges({
			dependencies: { marked: '^18.0.9' },
			devDependencies: { typescript: '~6.0.3' },
		});

		expect(ranges.get('marked')).toBe('^18.0.9');
		expect(ranges.get('typescript')).toBe('~6.0.3');
	});

	it('reduces an alias spec to the range alone', () => {
		const ranges = parseDeclaredRanges({
			devDependencies: { '@typescript/native': 'npm:typescript@^7.0.2' },
		});

		expect(ranges.get('@typescript/native')).toBe('^7.0.2');
	});

	it('reduces an alias spec pointing at a scoped package', () => {
		const ranges = parseDeclaredRanges({ dependencies: { alias: 'npm:@scope/pkg@^1.2.3' } });

		expect(ranges.get('alias')).toBe('^1.2.3');
	});

	it('keeps a versionless alias spec as-is so it reads as no opinion', () => {
		const ranges = parseDeclaredRanges({ dependencies: { alias: 'npm:some-pkg' } });

		expect(ranges.get('alias')).toBe('some-pkg');
		expect(isWithinDeclaredRange('1.0.0', ranges.get('alias'))).toBe(true);
	});

	it('ignores non-string specs and returns empty for missing input', () => {
		expect(parseDeclaredRanges({ dependencies: { weird: { version: '1.0.0' } } }).size).toBe(0);
		expect(parseDeclaredRanges(undefined).size).toBe(0);
	});
});

describe('isWithinDeclaredRange', () => {
	it('accepts a version the declared range reaches', () => {
		expect(isWithinDeclaredRange('18.0.9', '^18.0.7')).toBe(true);
	});

	it('rejects a version above the declared range', () => {
		// The bug this guards: typescript is pinned ~6.0.3 on purpose because
		// svelte-check refuses TypeScript 7 as the `typescript` package, yet 7.0.2
		// was reported under UPDATE NOW on every run.
		expect(isWithinDeclaredRange('7.0.2', '~6.0.3')).toBe(false);
	});

	it('rejects a major above a caret range', () => {
		expect(isWithinDeclaredRange('9.0.0', '^8.2.0')).toBe(false);
	});

	it('treats an unparseable or missing range as no opinion', () => {
		expect(isWithinDeclaredRange('1.0.0', 'workspace:*')).toBe(true);
		expect(isWithinDeclaredRange('1.0.0', undefined)).toBe(true);
	});
});

describe('publishTimesFromView', () => {
	it('maps a well-formed payload to publish times', () => {
		const times = publishTimesFromView({
			time: timeObj([
				['1.0.0', '2026-01-01T00:00:00.000Z'],
				['1.1.0', '2026-02-01T00:00:00.000Z'],
			]),
			'dist-tags': { latest: '1.1.0' },
		});

		expect([...(times?.keys() ?? [])]).toEqual(['1.0.0', '1.1.0']);
	});

	it('returns null for a registry error payload', () => {
		// The bug this guards: `pnpm view @typescript/native` 404s but still prints
		// a JSON error body, so JSON.parse succeeds and the lookup used to look
		// like a package with zero known versions — absent from UPDATE NOW, STILL
		// LOCKED and COULD NOT CHECK alike, hiding any TypeScript 7 patch.
		expect(
			publishTimesFromView({
				error: { code: 'ERR_PNPM_FETCH_404', message: 'GET https://registry.npmjs.org/… Not Found - 404' },
			}),
		).toBeNull();
	});

	it('returns null when the payload has no time field', () => {
		expect(publishTimesFromView({ 'dist-tags': { latest: '1.0.0' } })).toBeNull();
	});

	it('returns null for empty or non-object payloads', () => {
		expect(publishTimesFromView(null)).toBeNull();
		expect(publishTimesFromView(undefined)).toBeNull();
		expect(publishTimesFromView('')).toBeNull();
	});
});

describe('classifyUpgrades', () => {
	const cutoff = new Date('2026-08-01T00:00:00.000Z').getTime();

	it('reports the highest matured version as installable', () => {
		const result = classifyUpgrades(
			timesMap([
				['1.0.0', '2026-06-01T00:00:00.000Z'],
				['1.1.0', '2026-07-01T00:00:00.000Z'],
				['1.2.0', '2026-07-20T00:00:00.000Z'],
			]),
			'1.0.0',
			cutoff,
			false,
		);

		expect(result.installable).toBe('1.2.0');
		expect(result.installableAt).toEqual(new Date('2026-07-20T00:00:00.000Z'));
		expect(result.locked).toEqual([]);
	});

	it('locks versions published after the cutoff and lists them in ascending order', () => {
		const result = classifyUpgrades(
			timesMap([
				['1.0.0', '2026-06-01T00:00:00.000Z'],
				['1.1.0', '2026-07-20T00:00:00.000Z'],
				['1.3.0', '2026-08-05T00:00:00.000Z'],
				['1.2.0', '2026-08-04T00:00:00.000Z'],
			]),
			'1.0.0',
			cutoff,
			false,
		);

		expect(result.installable).toBe('1.1.0');
		expect(result.locked.map((l: { version: string }) => l.version)).toEqual(['1.2.0', '1.3.0']);
	});

	it('still reports locked versions when nothing has matured', () => {
		// The bug this guards: a package whose only newer releases are all inside
		// the window used to vanish from the report entirely, hiding fresh
		// security patches such as dompurify 3.4.13.
		const result = classifyUpgrades(
			timesMap([
				['3.4.12', '2026-07-11T00:00:00.000Z'],
				['3.4.13', '2026-08-03T00:00:00.000Z'],
			]),
			'3.4.12',
			cutoff,
			false,
		);

		expect(result.installable).toBeNull();
		expect(result.installableAt).toBeNull();
		expect(result.locked.map((l: { version: string }) => l.version)).toEqual(['3.4.13']);
	});

	it('treats every version as installable for quarantine-excluded packages', () => {
		const result = classifyUpgrades(
			timesMap([
				['2.0.0', '2026-06-01T00:00:00.000Z'],
				['2.1.0', '2026-08-07T00:00:00.000Z'],
			]),
			'2.0.0',
			cutoff,
			true,
		);

		expect(result.installable).toBe('2.1.0');
		expect(result.locked).toEqual([]);
	});

	it('ignores versions at or below the installed one', () => {
		const result = classifyUpgrades(
			timesMap([
				['1.0.0', '2026-01-01T00:00:00.000Z'],
				['2.0.0', '2026-02-01T00:00:00.000Z'],
			]),
			'2.0.0',
			cutoff,
			false,
		);

		expect(result.installable).toBeNull();
		expect(result.locked).toEqual([]);
	});

	it('returns an empty result for a package with no known versions', () => {
		const result = classifyUpgrades(new Map(), '1.0.0', cutoff, false);

		expect(result).toEqual({ installable: null, installableAt: null, locked: [] });
	});
});
