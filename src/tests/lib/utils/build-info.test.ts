import { describe, it, expect } from 'vitest';
import { resolveVersion, formatBuildInfo, parseReleaseChannel, channelLabel } from '$lib/utils/build-info';

describe('resolveVersion', () => {
	it('returns the pkg version unchanged on the stable channel', () => {
		expect(resolveVersion({
			pkgVersion: '2.0.19-alpha',
			gitHash: '34158e03',
			commitCount: '1234',
			channel: 'stable',
		})).toBe('2.0.19-alpha');
	});

	it('appends -nightly.<count>.<sha> on the nightly channel', () => {
		expect(resolveVersion({
			pkgVersion: '2.0.19-alpha',
			gitHash: '34158e03',
			commitCount: '1234',
			channel: 'nightly',
		})).toBe('2.0.19-alpha-nightly.1234.34158e03');
	});

	it('keeps short hashes intact', () => {
		expect(resolveVersion({
			pkgVersion: '1.0.0',
			gitHash: 'abc1234',
			commitCount: '7',
			channel: 'nightly',
		})).toBe('1.0.0-nightly.7.abc1234');
	});

	it('handles the "unknown" git-hash fallback on stable', () => {
		expect(resolveVersion({
			pkgVersion: '2.0.19-alpha',
			gitHash: 'unknown',
			commitCount: '0',
			channel: 'stable',
		})).toBe('2.0.19-alpha');
	});

	it('still appends suffix when git-hash is unknown on nightly', () => {
		expect(resolveVersion({
			pkgVersion: '2.0.19-alpha',
			gitHash: 'unknown',
			commitCount: '0',
			channel: 'nightly',
		})).toBe('2.0.19-alpha-nightly.0.unknown');
	});
});

describe('formatBuildInfo', () => {
	it('formats stable as "version (sha) (time)"', () => {
		expect(formatBuildInfo({
			pkgVersion: '2.0.19-alpha',
			gitHash: '34158e03',
			commitCount: '1234',
			buildTime: '2026-05-13T12:00:00',
			channel: 'stable',
		})).toBe('2.0.19-alpha (34158e03) (2026-05-13T12:00:00)');
	});

	it('omits the (sha) parens on nightly because the version already ends with the hash', () => {
		expect(formatBuildInfo({
			pkgVersion: '2.0.19-alpha',
			gitHash: '34158e03',
			commitCount: '1234',
			buildTime: '2026-05-13T12:00:00',
			channel: 'nightly',
		})).toBe('2.0.19-alpha-nightly.1234.34158e03 (2026-05-13T12:00:00)');
	});

	it('nightly never repeats the git hash in the rendered string', () => {
		const result = formatBuildInfo({
			pkgVersion: '2.0.19-alpha',
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
