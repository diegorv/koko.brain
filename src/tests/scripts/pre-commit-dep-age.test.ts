import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const HOOK = resolve('scripts/pre-commit-dep-age.sh');
const DAY_MS = 86_400_000;

/** ISO timestamp `days` days before now, in the format the registry returns. */
function daysAgo(days: number): string {
	return new Date(Date.now() - days * DAY_MS).toISOString();
}

const WORKSPACE_YAML = `minimumReleaseAge: 7200
minimumReleaseAgeExclude:
  - '@tauri-apps/*'
`;

/** Lockfile the scratch repo starts from: one old unscoped and one old scoped package. */
const BASE_LOCK = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true

overrides:
  undici: ^8.10.2

importers:

  .:
    dependencies:
      dompurify:
        specifier: ^3.4.15
        version: 3.4.15

packages:

  '@lezer/common@1.5.2':
    resolution: {integrity: sha512-a}

  dompurify@3.4.15:
    resolution: {integrity: sha512-b}

snapshots:

  '@lezer/common@1.5.2': {}

  dompurify@3.4.15: {}
`;

let repo: string;
let npmLog: string;

/** Run a git command inside the scratch repo, isolated from the user's global hooks and signing. */
function git(...args: string[]) {
	const res = spawnSync(
		'git',
		['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args],
		{ cwd: repo, encoding: 'utf8' },
	);
	if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
}

/**
 * Install a fake `npm` that answers `npm view <pkg> time --json` from `registry`
 * and logs every queried package name, so tests can assert what was looked up.
 */
function fakeNpm(registry: Record<string, Record<string, string>>) {
	const bin = join(repo, '.bin');
	mkdirSync(bin, { recursive: true });
	// Pretty-printed like the real `npm view --json`: the hook greps one
	// `"version": "date"` pair per line.
	const cases = Object.entries(registry)
		.map(([name, times]) => `\t'${name}') echo '${JSON.stringify(times, null, 2)}' ;;`)
		.join('\n');
	writeFileSync(
		join(bin, 'npm'),
		`#!/usr/bin/env bash\necho "$2" >> '${npmLog}'\ncase "$2" in\n${cases}\n\t*) exit 1 ;;\nesac\n`,
	);
	chmodSync(join(bin, 'npm'), 0o755);
	return bin;
}

