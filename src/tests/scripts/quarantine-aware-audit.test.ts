import { describe, expect, it } from 'vitest';

import {
	classifyAdvisory,
	compatiblePatches,
	installedVersionsOf,
} from '../../../scripts/quarantine-aware-audit.mjs';

const NOW = Date.parse('2026-08-08T00:00:00.000Z');
const MIN_AGE_MS = 10080 * 60 * 1000; // 7 days, the repo's minimumReleaseAge

/** Build a registry-shaped `{version: isoDate}` map. */
function times(pairs: Array<[string, string]>): Record<string, string> {
	return Object.fromEntries(pairs);
}

/** Build a minimal advisory with one finding at `installed`. */
function advisory(
	overrides: Partial<{
		module_name: string;
		patched_versions: string;
		installed: string[];
	}> = {},
) {
	const installed = overrides.installed ?? ['3.3.16'];
	return {
		module_name: overrides.module_name ?? 'nanoid',
		patched_versions: overrides.patched_versions ?? '>=3.3.17',
		severity: 'high',
		title: 'custom generators can loop indefinitely when size is zero',
		url: 'https://github.com/advisories/GHSA-2v37-7h3g-55p8',
		findings: installed.map((version) => ({ version, paths: ['.>postcss>nanoid'] })),
	};
}

describe('installedVersionsOf', () => {
	it('dedupes the versions reported across findings', () => {
		expect(installedVersionsOf(advisory({ installed: ['3.3.16', '3.3.16', '5.1.8'] }))).toEqual([
			'3.3.16',
			'5.1.8',
		]);
	});

	it('returns an empty list when findings are missing or malformed', () => {
		expect(installedVersionsOf({})).toEqual([]);
		expect(installedVersionsOf({ findings: [{ version: 'not-a-version' }, {}] })).toEqual([]);
	});
});

describe('compatiblePatches', () => {
	it('keeps only patches inside ^installed', () => {
		expect(compatiblePatches(['3.3.17', '3.3.18', '4.0.0', '5.1.8'], ['3.3.16'])).toEqual([
			'3.3.17',
			'3.3.18',
		]);
	});

	it('keeps patches compatible with any installed version', () => {
		expect(compatiblePatches(['3.3.17', '5.1.8'], ['3.3.16', '5.1.6'])).toEqual(['3.3.17', '5.1.8']);
	});

	it('keeps every patch when no installed version is known', () => {
		expect(compatiblePatches(['3.3.17', '4.0.0'], [])).toEqual(['3.3.17', '4.0.0']);
	});
});

describe('classifyAdvisory', () => {
	it('flags an aged, range-compatible patch as actionable', () => {
		const result = classifyAdvisory(
			advisory(),
			times([
				['3.3.16', '2026-07-12T08:23:40.690Z'],
				['3.3.17', '2026-06-01T00:00:00.000Z'],
				['4.0.0', '2022-06-08T08:11:03.937Z'],
			]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('actionable');
		expect(result.oldestInstallable).toBe('3.3.17');
	});

	it('treats the real nanoid case as quarantined, not actionable', () => {
		// Regression: `patched >=3.3.17` also matches nanoid@4.0.0 (2022), which
		// is aged but unreachable — postcss declares `nanoid: ^3.3.16` and v4 is
		// ESM-only. The only usable patches (3.3.17, 3.3.18) are both young.
		const result = classifyAdvisory(
			advisory(),
			times([
				['3.3.16', '2026-07-12T08:23:40.690Z'],
				['3.3.17', '2026-08-03T10:39:22.487Z'],
				['3.3.18', '2026-08-07T16:41:05.696Z'],
				['4.0.0', '2022-06-08T08:11:03.937Z'],
				['5.1.8', '2026-04-15T14:07:59.978Z'],
			]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('quarantined');
		expect(result.youngestPatch).toBe('3.3.18');
	});

	it('reports major-bump when every compatible patch is missing but an aged one exists', () => {
		const result = classifyAdvisory(
			advisory({ patched_versions: '>=5.0.0' }),
			times([
				['3.3.16', '2026-07-12T08:23:40.690Z'],
				['5.1.8', '2026-04-15T14:07:59.978Z'],
			]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('major-bump');
		expect(result.installedVersions).toEqual(['3.3.16']);
		expect(result.oldestInstallable).toBe('5.1.8');
	});

	it('falls back to quarantined when the only cross-major patch is young too', () => {
		const result = classifyAdvisory(
			advisory({ patched_versions: '>=5.0.0' }),
			times([
				['3.3.16', '2026-07-12T08:23:40.690Z'],
				['5.1.8', '2026-08-07T00:00:00.000Z'],
			]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('quarantined');
		expect(result.youngestPatch).toBe('5.1.8');
	});

	it('reports no-patch when nothing satisfies the patched range', () => {
		const result = classifyAdvisory(
			advisory({ patched_versions: '>=9.0.0' }),
			times([['3.3.16', '2026-07-12T08:23:40.690Z']]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('no-patch');
	});

	it('reports malformed advisories that lack a module or a patched range', () => {
		expect(classifyAdvisory({ patched_versions: '>=1.0.0' }, {}, MIN_AGE_MS, NOW).kind).toBe(
			'malformed',
		);
		expect(classifyAdvisory({ module_name: 'nanoid' }, {}, MIN_AGE_MS, NOW).kind).toBe('malformed');
	});

	it('grades against every patch when findings carry no usable version', () => {
		const result = classifyAdvisory(
			{ ...advisory(), findings: [] },
			times([
				['3.3.17', '2026-08-03T10:39:22.487Z'],
				['4.0.0', '2022-06-08T08:11:03.937Z'],
			]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('actionable');
		expect(result.oldestInstallable).toBe('4.0.0');
	});

	it('ignores prereleases and unparseable version keys', () => {
		const result = classifyAdvisory(
			advisory(),
			times([
				['3.3.16', '2026-07-12T08:23:40.690Z'],
				['3.3.17-beta.1', '2026-05-01T00:00:00.000Z'],
				['garbage', '2026-05-01T00:00:00.000Z'],
			]),
			MIN_AGE_MS,
			NOW,
		);

		expect(result.kind).toBe('no-patch');
	});
});
