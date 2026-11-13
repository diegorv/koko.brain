import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';

const script = resolve('scripts/install-frontend-deps-ci.sh');
let scratch: string;

beforeEach(() => {
	scratch = mkdtempSync(join(tmpdir(), 'mod-core-auth-'));
	writeFileSync(join(scratch, 'gitconfig'), '[http "https://github.com/"]\n\textraheader = checkout-header\n');
});

afterEach(() => {
	rmSync(scratch, { recursive: true, force: true });
});

function run(token: string) {
	return spawnSync('bash', [script], {
		cwd: scratch,
		encoding: 'utf8',
		env: {
			...process.env,
			PATH: `${scratch}:${process.env.PATH}`,
			GIT_CONFIG_NOSYSTEM: '1',
			GIT_CONFIG_GLOBAL: join(scratch, 'gitconfig'),
			GIT_ASKPASS: '/usr/bin/false',
			MODS_REPO_READ_TOKEN: token,
		},
	});
}

it('refuses installation without the dedicated read credential', () => {
	const result = run('');
	expect(result.status).toBe(1);
	expect(result.stderr).toContain('MODS_REPO_READ_TOKEN');
});

it('scopes Git credentials to the mods repo without persisting them or overriding host authentication', () => {
	// Replace only the package-manager process; exercise Git's real credential matching.
	writeFileSync(join(scratch, 'pnpm'), `#!/bin/bash
set -euo pipefail
test "$*" = 'install --frozen-lockfile'
credential=$(printf 'protocol=https\nhost=github.com\npath=diegorv/koko.brain-mods.git\n\n' | git credential fill)
[[ "$credential" == *'username=x-access-token'* ]]
[[ "$credential" == *"password=$MODS_REPO_READ_TOKEN"* ]]
test -z "$(git config --get-urlmatch http.extraheader https://github.com/diegorv/koko.brain-mods.git)"
test "$(git config --get-urlmatch http.extraheader https://github.com/diegorv/koko.brain.git)" = checkout-header
if printf 'protocol=https\nhost=github.com\npath=diegorv/koko.brain.git\n\n' | git credential fill >/dev/null 2>&1; then
  echo 'Credential escaped its repository scope' >&2
  exit 1
fi
printf 'scope checked\n'
`, { mode: 0o700 });
	const before = readFileSync(join(scratch, 'gitconfig'), 'utf8');
	const result = run('test-only-credential');
	expect(result.stderr).toBe('');
	expect(result.status).toBe(0);
	expect(result.stdout).toBe('scope checked\n');
	expect(readFileSync(join(scratch, 'gitconfig'), 'utf8')).toBe(before);
});
