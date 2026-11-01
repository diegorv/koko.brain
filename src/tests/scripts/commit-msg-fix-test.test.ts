import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const HOOK = resolve('scripts/commit-msg-fix-test.sh');
const RANGE_CHECK = resolve('scripts/check-fix-has-test.sh');
const SETUP_HOOKS = resolve('scripts/setup-hooks.sh');

let repo: string;

/** Run a git command inside the scratch repo, isolated from the user's global hooks and signing. */
function git(...args: string[]): string {
	const res = spawnSync(
		'git',
		['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args],
		{ cwd: repo, encoding: 'utf8' },
	);
	if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
	return res.stdout.trim();
}

/** Write `content` to `path` (relative to the scratch repo) and stage it. */
function stage(path: string, content = 'x\n') {
	const full = join(repo, path);
	mkdirSync(dirname(full), { recursive: true });
	writeFileSync(full, content);
	git('add', path);
}

/** Run the commit-msg hook on `message` against the current index. */
function runHook(message: string) {
	const msgFile = join(repo, '.git', 'COMMIT_EDITMSG');
	writeFileSync(msgFile, message);
	const res = spawnSync('bash', [HOOK, msgFile], { cwd: repo, encoding: 'utf8' });
	return { status: res.status, out: `${res.stdout}${res.stderr}` };
}

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), 'fix-test-'));
	git('init', '-q');
	git('config', 'user.email', 'test@example.com');
	git('config', 'user.name', 'test');
	stage('README.md', 'base\n');
	git('commit', '-q', '-m', 'base');
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe('commit-msg-fix-test.sh', () => {
	it('rejects a fix: commit that stages only app code and explains the ways out', () => {
		stage('src/lib/x.ts', 'export const x = 1;\n');
		const { status, out } = runHook('fix(editor): stop the cursor jump\n');

		expect(status).toBe(1);
		expect(out).toContain('fix(editor): stop the cursor jump');
		expect(out).toContain('src/lib/x.ts');
		expect(out).toContain('src/tests/');
		expect(out).toContain('Test-Exempt:');
	});

	it.each([
		['fix: a', 'src/lib/a.svelte'],
		['fix!: a', 'src/routes/+page.ts'],
		['fix(x)!: a', 'src/lib/a.js'],
		['fix(rust): a', 'src-tauri/src/vault/index.rs'],
		['fix(build): a', 'src-tauri/build.rs'],
	])('rejects %s touching %s', (subject, path) => {
		stage(path);
		expect(runHook(`${subject}\n`).status).toBe(1);
	});

	it('accepts the fix with a staged src/tests file', () => {
		stage('src/lib/x.ts');
		stage('src/tests/lib/x.test.ts');
		expect(runHook('fix: x\n').status).toBe(0);
	});

	it.each(['src-tauri/tests/x.rs', 'e2e/specs/x.spec.ts'])('accepts the fix with %s', (test) => {
		stage('src-tauri/src/x.rs');
		stage(test);
		expect(runHook('fix: x\n').status).toBe(0);
	});

	it.each(['#[test]', '#[tokio::test(flavor = "multi_thread")]', '#[cfg(test)]'])(
		'accepts the fix with an added %s line in a .rs file',
		(attr) => {
			stage('src-tauri/src/x.rs', `fn a() {}\n\n    ${attr}\nfn t() {}\n`);
			expect(runHook('fix: x\n').status).toBe(0);
		},
	);

	it('does not count a test attribute that was already there', () => {
		stage('src-tauri/src/x.rs', '#[test]\nfn t() {}\n');
		git('commit', '-q', '-m', 'test: t');
		stage('src-tauri/src/x.rs', '#[test]\nfn t() { let _ = 1; }\n');
		expect(runHook('fix: x\n').status).toBe(1);
	});

	it('accepts the fix with a non-empty Test-Exempt trailer', () => {
		stage('src/lib/a.svelte');
		const msg = 'fix(ui): align the icon\n\nCSS only.\n\nTest-Exempt: CSS-only change\n';
		expect(runHook(msg).status).toBe(0);
	});

	it('rejects an empty Test-Exempt trailer', () => {
		stage('src/lib/a.svelte');
		const { status, out } = runHook('fix(ui): align the icon\n\nTest-Exempt:   \n');
		expect(status).toBe(1);
		expect(out).toContain('Test-Exempt:');
	});

	it('reads the subject past leading comment lines', () => {
		stage('src/lib/x.ts');
		expect(runHook('# Please enter the commit message\nfix: x\n').status).toBe(1);
	});

	it.each(['feat: x', 'docs: x', 'refactor: x', 'chore(fix): x', 'fixup! fix: x'])(
		'ignores a %s commit',
		(subject) => {
			stage('src/lib/x.ts');
			expect(runHook(`${subject}\n`).status).toBe(0);
		},
	);

	it('ignores a fix: commit touching only CI, lockfiles and markdown', () => {
		stage('.github/workflows/ci.yml');
		stage('pnpm-lock.yaml');
		stage('src-tauri/Cargo.lock');
		stage('docs/TESTING.md');
		stage('src/app.css');
		expect(runHook('fix(ci): pin the runner\n').status).toBe(0);
	});

	it('skips an empty staged diff', () => {
		const { status, out } = runHook('fix: x\n');
		expect(status).toBe(0);
		expect(out).toBe('');
	});

	it('matches a test file whose path has non-ASCII characters', () => {
		stage('src/lib/x.ts');
		stage('src/tests/café.test.ts');
		expect(runHook('fix: x\n').status).toBe(0);
	});

	it('fails on a missing message file', () => {
		const res = spawnSync('bash', [HOOK], { cwd: repo, encoding: 'utf8' });
		expect(res.status).not.toBe(0);
	});
});

