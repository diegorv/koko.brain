import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type * as App from '#lib/plugins/mods/contract/mod-api.v1.js';

import type * as Doc from '../../../help/examples/mods/kokobrain-mod.js';

/**
 * Pins the stable part of `help/examples/mods/kokobrain-mod.d.ts`, the
 * standalone declarations a mod author copies next to `main.js`, to the
 * contract the app is built against. The type assertions are compile-time:
 * `pnpm check` fails when a `...V1` type of the file and of the contract
 * differ in any member, optional flag or signature. The runtime cases fail
 * when either side gains or loses an exported type.
 *
 * The `labs`, `app` and `kb` parts of the file are hand-written and
 * deliberately loose; nothing here checks them.
 */

const DTS = join(process.cwd(), 'help/examples/mods/kokobrain-mod.d.ts');

/** Every exported type of contract v1, each asserted equal below */
const STABLE_TYPES = [
	'ModInfoV1',
	'ModNotifyKindV1',
	'ModNotifyOptionsV1',
	'ModActionInputV1',
	'ModRunV1',
	'ModActionV1',
	'ModRailButtonV1',
	'ModVaultEntryV1',
	'ModPropertyV1',
	'ModVaultV1',
	'ModWorkspaceV1',
	'ModAlertOptionsV1',
	'ModConfirmOptionsV1',
	'ModPromptOptionsV1',
	'ModLoadingOptionsV1',
	'ModUiV1',
	'ModThemeColorsV1',
	'ModThemeStateV1',
	'ModThemeV1',
	'ModDataCorruptErrorV1',
	'ModContextV1',
	'ModV1',
];

/** Names of the `export interface` / `export type` declarations in a source text */
function exportedTypes(source: string): string[] {
	return [...source.matchAll(/^export (?:interface|type) (\w+)/gm)].map((m) => m[1]).sort();
}

describe('help/examples/mods/kokobrain-mod.d.ts', () => {
	it('declares every type of the contract the app is built against, and no other ...V1 type', () => {
		const contractFile = createRequire(import.meta.url).resolve('@kokobrain/mod-core/contract');
		const contract = exportedTypes(readFileSync(contractFile, 'utf8'));
		const stableInDoc = exportedTypes(readFileSync(DTS, 'utf8')).filter((name) => name.endsWith('V1'));

		expect(contract).toEqual([...STABLE_TYPES].sort());
		expect(stableInDoc).toEqual([...STABLE_TYPES].sort());
	});

	it('is standalone: no import, no export from another file', () => {
		const text = readFileSync(DTS, 'utf8');
		expect(text).not.toMatch(/^\s*import\b/m);
		expect(text).not.toMatch(/^export\s.*\bfrom\s/m);
	});

	it('has the identity and notify types of the contract', () => {
		expectTypeOf<Doc.ModInfoV1>().toEqualTypeOf<App.ModInfoV1>();
		expectTypeOf<Doc.ModNotifyKindV1>().toEqualTypeOf<App.ModNotifyKindV1>();
		expectTypeOf<Doc.ModNotifyOptionsV1>().toEqualTypeOf<App.ModNotifyOptionsV1>();
	});

	it('has the action, run and rail button types of the contract', () => {
		expectTypeOf<Doc.ModActionInputV1>().toEqualTypeOf<App.ModActionInputV1>();
		expectTypeOf<Doc.ModRunV1>().toEqualTypeOf<App.ModRunV1>();
		expectTypeOf<Doc.ModActionV1>().toEqualTypeOf<App.ModActionV1>();
		expectTypeOf<Doc.ModRailButtonV1>().toEqualTypeOf<App.ModRailButtonV1>();
	});

	it('has the vault and workspace types of the contract', () => {
		expectTypeOf<Doc.ModVaultEntryV1>().toEqualTypeOf<App.ModVaultEntryV1>();
		expectTypeOf<Doc.ModPropertyV1>().toEqualTypeOf<App.ModPropertyV1>();
		expectTypeOf<Doc.ModVaultV1>().toEqualTypeOf<App.ModVaultV1>();
		expectTypeOf<Doc.ModWorkspaceV1>().toEqualTypeOf<App.ModWorkspaceV1>();
	});

	it('has the dialog types of the contract', () => {
		expectTypeOf<Doc.ModAlertOptionsV1>().toEqualTypeOf<App.ModAlertOptionsV1>();
		expectTypeOf<Doc.ModConfirmOptionsV1>().toEqualTypeOf<App.ModConfirmOptionsV1>();
		expectTypeOf<Doc.ModPromptOptionsV1>().toEqualTypeOf<App.ModPromptOptionsV1>();
		expectTypeOf<Doc.ModLoadingOptionsV1>().toEqualTypeOf<App.ModLoadingOptionsV1>();
		expectTypeOf<Doc.ModUiV1>().toEqualTypeOf<App.ModUiV1>();
		// The generic members, compared through their option types too.
		expectTypeOf<Parameters<Doc.ModUiV1['pick']>[0]>().toEqualTypeOf<Parameters<App.ModUiV1['pick']>[0]>();
		expectTypeOf<Parameters<Doc.ModUiV1['loading']>>().toEqualTypeOf<Parameters<App.ModUiV1['loading']>>();
	});

	it('has the theme types of the contract', () => {
		expectTypeOf<Doc.ModThemeColorsV1>().toEqualTypeOf<App.ModThemeColorsV1>();
		expectTypeOf<Doc.ModThemeStateV1>().toEqualTypeOf<App.ModThemeStateV1>();
		expectTypeOf<Doc.ModThemeV1>().toEqualTypeOf<App.ModThemeV1>();
	});

	it('has the data, context and mod types of the contract', () => {
		expectTypeOf<Doc.ModDataCorruptErrorV1>().toEqualTypeOf<App.ModDataCorruptErrorV1>();
		expectTypeOf<Doc.ModContextV1>().toEqualTypeOf<App.ModContextV1>();
		expectTypeOf<Parameters<Doc.ModContextV1['watch']>>().toEqualTypeOf<Parameters<App.ModContextV1['watch']>>();
		expectTypeOf<Doc.ModV1>().toEqualTypeOf<App.ModV1>();
	});

	it('gives the full context everything of the stable one, so a stable mod body type-checks as a full mod', () => {
		expectTypeOf<Doc.ModContext>().toExtend<App.ModContextV1>();
		expectTypeOf<Doc.ModV1>().toExtend<{ onload: (ctx: Doc.ModContext) => unknown }>();
	});
});
