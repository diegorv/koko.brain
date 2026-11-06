// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import type {
	ModActionInputV1,
	ModActionV1,
	ModAlertOptionsV1,
	ModConfirmOptionsV1,
	ModContextV1,
	ModInfoV1,
	ModLoadingOptionsV1,
	ModPromptOptionsV1,
	ModRailButtonV1,
	ModRunV1,
	ModThemeColorsV1,
	ModThemeStateV1,
	ModThemeV1,
	ModUiV1,
	ModV1,
	ModVaultEntryV1,
	ModVaultV1,
	ModWorkspaceV1,
} from '#lib/plugins/mods/contract/mod-api.v1.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { createModContext, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';

/**
 * Freezes the mod-visible surface of the vault mods API (contract v1, see
 * `contract/mod-api.v1.ts`). A failure here means mods see a different API:
 * either restore the member, or follow the compatibility rule in the
 * contract's header and bump `apiVersion`.
 *
 * Each `*_PUBLIC` object is checked against its contract interface with
 * `satisfies Record<keyof X, true>`, so `pnpm check` fails when the list and
 * the contract drift; the runtime assertions fail when the host drifts.
 */

const CONTEXT_PUBLIC = {
	apiVersion: true,
	mod: true,
	signal: true,
	register: true,
	notify: true,
	log: true,
	addAction: true,
	addRailButton: true,
	vault: true,
	workspace: true,
	ui: true,
	theme: true,
	loadData: true,
	saveData: true,
} satisfies Record<keyof ModContextV1, true>;

/** Raw access the host adds on top of the contract (`ModContext` in the host); unstable, not frozen */
const HOST_UNSTABLE = ['app', 'kb'] satisfies Exclude<keyof ModContext, keyof ModContextV1>[];

const VAULT_PUBLIC = {
	read: true,
	exists: true,
	list: true,
	create: true,
	write: true,
} satisfies Record<keyof ModVaultV1, true>;

const VAULT_ENTRY_PUBLIC = {
	name: true,
	path: true,
	isFolder: true,
} satisfies Record<keyof ModVaultEntryV1, true>;

const WORKSPACE_PUBLIC = {
	openNote: true,
} satisfies Record<keyof ModWorkspaceV1, true>;

const UI_PUBLIC = {
	alert: true,
	confirm: true,
	prompt: true,
	loading: true,
} satisfies Record<keyof ModUiV1, true>;

const ALERT_OPTIONS_PUBLIC = {
	title: true,
	message: true,
	kind: true,
} satisfies Record<keyof ModAlertOptionsV1, true>;

const CONFIRM_OPTIONS_PUBLIC = {
	title: true,
	message: true,
	confirmLabel: true,
	cancelLabel: true,
	destructive: true,
} satisfies Record<keyof ModConfirmOptionsV1, true>;

const PROMPT_OPTIONS_PUBLIC = {
	title: true,
	message: true,
	label: true,
	placeholder: true,
	value: true,
	multiline: true,
} satisfies Record<keyof ModPromptOptionsV1, true>;

const LOADING_OPTIONS_PUBLIC = {
	cancellable: true,
} satisfies Record<keyof ModLoadingOptionsV1, true>;

const THEME_PUBLIC = {
	current: true,
	onChange: true,
} satisfies Record<keyof ModThemeV1, true>;

const THEME_STATE_PUBLIC = {
	mode: true,
	colors: true,
} satisfies Record<keyof ModThemeStateV1, true>;

/** The color keys; `mod-theme.test.ts` pins their CSS variables */
const THEME_COLORS_PUBLIC = {
	background: true,
	foreground: true,
	card: true,
	cardForeground: true,
	popover: true,
	popoverForeground: true,
	primary: true,
	primaryForeground: true,
	secondary: true,
	secondaryForeground: true,
	muted: true,
	mutedForeground: true,
	accent: true,
	accentForeground: true,
	destructive: true,
	destructiveForeground: true,
	border: true,
	input: true,
	ring: true,
	divider: true,
} satisfies Record<keyof ModThemeColorsV1, true>;

const ACTION_PUBLIC = {
	id: true,
	title: true,
	description: true,
	input: true,
	run: true,
} satisfies Record<keyof ModActionV1, true>;

const RUN_PUBLIC = {
	signal: true,
	log: true,
	progress: true,
} satisfies Record<keyof ModRunV1, true>;

const ACTION_INPUT_PUBLIC = {
	placeholder: true,
} satisfies Record<keyof ModActionInputV1, true>;

const RAIL_BUTTON_PUBLIC = {
	id: true,
	title: true,
	icon: true,
	actions: true,
} satisfies Record<keyof ModRailButtonV1, true>;

const MOD_INFO_PUBLIC = {
	id: true,
	name: true,
	version: true,
	dir: true,
} satisfies Record<keyof ModInfoV1, true>;

