import { describe, it, expect } from 'vitest';
// @ts-expect-error semver ships no type declarations and @types/semver is not installed
import semver from 'semver';
import { resolveVersion, formatBuildInfo, parseReleaseChannel, channelLabel, buildLabel } from '#lib/utils/build-info.js';

describe('resolveVersion', () => {
	it('returns the pkg version unchanged on the stable channel', () => {
		expect(resolveVersion({
			pkgVersion: '2.8.0',
			gitHash: '34158e03',
			commitCount: '1234',
			channel: 'stable',
		})).toBe('2.8.0');
	});

	it('bumps patch+1 and appends -nightly.<count>.<sha> on the nightly channel', () => {
		expect(resolveVersion({
			pkgVersion: '2.8.0',
			gitHash: '34158e03',
			commitCount: '1234',
			channel: 'nightly',
		})).toBe('2.8.1-nightly.1234.34158e03');
	});

	it('keeps short hashes intact', () => {
		expect(resolveVersion({
			pkgVersion: '1.0.0',
			gitHash: 'abc1234',
			commitCount: '7',
			channel: 'nightly',
		})).toBe('1.0.1-nightly.7.abc1234');
	});

	it('handles the "unknown" git-hash fallback on stable', () => {
		expect(resolveVersion({
			pkgVersion: '2.8.0',
			gitHash: 'unknown',
			commitCount: '0',
			channel: 'stable',
		})).toBe('2.8.0');
	});

	it('still appends suffix when git-hash is unknown on nightly', () => {
		expect(resolveVersion({
			pkgVersion: '2.8.0',
			gitHash: 'unknown',
			commitCount: '0',
			channel: 'nightly',
		})).toBe('2.8.1-nightly.0.unknown');
	});

	it('sorts a nightly above the stable it builds on and below the next patch', () => {
		const nightly = resolveVersion({
			pkgVersion: '3.0.12',
			gitHash: '24e7a5fc',
			commitCount: '494',
			channel: 'nightly',
		});
		expect(nightly).toBe('3.0.13-nightly.494.24e7a5fc');
		expect(semver.sort(['3.0.13', nightly, '3.0.12'])).toEqual(['3.0.12', nightly, '3.0.13']);
	});
});

describe('resolveVersion with versionOverride', () => {
	it('returns the override as-is on any channel', () => {
		expect(resolveVersion({
			pkgVersion: '3.0.12',
			gitHash: 'abc12345',
			commitCount: '9',
			channel: 'stable',
			versionOverride: '3.1.0-tauri3-alpha.2001.abc12345',
		})).toBe('3.1.0-tauri3-alpha.2001.abc12345');
	});

	it('ignores an empty override', () => {
		expect(resolveVersion({
			pkgVersion: '3.0.12',
			gitHash: 'abc12345',
			commitCount: '9',
			channel: 'stable',
			versionOverride: '',
		})).toBe('3.0.12');
	});
});

describe('formatBuildInfo', () => {
	it('shows the override version without repeating the hash', () => {
		expect(formatBuildInfo({
			pkgVersion: '3.0.12',
			gitHash: 'abc12345',
			commitCount: '9',
			buildTime: '2026-10-29T12:00:00',
			channel: 'stable',
			versionOverride: '3.1.0-tauri3-alpha.2001.abc12345',
		})).toBe('3.1.0-tauri3-alpha.2001.abc12345 (2026-10-29T12:00:00)');
	});

	it('formats stable as "version (sha) (time)"', () => {
		expect(formatBuildInfo({
			pkgVersion: '2.8.0',
			gitHash: '34158e03',
			commitCount: '1234',
			buildTime: '2026-05-13T12:00:00',
			channel: 'stable',
		})).toBe('2.8.0 (34158e03) (2026-05-13T12:00:00)');
	});

	it('omits the (sha) parens on nightly because the version already ends with the hash', () => {
		expect(formatBuildInfo({
			pkgVersion: '2.8.0',
			gitHash: '34158e03',
			commitCount: '1234',
			buildTime: '2026-05-13T12:00:00',
			channel: 'nightly',
		})).toBe('2.8.1-nightly.1234.34158e03 (2026-05-13T12:00:00)');
	});

	it('nightly never repeats the git hash in the rendered string', () => {
		const result = formatBuildInfo({
			pkgVersion: '2.8.0',
			gitHash: 'deadbeef',
			commitCount: '99',
			buildTime: '2026-05-13T12:00:00',
			channel: 'nightly',
		});
		// "deadbeef" must appear exactly once
		expect(result.match(/deadbeef/g)?.length).toBe(1);
	});
});

describe('parseReleaseChannel', () => {
	it('defaults to stable when undefined', () => {
		expect(parseReleaseChannel(undefined)).toBe('stable');
	});

	it('defaults to stable on empty string', () => {
		expect(parseReleaseChannel('')).toBe('stable');
	});

	it('returns nightly for "nightly"', () => {
		expect(parseReleaseChannel('nightly')).toBe('nightly');
	});

	it('returns nightly case-insensitively', () => {
		expect(parseReleaseChannel('Nightly')).toBe('nightly');
		expect(parseReleaseChannel('NIGHTLY')).toBe('nightly');
	});

	it('returns stable for any other value', () => {
		expect(parseReleaseChannel('stable')).toBe('stable');
		expect(parseReleaseChannel('canary')).toBe('stable');
		expect(parseReleaseChannel('beta')).toBe('stable');
	});
});

describe('channelLabel', () => {
	it('returns STABLE for the stable channel', () => {
		expect(channelLabel('stable')).toBe('STABLE');
	});

	it('returns NIGHTLY for the nightly channel', () => {
		expect(channelLabel('nightly')).toBe('NIGHTLY');
	});
});

describe('buildLabel', () => {
	it('returns ALPHA for an alpha prerelease version', () => {
		expect(buildLabel('stable', '3.1.0-tauri3-alpha.2001.abc12345')).toBe('ALPHA');
	});

	it('falls back to the channel label otherwise', () => {
		expect(buildLabel('stable', '3.0.12')).toBe('STABLE');
		expect(buildLabel('nightly', '3.0.13-nightly.4.abc12345')).toBe('NIGHTLY');
	});
});