describe('check-fix-has-test.sh', () => {
	/** Stage `paths` and commit them with `message`, returning the new sha. */
	function commit(message: string, ...paths: string[]): string {
		for (const p of paths) stage(p, `${message}\n`);
		git('commit', '-q', '-m', message);
		return git('rev-parse', 'HEAD');
	}

	function runRange(range: string, env: NodeJS.ProcessEnv = {}) {
		const res = spawnSync('bash', [RANGE_CHECK, range], {
			cwd: repo,
			encoding: 'utf8',
			env: { ...process.env, GITHUB_ACTIONS: '', ...env },
		});
		return { status: res.status, out: `${res.stdout}${res.stderr}` };
	}

	it('fails on a range with a violating commit and names only its sha', () => {
		const base = git('rev-parse', 'HEAD');
		const ok = commit('fix: a', 'src/lib/a.ts', 'src/tests/a.test.ts');
		const bad = commit('fix(b): b', 'src/lib/b.ts');
		commit('feat: c', 'src/lib/c.ts');
		const exempt = commit('fix: d\n\nTest-Exempt: CSS only', 'src/lib/d.svelte');

		const { status, out } = runRange(`${base}..HEAD`);

		expect(status).toBe(1);
		expect(out).toContain(bad);
		expect(out).toContain('fix(b): b');
		expect(out).not.toContain(ok);
		expect(out).not.toContain(exempt);
	});

	it('passes a clean range', () => {
		const base = git('rev-parse', 'HEAD');
		commit('fix: a', 'src/lib/a.ts', 'src/tests/a.test.ts');
		commit('docs: b', 'docs/b.md');

		const { status, out } = runRange(`${base}..HEAD`);
		expect(status).toBe(0);
		expect(out).toContain('2 commit(s) checked');
	});

	it('checks a single commit with sha^!, including the root commit', () => {
		rmSync(join(repo, '.git'), { recursive: true, force: true });
		git('init', '-q');
		git('config', 'user.email', 'test@example.com');
		git('config', 'user.name', 'test');
		const root = commit('fix: root', 'src/lib/root.ts');

		const { status, out } = runRange(`${root}^!`);
		expect(status).toBe(1);
		expect(out).toContain(root);
	});

	it('skips merge commits', () => {
		const base = git('rev-parse', 'HEAD');
		git('checkout', '-q', '-b', 'side');
		commit('fix: side', 'src/lib/s.ts', 'src/tests/s.test.ts');
		git('checkout', '-q', '-');
		commit('docs: main', 'docs/m.md');
		git('merge', '-q', '--no-ff', '-m', 'fix: merge side', 'side');

		const { status, out } = runRange(`${base}..HEAD`);
		expect(status).toBe(0);
		expect(out).toContain('2 commit(s) checked');
	});

	it('passes an empty range', () => {
		const { status } = runRange('HEAD..HEAD');
		expect(status).toBe(0);
	});

	it.each([`${'deadbeef'.repeat(5)}..HEAD`, 'no-such-ref'])(
		'fails on a range git cannot resolve (%s)',
		(range) => {
			const { status, out } = runRange(range);
			expect(status).not.toBe(0);
			expect(out).not.toContain('commit(s) checked');
		},
	);

	it('prints a GitHub ::error:: annotation per violation under GITHUB_ACTIONS', () => {
		const base = git('rev-parse', 'HEAD');
		const bad = commit('fix(b): b', 'src/lib/b.ts');

		const { status, out } = runRange(`${base}..HEAD`, { GITHUB_ACTIONS: 'true' });
		expect(status).toBe(1);
		expect(out).toContain(`::error::fix commit without a test: ${bad} fix(b): b`);
	});

	it('prints no ::error:: annotation outside GitHub Actions', () => {
		const base = git('rev-parse', 'HEAD');
		commit('fix(b): b', 'src/lib/b.ts');

		const { status, out } = runRange(`${base}..HEAD`);
		expect(status).toBe(1);
		expect(out).not.toContain('::error::');
	});
});

describe('setup-hooks.sh', () => {
	it('installs both hooks into the common hooks dir when run from a linked worktree', () => {
		const wt = join(repo, '..', `${basename(repo)}-wt`);
		git('worktree', 'add', '-q', wt);
		try {
			const res = spawnSync('bash', [SETUP_HOOKS], { cwd: wt, encoding: 'utf8' });
			expect(res.status).toBe(0);

			const hooks = join(repo, '.git', 'hooks');
			expect(readlinkSync(join(hooks, 'pre-commit'))).toBe('../../scripts/pre-commit-dep-age.sh');
			expect(readlinkSync(join(hooks, 'commit-msg'))).toBe('../../scripts/commit-msg-fix-test.sh');
		} finally {
			rmSync(wt, { recursive: true, force: true });
		}
	});
});
