// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import type { ModActionV1, ModContextV1, ModInfoV1, ModRailButtonV1, ModV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { createModContext } from '#lib/plugins/mods/mods-host.service.js';

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
} satisfies Record<keyof ModContextV1, true>;

const ACTION_PUBLIC = {
	id: true,
	title: true,
	description: true,
	run: true,
} satisfies Record<keyof ModActionV1, true>;

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
		unloaded: false,
	});
}

describe('mod API contract v1', () => {
	it('ctx exposes exactly the contract members', () => {
		expect(Object.keys(makeContext()).sort()).toEqual(Object.keys(CONTEXT_PUBLIC).sort());
	});

	it('ctx.mod exposes exactly the contract members', () => {
		expect(Object.keys(makeContext().mod).sort()).toEqual(Object.keys(MOD_INFO_PUBLIC).sort());
	});

	it('ctx reports API version 1', () => {
		expect(makeContext().apiVersion).toBe(1);
	});

	it('an action is id, title, an optional description and run', () => {
		expect(Object.keys(ACTION_PUBLIC).sort()).toEqual(['description', 'id', 'run', 'title']);
	});

	it('a rail button is id, title, icon and an optional list of action ids', () => {
		expect(Object.keys(RAIL_BUTTON_PUBLIC).sort()).toEqual(['actions', 'icon', 'id', 'title']);
	});

	it('a mod is onload plus an optional onunload', () => {
		expect(Object.keys(MOD_PUBLIC).sort()).toEqual(['onload', 'onunload']);
	});
});
