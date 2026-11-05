import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
// @ts-expect-error semver ships no type declarations and @types/semver is not installed
import semver from 'semver';
import { resolveVersion, formatBuildInfo, parseReleaseChannel, channelLabel, parseChangelog, changelogBaseCommand } from '#lib/utils/build-info.js';

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

	it('appends .nightly.<count>.<sha> to a prerelease base instead of bumping the patch', () => {
		expect(resolveVersion({
			pkgVersion: '4.0.0-beta.1',
			gitHash: '34158e03',
			commitCount: '12',
			channel: 'nightly',
		})).toBe('4.0.0-beta.1.nightly.12.34158e03');
	});

	it('keeps nightlies monotonic across successive prerelease tags and below the final release', () => {
		const nightly = (pkgVersion: string, commitCount: string) =>
			resolveVersion({ pkgVersion, gitHash: 'abc1234', commitCount, channel: 'nightly' });
		// The count restarts at every tag, so a later base must outrank a higher count.
		const afterBeta1 = nightly('4.0.0-beta.1', '40');
		const afterBeta2 = nightly('4.0.0-beta.2', '3');
		const afterRc1 = nightly('4.0.0-rc.1', '1');
		const afterFinal = nightly('4.0.0', '2');
		const ordered = [
			'3.0.12',
			'4.0.0-beta.1',
			afterBeta1,
			'4.0.0-beta.2',
			afterBeta2,
			'4.0.0-rc.1',
			afterRc1,
			'4.0.0',
			afterFinal,
		];
		expect(semver.sort([...ordered].reverse())).toEqual(ordered);
	});
});

describe('formatBuildInfo', () => {
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

	it('returns DEV for a dev server run', () => {
		expect(channelLabel('dev')).toBe('DEV');
	});
});

describe('parseChangelog', () => {
	/** Builds `git log --format=%h%x09%s` output from [sha, subject] pairs. */
	const log = (...rows: [string, string][]) => rows.map(([sha, subject]) => `${sha}\t${subject}`).join('\n');

	it('keeps feat, fix, perf, refactor and chore(deps) commits, newest first', () => {
		expect(parseChangelog(log(
			['aaa1111', 'feat: views section groups (Issue 20)'],
			['bbb2222', 'fix(layout): lower the side panes minimum width'],
			['ccc3333', 'perf(search): cache the query plan'],
			['ddd4444', 'refactor(editor): split the tab store'],
			['eee5555', 'chore(deps): bump mermaid 11.17.2 -> 12.2.0'],
		))).toEqual([
			{ sha: 'aaa1111', subject: 'feat: views section groups (Issue 20)' },
			{ sha: 'bbb2222', subject: 'fix(layout): lower the side panes minimum width' },
			{ sha: 'ccc3333', subject: 'perf(search): cache the query plan' },
			{ sha: 'ddd4444', subject: 'refactor(editor): split the tab store' },
			{ sha: 'eee5555', subject: 'chore(deps): bump mermaid 11.17.2 -> 12.2.0' },
		]);
	});

	it('drops docs, test, ci, style, build and every chore except chore(deps)', () => {
		expect(parseChangelog(log(
			['a000001', 'docs(rail-shell-ux): Issue 21 in progress'],
			['a000002', 'docs: README refresh'],
			['a000003', 'test(e2e): cover the kanban drag'],
			['a000004', 'ci: pin rustc'],
			['a000005', 'style: tabs'],
			['a000006', 'build: bump rolldown'],
			['a000007', 'chore: bump version to 4.0.0-beta.2'],
			['a000008', 'chore(relay-lite): commit regenerated ts-rs bindings'],
			['a000009', 'chore(deps-dev): bump vitest from 4.1.12 to 5.0.5'],
		))).toEqual([]);
	});

	it('keeps subjects without a conventional prefix and breaking-change markers', () => {
		expect(parseChangelog(log(
			['f000001', 'Revert "feat: views section groups"'],
			['f000002', 'feat(api)!: rename kb.pages'],
			['f000003', 'docs!: drop the old guide'],
		))).toEqual([
			{ sha: 'f000001', subject: 'Revert "feat: views section groups"' },
			{ sha: 'f000002', subject: 'feat(api)!: rename kb.pages' },
		]);
	});

	it('keeps tabs that are part of the subject', () => {
		expect(parseChangelog('abc1234\tfix: a\tb')).toEqual([{ sha: 'abc1234', subject: 'fix: a\tb' }]);
	});

	it('skips lines without a tab', () => {
		expect(parseChangelog('fatal: bad revision\nabc1234\tfix: a')).toEqual([{ sha: 'abc1234', subject: 'fix: a' }]);
	});

	it('returns an empty list for empty output', () => {
		expect(parseChangelog('')).toEqual([]);
		expect(parseChangelog('\n')).toEqual([]);
	});
});

describe('changelogBaseCommand', () => {
	let repo: string;
	/**
	 * Git environment pinned to the scratch repo. An inherited GIT_DIR (set
	 * inside git hooks) would send the commits and `tag -d` to the real repo.
	 */
	const env: NodeJS.ProcessEnv = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
	delete env.GIT_DIR;
	delete env.GIT_WORK_TREE;
	delete env.GIT_INDEX_FILE;
	/** Runs a shell command in the scratch repo and returns its trimmed stdout. */
	const run = (command: string) => execSync(command, { cwd: repo, env, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
	const git = (args: string) =>
		run(`git -c user.name=t -c user.email=t@t -c commit.gpgsign=false -c tag.gpgsign=false -c core.hooksPath=/dev/null ${args}`);
	const commit = () => git('commit -q --allow-empty -m c');
	const base = (pkgVersion: string) => run(changelogBaseCommand(pkgVersion));

	beforeAll(() => {
		repo = mkdtempSync(join(tmpdir(), 'changelog-base-'));
		git('init -q');
		commit();
		git('tag 3.0.12');
		commit();
		git('tag 4.0.0-beta.1');
		commit();
		git('tag nightly');
		commit();
	});

	afterAll(() => rmSync(repo, { recursive: true, force: true }));

	it('picks the prerelease tag a nightly builds on, never the moving nightly tag', () => {
		expect(base('4.0.0-beta.1')).toBe('4.0.0-beta.1');
	});

	it('picks the previous tag for a prerelease built on its own tag', () => {
		git('tag 4.0.0-beta.2');
		try {
			expect(base('4.0.0-beta.2')).toBe('4.0.0-beta.1');
		} finally {
			git('tag -d 4.0.0-beta.2');
		}
	});

	it('picks the previous stable for a stable release, skipping its prereleases', () => {
		git('tag 4.0.0');
		try {
			expect(base('4.0.0')).toBe('3.0.12');
		} finally {
			git('tag -d 4.0.0');
		}
	});
});
