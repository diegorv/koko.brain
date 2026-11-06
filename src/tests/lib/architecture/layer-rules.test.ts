import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	ADR,
	APP,
	COMPOSITION_ROOTS,
	baselineKey,
	checkBaseline,
	findViolations,
	scanLib,
} from '../../../../scripts/import-graph.mjs';

/**
 * Ratchet for the ADR-0003 layer rules over `src/lib`.
 *
 * Every violation must be in `layer-baseline.json`, and every baseline entry
 * must still match a violation. The baseline only shrinks: there is no
 * auto-update mode, and `node scripts/import-graph.mjs` only prints.
 * Feature->feature imports are allowed while acyclic (feature-cycle.test.ts guards that).
 */

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, 'src/tests/lib/architecture/layer-baseline.json');
const baseline: string[] = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

/**
 * Exact baseline size. Lower it in the same change that deletes stale lines,
 * so a later change cannot swap deleted entries for new ones.
 */
const BASELINE_SIZE = 3;

interface Edge {
	from: string;
	to: string | null;
	spec: string | null;
	kind: string;
	line: number;
}

const { files, edges } = scanLib(ROOT) as { files: string[]; edges: Edge[] };
const violations = findViolations(edges);

/** One synthetic edge, line 7. */
function edge(from: string, to: string | null) {
	return { from, to, line: 7 };
}

/** The rule each synthetic edge breaks, or null. */
function rulesOf(pairs: [string, string | null][]) {
	return pairs.map(([from, to]) => findViolations([edge(from, to)])[0]?.rule ?? null);
}

describe('import graph scanner (sanity)', () => {
	it('sees enough edges and .svelte files that a broken glob cannot pass', () => {
		expect(edges.length).toBeGreaterThan(2000);
		expect(files.filter((f) => f.endsWith('.svelte')).length).toBeGreaterThan(150);
	});

	it('finds no non-literal import() in src/lib (a variable specifier bypasses every rule)', () => {
		const nonLiteral = edges.filter((e) => e.kind === 'dynamic' && e.spec === null).map((e) => `${e.from}:${e.line}`);
		expect(nonLiteral).toEqual([]);
	});
});

describe('layer rules ratchet', () => {
	const { unlisted, stale } = checkBaseline(violations, baseline);

	it('every violation is in the baseline', () => {
		expect(unlisted, unlisted.join('\n\n')).toEqual([]);
	});

	it('every baseline entry still matches a violation', () => {
		expect(stale, stale.join('\n\n')).toEqual([]);
	});

	it('the baseline is sorted, unique, names existing files and never grows', () => {
		expect(baseline).toEqual([...new Set(baseline)].sort());
		const missing = baseline.map((e) => e.split(' -> ')[0]).filter((from) => !existsSync(join(ROOT, from)));
		expect(missing).toEqual([]);
		expect(
			baseline.length,
			'layer-baseline.json only shrinks: lower BASELINE_SIZE to match after deleting lines, never raise it',
		).toBe(BASELINE_SIZE);
	});

	it('a new violation fails with file:line, the rule, the ADR and two fixes', () => {
		const synthetic = findViolations([edge('src/lib/core/vault/x.ts', 'src/lib/features/tags/tags.logic.ts')]);
		const [message] = checkBaseline(synthetic, []).unlisted;
		expect(message).toContain('src/lib/core/vault/x.ts:7 imports src/lib/features/tags/tags.logic.ts');
		expect(message).toContain('core->features rule');
		expect(message).toContain(ADR);
		expect(message).toContain('1. Invert the dependency with a registration API');
		expect(message).toContain('2. Move the code down');
		expect(message).toContain('change only with owner sign-off');
	});

	it('a baseline entry with no matching edge fails and prints the JSON line to delete', () => {
		const entry = 'src/lib/core/vault/x.ts -> src/lib/features/tags/tags.logic.ts';
		const { unlisted, stale } = checkBaseline([], [entry]);
		expect(unlisted).toEqual([]);
		expect(stale).toHaveLength(1);
		expect(stale[0]).toContain('Delete the line containing this entry from src/tests/lib/architecture/layer-baseline.json');
		expect(stale[0]).toContain('lower BASELINE_SIZE');
		expect(stale[0]).toContain(`\t"${entry}"`);
	});
});

