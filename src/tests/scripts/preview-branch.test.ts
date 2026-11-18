import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve('scripts/preview-branch.sh');

let scratch: string;
let remote: string;
let dev: string;
let ci: string;

/** Environment with no user-level git config, so the script's own identity is the only one. */
function isolatedEnv(extra: Record<string, string> = {}) {
	const env: NodeJS.ProcessEnv = { ...process.env };
	for (const key of Object.keys(env)) {
		if (key.startsWith('GIT_')) delete env[key];
	}
	return {
		...env,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CONFIG_GLOBAL: join(scratch, 'gitconfig'),
		...extra,
	};
}

/** Run git in `cwd` as a test author, isolated from global hooks, signing and config. */
function git(cwd: string, ...args: string[]): string {
	const res = spawnSync(
		'git',
		['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=dev', '-c', 'user.email=dev@example.com', ...args],
		{ cwd, encoding: 'utf8', env: isolatedEnv() },
	);
	if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
	return res.stdout.trim();
}

/** Commit `content` to `path` in the `cwd` clone and push the current branch. */
function commitAndPush(cwd: string, path: string, content: string, message: string) {
	const full = join(cwd, path);
	mkdirSync(dirname(full), { recursive: true });
	writeFileSync(full, content);
	git(cwd, 'add', path);
	git(cwd, 'commit', '-q', '-m', message);
	git(cwd, 'push', '-q', 'origin', 'HEAD');
}

/** Run the script in the CI clone after refreshing its remote-tracking refs. */
function run(command: string, extraEnv: Record<string, string> = {}) {
	git(ci, 'fetch', '-q', 'origin');
	const res = spawnSync('bash', [SCRIPT, command], {
		cwd: ci,
		encoding: 'utf8',
		env: isolatedEnv({ ...extraEnv, GIT_CONFIG_PARAMETERS: "'core.hooksPath=/dev/null' 'commit.gpgsign=false'" }),
	});
	return { status: res.status, stdout: res.stdout, out: `${res.stdout}${res.stderr}` };
}

/** Sha of `ref` on the bare remote. */
function remoteSha(ref: string): string {
	return git(remote, 'rev-parse', ref);
}

beforeEach(() => {
	scratch = mkdtempSync(join(tmpdir(), 'preview-branch-'));
	writeFileSync(join(scratch, 'gitconfig'), '');
	remote = join(scratch, 'origin.git');
	dev = join(scratch, 'dev');
	ci = join(scratch, 'ci');
	git(scratch, 'init', '-q', '--bare', '-b', 'main', remote);
	git(scratch, 'clone', '-q', remote, dev);
	commitAndPush(dev, 'README.md', 'base\n', 'base');
	git(dev, 'push', '-q', 'origin', 'HEAD:refs/heads/preview');
	git(scratch, 'clone', '-q', '-b', 'preview', remote, ci);
});

afterEach(() => {
	rmSync(scratch, { recursive: true, force: true });
});

