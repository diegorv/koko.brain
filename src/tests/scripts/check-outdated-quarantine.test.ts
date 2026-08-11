import { describe, expect, it } from 'vitest';

import {
	classifyUpgrades,
	parseInstalledDeps,
	publishTimesFromView,
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