/** Stage `lock` as pnpm-lock.yaml and run the hook with the fake registry on PATH. */
function runHook(lock: string, registry: Record<string, Record<string, string>>) {
	writeFileSync(join(repo, 'pnpm-lock.yaml'), lock);
	git('add', 'pnpm-lock.yaml');
	const bin = fakeNpm(registry);
	const res = spawnSync('bash', [HOOK], {
		cwd: repo,
		encoding: 'utf8',
		env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
	});
	let queried: string[] = [];
	try {
		queried = readFileSync(npmLog, 'utf8').trim().split('\n').filter(Boolean);
	} catch {
		// No npm call was made.
	}
	return { status: res.status, out: `${res.stdout}${res.stderr}`, queried };
}

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'dep-age-'));
	npmLog = join(repo, 'npm-calls.log');
	git('init', '-q');
	git('config', 'user.email', 'test@example.com');
	git('config', 'user.name', 'test');
	writeFileSync(join(repo, 'pnpm-workspace.yaml'), WORKSPACE_YAML);
	writeFileSync(join(repo, 'pnpm-lock.yaml'), BASE_LOCK);
	git('add', '.');
	git('commit', '-q', '-m', 'base');
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe('pre-commit-dep-age.sh', () => {
	it('blocks a young unscoped package written as a bare lockfile key', () => {
		// The bug this guards: pnpm quotes only `@scope/...` keys, and the hook
		// matched `^+  '` alone, so every unscoped bump (dompurify, vite, katex)
		// skipped the age check entirely.
		const lock = BASE_LOCK.replaceAll('dompurify@3.4.15', 'dompurify@3.4.16');
		const { status, out, queried } = runHook(lock, { dompurify: { '3.4.16': daysAgo(2) } });

		expect(status).toBe(1);
		expect(out).toContain('BLOCKED');
		expect(out).toContain('dompurify@3.4.16');
		expect(queried).toEqual(['dompurify']);
	});

	it('blocks a young scoped package written as a quoted lockfile key', () => {
		const lock = BASE_LOCK.replaceAll('@lezer/common@1.5.2', '@lezer/common@1.5.3');
		const { status, out } = runHook(lock, { '@lezer/common': { '1.5.3': daysAgo(1) } });

		expect(status).toBe(1);
		expect(out).toContain('@lezer/common@1.5.3');
	});

	it('strips the peer-dependency suffix from a bare key', () => {
		const lock = BASE_LOCK.replace(
			'snapshots:\n',
			'snapshots:\n\n  vite@8.3.2(@types/node@26.6.4): {}\n',
		);
		const { status, out, queried } = runHook(lock, { vite: { '8.3.2': daysAgo(3) } });

		expect(status).toBe(1);
		expect(out).toContain('vite@8.3.2 (published 3 day(s) ago');
		expect(queried).toEqual(['vite']);
	});

	it('passes when every new version is past the quarantine', () => {
		const lock = BASE_LOCK.replaceAll('dompurify@3.4.15', 'dompurify@3.4.16').replaceAll(
			'@lezer/common@1.5.2',
			'@lezer/common@1.5.3',
		);
		const { status, out } = runHook(lock, {
			dompurify: { '3.4.16': daysAgo(17) },
			'@lezer/common': { '1.5.3': daysAgo(16) },
		});

		expect(status).toBe(0);
		expect(out).toContain('2 package(s) checked, all passed');
	});

	it('treats the quarantine as 5 days: 6 days passes, 4 days blocks', () => {
		const lock = BASE_LOCK.replaceAll('dompurify@3.4.15', 'dompurify@3.4.16').replaceAll(
			'@lezer/common@1.5.2',
			'@lezer/common@1.5.3',
		);
		const { status, out } = runHook(lock, {
			dompurify: { '3.4.16': daysAgo(6) },
			'@lezer/common': { '1.5.3': daysAgo(4) },
		});

		expect(status).not.toBe(0);
		expect(out).toContain('fail the 5-day quarantine');
		expect(out).toContain('@lezer/common@1.5.3 (published 4 day(s) ago');
		expect(out).not.toContain('dompurify@3.4.16 (published');
	});

	it('skips packages matched by the workspace exclude list', () => {
		const lock = BASE_LOCK.replace(
			'snapshots:\n',
			"snapshots:\n\n  '@tauri-apps/api@2.12.2': {}\n",
		);
		const { status, queried } = runHook(lock, { '@tauri-apps/api': { '2.12.2': daysAgo(1) } });

		expect(status).toBe(0);
		expect(queried).toEqual([]);
	});

	it('skips a bare key listed in .dep-age-allowlist', () => {
		writeFileSync(join(repo, '.dep-age-allowlist'), 'dompurify@3.4.16  # emergency patch\n');
		const lock = BASE_LOCK.replaceAll('dompurify@3.4.15', 'dompurify@3.4.16');
		const { status, queried } = runHook(lock, { dompurify: { '3.4.16': daysAgo(1) } });

		expect(status).toBe(0);
		expect(queried).toEqual([]);
	});

	it('ignores settings, overrides and importer lines', () => {
		const lock = BASE_LOCK.replace('autoInstallPeers: true', 'autoInstallPeers: false')
			.replace('undici: ^8.10.2', 'undici: ^8.11.2')
			.replace('specifier: ^3.4.15', 'specifier: ^3.4.14');
		const { status, out, queried } = runHook(lock, {});

		expect(status).toBe(0);
		expect(out).toBe('');
		expect(queried).toEqual([]);
	});

	it('exits quietly when pnpm-lock.yaml is not staged', () => {
		writeFileSync(join(repo, 'other.txt'), 'x');
		git('add', 'other.txt');
		const bin = fakeNpm({});
		const res = spawnSync('bash', [HOOK], {
			cwd: repo,
			encoding: 'utf8',
			env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
		});

		expect(res.status).toBe(0);
		expect(res.stdout).toBe('');
	});

	it('warns and skips a package the registry cannot answer for', () => {
		const lock = BASE_LOCK.replaceAll('dompurify@3.4.15', 'dompurify@3.4.16');
		const { status, out } = runHook(lock, {});

		expect(status).toBe(0);
		expect(out).toContain('Could not query registry for dompurify');
	});
});