describe('preview-branch.sh sync', () => {
	it('merges origin/main into preview with --no-ff as the bot and pushes it', () => {
		commitAndPush(dev, 'a.txt', 'a\n', 'feat: a');
		const mainSha = remoteSha('main');
		const before = remoteSha('preview');
		const outputFile = join(scratch, 'github-output');
		writeFileSync(outputFile, '');

		const { status, out } = run('sync', { GITHUB_OUTPUT: outputFile });

		expect(status, out).toBe(0);
		const after = remoteSha('preview');
		expect(git(remote, 'rev-parse', `${after}^1`)).toBe(before);
		expect(git(remote, 'rev-parse', `${after}^2`)).toBe(mainSha);
		expect(git(remote, 'log', '-1', '--format=%s', after)).toBe(`Merge main ${mainSha.slice(0, 7)} into preview`);
		expect(git(remote, 'log', '-1', '--format=%an <%ae>|%cn <%ce>', after)).toBe(
			'github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>|github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>',
		);
		expect(readFileSync(outputFile, 'utf8')).toBe(`sha=${after}\n`);
	});

	it('keeps preview-only commits and never rewrites preview', () => {
		git(ci, 'checkout', '-q', '-b', 'feature');
		commitAndPush(ci, 'feature.txt', 'f\n', 'feat: feature');
		git(ci, 'checkout', '-q', 'preview');
		git(ci, 'merge', '-q', '--no-ff', '-m', "Merge branch 'feature' into preview", 'feature');
		git(ci, 'push', '-q', 'origin', 'preview');
		const previewHead = remoteSha('preview');
		commitAndPush(dev, 'a.txt', 'a\n', 'feat: a');

		const { status, out } = run('sync');

		expect(status, out).toBe(0);
		expect(git(remote, 'rev-parse', `preview^1`)).toBe(previewHead);
		expect(git(remote, 'show', 'preview:feature.txt')).toBe('f');
		expect(git(remote, 'show', 'preview:a.txt')).toBe('a');
	});

	it('skips the merge and the push when origin/main is already in preview', () => {
		commitAndPush(dev, 'a.txt', 'a\n', 'feat: a');
		expect(run('sync').status).toBe(0);
		const synced = remoteSha('preview');
		const outputFile = join(scratch, 'github-output');
		writeFileSync(outputFile, '');

		const { status, out } = run('sync', { GITHUB_OUTPUT: outputFile });

		expect(status, out).toBe(0);
		expect(out).toContain('already');
		expect(remoteSha('preview')).toBe(synced);
		expect(git(ci, 'rev-parse', 'HEAD')).toBe(synced);
		expect(readFileSync(outputFile, 'utf8')).toBe(`sha=${synced}\n`);
	});

	it('on a conflict aborts, leaves preview untouched and names the files and the manual commands', () => {
		commitAndPush(ci, 'README.md', 'preview side\n', 'feat: preview change');
		commitAndPush(dev, 'README.md', 'main side\n', 'feat: main change');
		const before = remoteSha('preview');

		const { status, out } = run('sync');

		expect(status).toBe(1);
		const errorLine = out.split('\n').find((line) => line.startsWith('::error::'));
		expect(errorLine).toBeDefined();
		expect(errorLine).toContain('README.md');
		// A bare `git checkout preview` without a local branch detaches at the same-named tag.
		expect(errorLine).toContain(
			'git fetch origin && git checkout -B preview origin/preview && git merge origin/main'
		);
		// The `preview` tag shares the branch's name, so a bare `git push origin preview` is ambiguous.
		expect(errorLine).toContain('git push origin HEAD:refs/heads/preview');
		expect(remoteSha('preview')).toBe(before);
		expect(git(ci, 'rev-parse', 'HEAD')).toBe(before);
		expect(git(ci, 'status', '--porcelain')).toBe('');
	});
});

describe('preview-branch.sh merged', () => {
	it('lists the branches merged into preview, without the merges of main', () => {
		git(ci, 'checkout', '-q', '-b', 'feature');
		commitAndPush(ci, 'feature.txt', 'f\n', 'feat: feature');
		git(ci, 'checkout', '-q', 'preview');
		git(ci, 'merge', '-q', '--no-ff', '-m', "Merge branch 'feature' into preview", 'feature');
		git(ci, 'push', '-q', 'origin', 'preview');
		commitAndPush(dev, 'a.txt', 'a\n', 'feat: a');
		expect(run('sync').status).toBe(0);
		commitAndPush(dev, 'b.txt', 'b\n', 'feat: b');
		git(ci, 'fetch', '-q', 'origin');
		git(ci, 'merge', '-q', '--ff-only', 'origin/preview');
		git(ci, 'merge', '-q', '--no-ff', '-m', "Merge remote-tracking branch 'origin/main' into preview", 'origin/main');
		commitAndPush(ci, 'c.txt', 'c\n', 'fix: direct preview commit');

		const { status, stdout } = run('merged');

		expect(status).toBe(0);
		expect(stdout).toBe("Merge branch 'feature' into preview\n");
	});

	it('prints nothing when preview holds only main', () => {
		commitAndPush(dev, 'a.txt', 'a\n', 'feat: a');
		expect(run('sync').status).toBe(0);
		git(ci, 'fetch', '-q', 'origin');
		git(ci, 'merge', '-q', '--ff-only', 'origin/preview');

		const { status, stdout } = run('merged');

		expect(status).toBe(0);
		expect(stdout).toBe('');
	});
});

it('rejects an unknown command', () => {
	const { status, out } = run('nope');
	expect(status).toBe(2);
	expect(out).toContain('Usage');
});