describe('findViolations rules', () => {
	it('flags each layer inversion', () => {
		expect(
			rulesOf([
				['src/lib/core/a/a.ts', 'src/lib/features/f/f.ts'],
				['src/lib/core/a/a.ts', 'src/lib/plugins/p/p.ts'],
				['src/lib/features/f/f.ts', 'src/lib/plugins/p/p.ts'],
				['src/lib/utils/u.ts', 'src/lib/core/a/a.ts'],
				['src/lib/utils/u.ts', 'src/lib/utils.ts'],
				['src/lib/types/t.ts', 'src/lib/utils/u.ts'],
				['src/lib/components/ui/b/b.svelte', 'src/lib/core/a/a.ts'],
				['src/lib/plugins/kanban/k.ts', 'src/lib/plugins/calendar/c.ts'],
			]),
		).toEqual([
			'core->features',
			'core->plugins',
			'features->plugins',
			'utils->non-utils',
			'utils->non-utils',
			'types->lib',
			'components/ui->app',
			'plugin->plugin',
		]);
	});

	it('allows the inward direction, packages, feature->feature, contracts and the plugin allowlist', () => {
		expect(
			rulesOf([
				['src/lib/plugins/p/p.ts', 'src/lib/core/a/a.ts'],
				['src/lib/features/f/f.ts', 'src/lib/core/a/a.ts'],
				['src/lib/features/f/f.ts', 'src/lib/features/g/g.ts'],
				['src/lib/core/a/a.ts', 'src/lib/utils/u.ts'],
				['src/lib/utils/u.ts', null],
				['src/lib/utils/u.ts', 'src/lib/contracts/c.ts'],
				['src/lib/types/t.ts', 'src/lib/contracts/c.ts'],
				['src/lib/core/a/a.ts', 'src/lib/contracts/c.ts'],
				['src/lib/plugins/calendar/c.ts', 'src/lib/plugins/periodic-notes/p.ts'],
				['src/lib/plugins/one-on-one/o.ts', 'src/lib/plugins/periodic-notes/p.ts'],
				['src/lib/plugins/quick-capture/q.ts', 'src/lib/plugins/periodic-notes/p.ts'],
				['src/lib/plugins/mods/m.ts', 'src/lib/plugins/queryjs/q.ts'],
				['src/lib/plugins/kanban/a.ts', 'src/lib/plugins/kanban/b.ts'],
			]),
		).toEqual(Array(13).fill(null));
	});

	it('exempts the app layer (the composition root) from the outbound rules', () => {
		expect(
			rulesOf([
				['src/lib/app/AppShell.svelte', 'src/lib/plugins/p/p.ts'],
				['src/lib/app/lifecycle/l.ts', 'src/lib/features/f/f.ts'],
				['src/lib/app/a.ts', 'src/lib/app/lifecycle/l.ts'],
			]),
		).toEqual([null, null, null]);
	});
});

describe('composition root (src/lib/app)', () => {
	it('no file under src/lib outside app/ imports app/ at HEAD (only src/routes may)', () => {
		const inbound = violations.filter((v: { rule: string }) => v.rule === 'app-inbound').map(baselineKey);
		expect(inbound).toEqual([]);
		expect(baseline.filter((e) => e.includes(` -> ${APP}/`))).toEqual([]);
	});

	it('a core, feature or plugin file importing #lib/app/ breaks the app-inbound rule', () => {
		expect(
			rulesOf([
				['src/lib/core/vault/vault.service.ts', 'src/lib/app/boot.ts'],
				['src/lib/features/f/f.ts', 'src/lib/app/AppShell.svelte'],
				['src/lib/plugins/p/p.ts', 'src/lib/app/lifecycle/app-lifecycle.service.ts'],
				['src/lib/utils/u.ts', 'src/lib/app/boot.ts'],
				['src/lib/components/ui/b/b.svelte', 'src/lib/app/boot.ts'],
			]),
		).toEqual(Array(5).fill('app-inbound'));
	});

	it('the scanner resolves a real #lib/app import, so the rule sees it', () => {
		const resolved = edges.filter((e) => e.from.startsWith('src/lib/app/') && e.to?.startsWith('src/lib/app/'));
		expect(resolved.length).toBeGreaterThan(0);
	});

	it('the root list matches the table in ADR-0003 and the app folder exists', () => {
		const adr = readFileSync(join(ROOT, ADR), 'utf8');
		const table = [...adr.matchAll(/^\|\s*`(src\/lib\/[^`]+)`/gm)].map((m) => m[1]).sort();
		expect(table).toEqual([...COMPOSITION_ROOTS].sort());
		expect(COMPOSITION_ROOTS).toEqual([`${APP}/**`]);
		expect(existsSync(join(ROOT, APP))).toBe(true);
	});
});