const MOD_PUBLIC = {
	onload: true,
	onunload: true,
} satisfies Record<keyof ModV1, true>;

function makeContext(): ModContextV1 {
	return createModContext({ id: 'hello', name: 'Hello', version: '1.0.0' }, '/vault', {
		controller: new AbortController(),
		disposers: [],
		runs: new Set(),
		unloaded: false,
	});
}

describe('mod API contract v1', () => {
	beforeEach(() => {
		vaultStore._reset();
		railRegistryStore.reset();
		modPickerStore.reset();
		modsRunsStore.reset();
	});

	it('ctx exposes exactly the contract members, plus the unstable host members app and kb', () => {
		expect(Object.keys(makeContext()).sort()).toEqual([...Object.keys(CONTEXT_PUBLIC), ...HOST_UNSTABLE].sort());
	});

	it('app and kb stay out of the contract', () => {
		expect(Object.keys(CONTEXT_PUBLIC)).not.toEqual(expect.arrayContaining(['app']));
		expect(Object.keys(CONTEXT_PUBLIC)).not.toEqual(expect.arrayContaining(['kb']));
	});

	it('ctx.mod exposes exactly the contract members', () => {
		expect(Object.keys(makeContext().mod).sort()).toEqual(Object.keys(MOD_INFO_PUBLIC).sort());
	});

	it('ctx.vault exposes exactly the contract members', () => {
		expect(Object.keys(makeContext().vault).sort()).toEqual(Object.keys(VAULT_PUBLIC).sort());
	});

	it('ctx.workspace exposes exactly the contract members', () => {
		expect(Object.keys(makeContext().workspace).sort()).toEqual(Object.keys(WORKSPACE_PUBLIC).sort());
	});

	it('ctx.ui exposes exactly the contract members', () => {
		expect(Object.keys(makeContext().ui).sort()).toEqual(Object.keys(UI_PUBLIC).sort());
	});

	it('the dialog options are the contract fields', () => {
		expect(Object.keys(ALERT_OPTIONS_PUBLIC).sort()).toEqual(['kind', 'message', 'title']);
		expect(Object.keys(CONFIRM_OPTIONS_PUBLIC).sort()).toEqual(['cancelLabel', 'confirmLabel', 'destructive', 'message', 'title']);
		expect(Object.keys(PROMPT_OPTIONS_PUBLIC).sort()).toEqual(['label', 'message', 'multiline', 'placeholder', 'title', 'value']);
		expect(Object.keys(LOADING_OPTIONS_PUBLIC)).toEqual(['cancellable']);
	});

	it('ctx.theme exposes exactly the contract members, and current is mode plus every contract color', () => {
		vaultStore.open('/vault');
		const { theme } = makeContext();
		expect(Object.keys(theme).sort()).toEqual(Object.keys(THEME_PUBLIC).sort());
		expect(Object.keys(theme.current).sort()).toEqual(Object.keys(THEME_STATE_PUBLIC).sort());
		expect(Object.keys(theme.current.colors).sort()).toEqual(Object.keys(THEME_COLORS_PUBLIC).sort());
	});

	it('a vault list entry is name, path and isFolder', () => {
		expect(Object.keys(VAULT_ENTRY_PUBLIC).sort()).toEqual(['isFolder', 'name', 'path']);
	});

	it('ctx reports API version 1', () => {
		expect(makeContext().apiVersion).toBe(1);
	});

	it('an action is id, title, an optional description and input, and run', () => {
		expect(Object.keys(ACTION_PUBLIC).sort()).toEqual(['description', 'id', 'input', 'run', 'title']);
	});

	it('the run an action receives exposes exactly the contract members', async () => {
		vaultStore.open('/vault');
		const ctx = makeContext();
		let received: ModRunV1 | undefined;
		ctx.addAction({ id: 'a', title: 'A', run: (_input, run) => void (received = run) });
		// A second action keeps the button on its picker list (a single-action button runs it at once).
		ctx.addAction({ id: 'z', title: 'Z', run: () => {} });
		ctx.addRailButton({ id: 'b', title: 'B', icon: '' });

		railRegistryStore.actions[0].run();
		await modPickerStore.actions[0].run('');

		expect(Object.keys(received!).sort()).toEqual(Object.keys(RUN_PUBLIC).sort());
	});

	it('an action input is an optional placeholder', () => {
		expect(Object.keys(ACTION_INPUT_PUBLIC)).toEqual(['placeholder']);
	});

	it('a rail button is id, title, icon and an optional list of action ids', () => {
		expect(Object.keys(RAIL_BUTTON_PUBLIC).sort()).toEqual(['actions', 'icon', 'id', 'title']);
	});

	it('a mod is onload plus an optional onunload', () => {
		expect(Object.keys(MOD_PUBLIC).sort()).toEqual(['onload', 'onunload']);
	});
});
