// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async () => true),
	mkdir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@tauri-apps/api/path', () => ({ appLogDir: vi.fn(async () => '/logs') }));
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('#lib/core/settings/sentry.service.js', () => ({ captureSentryException: vi.fn() }));

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { mount, unmount, flushSync } from 'svelte';
import { toast } from 'svelte-sonner';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { captureSentryException } from '#lib/core/settings/sentry.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import ModDialogHost from '#lib/plugins/mods/ModDialogHost.svelte';
import { modDialogsStore } from '#lib/plugins/mods/mod-dialogs.store.svelte.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { createModContext, enableMod, disableMod, stopModsHost, type ModRuntime } from '#lib/plugins/mods/mods-host.service.js';
import { initLogSession, teardownLogSession } from '#lib/utils/log.service.js';

Element.prototype.scrollIntoView ??= () => {};
const VAULT = '/vaults/main';
const shown = () => document.querySelector<HTMLElement>('[data-mod-dialog]');
const button = (name: string) => shown()!.querySelector<HTMLButtonElement>(`[data-mod-dialog-${name}]`)!;
const field = () => shown()!.querySelector<HTMLInputElement>('[data-mod-dialog-field]')!;
const runtime = (): ModRuntime => ({ controller: new AbortController(), disposers: [], runs: new Set(), unloaded: false });
const context = (id = 'hello', live = runtime()) => createModContext({ id, name: 'PRIVATE_MOD_NAME', version: '1.0.0' }, VAULT, live);

/** Flush the real writer at its session boundary, then read only automatic UI records. */
async function records() {
	teardownLogSession();
	await new Promise((resolve) => setTimeout(resolve, 0));
	const text = vi.mocked(writeTextFile).mock.calls.map((call) => call[1]).join('');
	const events = text.split('\n').filter((line) => line.includes('[FRONT-END:MOD-UI] '))
		.map((line) => JSON.parse(line.split('[FRONT-END:MOD-UI] ')[1]));
	return { text, events };
}

function click(name: string) {
	button(name).click();
	flushSync();
}

function type(value: string) {
	field().value = value;
	field().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function press(key: string) {
	field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	flushSync();
}

async function pending(promise: Promise<unknown>) {
	expect(await Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve('pending'), 0))])).toBe('pending');
}

describe('content-free mod dialog diagnostics', () => {
	let component: ReturnType<typeof mount>;

	beforeEach(async () => {
		vi.clearAllMocks();
		settingsStore.reset();
		settingsStore.updateDebugLogToFile(true);
		vaultStore.open(VAULT);
		modDialogsStore.reset();
		await initLogSession();
		component = mount(ModDialogHost, { target: document.body.appendChild(document.createElement('div')) });
		flushSync();
	});

	afterEach(async () => {
		stopModsHost();
		modsEnabledStore._reset();
		modDialogsStore.reset();
		flushSync();
		await unmount(component);
		teardownLogSession();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(captureSentryException).not.toHaveBeenCalled();
		settingsStore.reset();
		modsRunsStore.reset();
		vi.restoreAllMocks();
		vaultStore._reset();
		document.body.innerHTML = '';
	});

	it('does not emit diagnostics for state-only dialogs opened without the host service', async () => {
		const { id, result } = modDialogsStore.open('hello', 'Hello', { kind: 'alert', title: 'State only', alertKind: 'info' });
		flushSync();
		expect(shown()!.textContent).toContain('State only');
		modDialogsStore.answer<'alert'>(id, undefined);
		flushSync();
		expect(await result).toBeUndefined();
		expect(modDialogsStore.current).toBeNull();
		expect(modDialogsStore.dialogs).toEqual([]);
		expect((await records()).events).toEqual([]);
	});

	it.each(['cancel-button', 'escape', 'dismissed', 'mod-unload', 'reset'] as const)('records the originating %s transition once', async (reason) => {
		const result = context().ui.prompt({ title: 'PRIVATE_TITLE' });
		flushSync();
		const id = modDialogsStore.current!.id;
		type('PRIVATE_CANCELLED_VALUE');
		if (reason === 'cancel-button') click('cancel');
		if (reason === 'escape') press('Escape');
		if (reason === 'dismissed') shown()!.querySelector<HTMLElement>('.sr-only')!.closest('button')!.click();
		if (reason === 'mod-unload') modDialogsStore.closeForMod('hello');
		if (reason === 'reset') modDialogsStore.reset();
		flushSync();
		expect(await result).toBeNull();
		expect(shown()).toBeNull();
		modDialogsStore.dismiss(id);
		modDialogsStore.answer<'prompt'>(id, 'PRIVATE_LATE_VALUE');
		const { text, events } = await records();
		expect(events.filter((event) => event.event === 'dialog-closed')).toEqual([
			{ event: 'dialog-closed', modId: 'hello', dialogId: id, kind: 'prompt', reason, elapsedMs: expect.any(Number) },
		]);
		expect(text).not.toContain('PRIVATE_');
	});

	it('does not report queued cancellations as opened or close another mod dialogs', async () => {
		const first = context('a').ui.confirm({ title: 'First' });
		flushSync();
		const firstId = modDialogsStore.current!.id;
		const second = context('b').ui.prompt({ title: 'Second', value: 'Second value' });
		const third = context('a').ui.alert({ title: 'Third' });
		const thirdId = modDialogsStore.dialogs[2].id;
		modDialogsStore.closeForMod('a');
		flushSync();
		expect(await first).toBe(false);
		expect(await third).toBeUndefined();
		expect(modDialogsStore.dialogs).toHaveLength(1);
		expect(shown()!.textContent).toContain('Second');
		expect(field().value).toBe('Second value');
		await pending(second);
		click('confirm');
		expect(await second).toBe('Second value');
		const { events } = await records();
		expect(events.filter((event) => event.dialogId === thirdId).map((event) => [event.event, event.reason])).toEqual([
			['dialog-queued', undefined], ['dialog-closed', 'mod-unload'],
		]);
		expect(events.filter((event) => event.event === 'dialog-closed').map((event) => [event.modId, event.dialogId, event.reason])).toEqual([
			['a', firstId, 'mod-unload'], ['a', thirdId, 'mod-unload'], ['b', expect.any(Number), 'submitted'],
		]);
	});

	it.each(['success', 'failure'] as const)('records loading %s separately from dialog closure', async (outcome) => {
		let resolve!: (value: string) => void;
		let reject!: (error: Error) => void;
		const task = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
		const result = context().ui.loading('PRIVATE_LOADING_LABEL', () => task);
		flushSync();
		const id = modDialogsStore.current!.id;
		expect(shown()!.textContent).toContain('PRIVATE_LOADING_LABEL');
		const failure = new Error('PRIVATE_TASK_ERROR');
		if (outcome === 'success') {
			resolve('PRIVATE_TASK_RESULT');
			expect(await result).toBe('PRIVATE_TASK_RESULT');
		} else {
			reject(failure);
			await expect(result).rejects.toBe(failure);
		}
		flushSync();
		expect(shown()).toBeNull();
		const { text, events } = await records();
		expect(events.map((event) => event.event)).toEqual(['dialog-queued', 'dialog-opened', 'loading-task-settled', 'dialog-closed']);
		expect(events[2]).toEqual({ event: 'loading-task-settled', modId: 'hello', dialogId: id, kind: 'loading', outcome, elapsedMs: expect.any(Number) });
		expect(events[3]).toMatchObject({ reason: 'task-settled', cancellationRequested: false });
		expect(text).not.toContain('PRIVATE_');
	});

	it.each(['success', 'failure'] as const)('keeps a cancelled loading promise tied to its late task %s', async (outcome) => {
		let signal!: AbortSignal;
		let resolve!: (value: string) => void;
		let reject!: (error: Error) => void;
		const result = context().ui.loading('PRIVATE_LOADING_LABEL', (s) => {
			signal = s;
			return new Promise<string>((yes, no) => { resolve = yes; reject = no; });
		}, { cancellable: true });
		flushSync();
		const id = modDialogsStore.current!.id;
		click('cancel');
		await pending(result);
		expect(signal.aborted).toBe(true);
		expect(shown()).toBeNull();
		const other = context('other').ui.alert({ title: 'Still open' });
		flushSync();
		const failure = new Error('PRIVATE_LATE_ERROR');
		if (outcome === 'success') {
			resolve('PRIVATE_LATE_RESULT');
			expect(await result).toBe('PRIVATE_LATE_RESULT');
		} else {
			reject(failure);
			await expect(result).rejects.toBe(failure);
		}
		flushSync();
		expect(shown()!.textContent).toContain('Still open');
		click('ok');
		await other;
		const { text, events } = await records();
		const own = events.filter((event) => event.dialogId === id);
		expect(own.map((event) => event.event)).toEqual(['dialog-queued', 'dialog-opened', 'dialog-closed', 'loading-task-settled']);
		expect(own[2]).toMatchObject({ reason: 'cancel-button', cancellationRequested: true });
		expect(own[3]).toMatchObject({ outcome });
		expect(text).not.toContain('PRIVATE_');
	});

	it('starts a queued loading task immediately and can finish without ever displaying it', async () => {
		const first = context().ui.alert({ title: 'First' });
		flushSync();
		let started = false;
		const loading = context().ui.loading('PRIVATE_QUEUED', async () => { started = true; return 42; });
		expect(started).toBe(true);
		const id = modDialogsStore.dialogs[1].id;
		expect(await loading).toBe(42);
		flushSync();
		expect(shown()!.textContent).toContain('First');
		click('ok');
		await first;
		const { events } = await records();
		expect(events.filter((event) => event.dialogId === id).map((event) => event.event)).toEqual([
			'dialog-queued', 'loading-task-settled', 'dialog-closed',
		]);
	});

	it.each([
		['alert', 'invalid-title', (ctx: ReturnType<typeof context>) => ctx.ui.alert(null as never), 'ui.alert needs a non-empty string title'],
		['confirm', 'invalid-title', (ctx: ReturnType<typeof context>) => ctx.ui.confirm({ title: '' }), 'ui.confirm needs a non-empty string title'],
		['prompt', 'invalid-text', (ctx: ReturnType<typeof context>) => ctx.ui.prompt({ title: 'PRIVATE_TITLE', value: {} as never }), 'ui.prompt needs a string value'],
		['pick', 'invalid-items', (ctx: ReturnType<typeof context>) => ctx.ui.pick({ title: 'PRIVATE_TITLE', items: null as never }), 'ui.pick needs an items array'],
		['pick', 'invalid-item', (ctx: ReturnType<typeof context>) => ctx.ui.pick({ title: 'PRIVATE_TITLE', items: [null as never] }), 'ui.pick needs items with non-empty string ids and titles'],
		['pick', 'invalid-description', (ctx: ReturnType<typeof context>) => ctx.ui.pick({ title: 'PRIVATE_TITLE', items: [{ id: 'PRIVATE_ID', title: 'PRIVATE_ITEM', description: {} as never }] }), 'ui.pick needs a string item description'],
		['pick', 'duplicate-item', (ctx: ReturnType<typeof context>) => ctx.ui.pick({ title: 'PRIVATE_TITLE', items: [{ id: 'PRIVATE_ID', title: 'PRIVATE_ITEM' }, { id: 'PRIVATE_ID', title: 'PRIVATE_OTHER' }] }), 'ui.pick duplicate item id "PRIVATE_ID"'],
		['loading', 'invalid-label', (ctx: ReturnType<typeof context>) => ctx.ui.loading('', async () => {}), 'ui.loading needs a non-empty string label'],
		['loading', 'invalid-task', (ctx: ReturnType<typeof context>) => ctx.ui.loading('PRIVATE_LABEL', null as never), 'ui.loading needs a task function'],
	] as const)('records content-free %s validation rejection %s', async (kind, reason, call, message) => {
		await expect(call(context())).rejects.toThrow(`Mod "hello": ${message}`);
		expect(modDialogsStore.dialogs).toEqual([]);
		expect(shown()).toBeNull();
		const { text, events } = await records();
		expect(events).toEqual([{ event: 'dialog-rejected', modId: 'hello', kind, reason }]);
		expect(text).not.toContain('PRIVATE_');
	});

	it('records only notification requests with validated kinds and JSON-encoded mod identity', async () => {
		const modId = 'hello"\n[FRONT-END:FORGED] injected';
		const ctx = context(modId);
		ctx.notify('PRIVATE_NOTIFICATION', { kind: 'success' });
		ctx.notify('PRIVATE_NOTIFICATION', { kind: 'PRIVATE_KIND' as never });
		expect(toast.success).toHaveBeenCalledWith('PRIVATE_MOD_NAME: PRIVATE_NOTIFICATION');
		expect(toast.info).toHaveBeenCalledWith('PRIVATE_MOD_NAME: PRIVATE_NOTIFICATION');
		expect(modDialogsStore.dialogs).toEqual([]);
		expect(shown()).toBeNull();
		const { text, events } = await records();
		expect(events).toEqual([
			{ event: 'notification-request', modId, kind: 'success' },
			{ event: 'notification-request', modId, kind: 'info' },
		]);
		expect(text.split('\n').filter((line) => line.startsWith('[FRONT-END:FORGED]'))).toEqual([]);
		expect(text).not.toContain('PRIVATE_');
	});

	it('snapshots the notification kind before validating so mod getters cannot substitute diagnostic content', async () => {
		let reads = 0;
		const options = { get kind() { reads++; return reads <= 2 ? 'success' as const : 'PRIVATE_UNVALIDATED_KIND' as never; } };
		context().notify('PRIVATE_NOTIFICATION', options);
		expect(toast.success).toHaveBeenCalledWith('PRIVATE_MOD_NAME: PRIVATE_NOTIFICATION');
		expect(reads).toBe(1);
		const { text, events } = await records();
		expect(events).toEqual([{ event: 'notification-request', modId: 'hello', kind: 'success' }]);
		expect(text).not.toContain('PRIVATE_');
	});

	it('records alert acknowledgement and confirm submission without their content', async () => {
		const ctx = context();
		const alert = ctx.ui.alert({ title: 'PRIVATE_ALERT_TITLE', message: 'PRIVATE_ALERT_MESSAGE' });
		flushSync();
		expect(shown()!.textContent).toContain('PRIVATE_ALERT_MESSAGE');
		click('ok');
		expect(await alert).toBeUndefined();
		const confirm = ctx.ui.confirm({ title: 'PRIVATE_CONFIRM_TITLE', confirmLabel: 'PRIVATE_CONFIRM_LABEL', cancelLabel: 'PRIVATE_CANCEL_LABEL' });
		flushSync();
		expect(button('confirm').textContent).toContain('PRIVATE_CONFIRM_LABEL');
		click('confirm');
		expect(await confirm).toBe(true);
		const { text, events } = await records();
		expect(events.map((event) => [event.kind, event.event, event.reason])).toEqual([
			['alert', 'dialog-queued', undefined], ['alert', 'dialog-opened', undefined], ['alert', 'dialog-closed', 'acknowledged'],
			['confirm', 'dialog-queued', undefined], ['confirm', 'dialog-opened', undefined], ['confirm', 'dialog-closed', 'submitted'],
		]);
		expect(text).not.toContain('PRIVATE_');
	});

	it('keeps empty and unmatched pickers open until a real action and excludes all item content', async () => {
		const ctx = context();
		const empty = ctx.ui.pick({ title: 'PRIVATE_EMPTY_TITLE', items: [] });
		flushSync();
		expect(shown()!.textContent).toContain('No items found.');
		press('Enter');
		await pending(empty);
		const emptyId = modDialogsStore.current!.id;
		click('cancel');
		expect(await empty).toBeNull();
		const item = { id: 'PRIVATE_ITEM_ID', title: 'PRIVATE_ITEM_TITLE', description: 'PRIVATE_ITEM_DESCRIPTION', extra: 'PRIVATE_ITEM_EXTRA' };
		const result = ctx.ui.pick({ title: 'PRIVATE_PICK_TITLE', placeholder: 'PRIVATE_PICK_PLACEHOLDER', items: [item] });
		flushSync();
		const id = modDialogsStore.current!.id;
		type('PRIVATE_UNMATCHED_QUERY_zzzz');
		expect(shown()!.textContent).toContain('No items found.');
		press('Enter');
		await pending(result);
		type('');
		expect(shown()!.textContent).toContain('PRIVATE_ITEM_DESCRIPTION');
		shown()!.querySelector<HTMLElement>('[role="option"]')!.click();
		flushSync();
		expect(await result).toBe(item);
		expect(shown()).toBeNull();
		const { text, events } = await records();
		expect(events.filter((event) => event.event === 'dialog-closed').map((event) => [event.dialogId, event.reason])).toEqual([
			[emptyId, 'cancel-button'], [id, 'submitted'],
		]);
		expect(events.filter((event) => event.dialogId === id).map((event) => event.event)).toEqual(['dialog-queued', 'dialog-opened', 'dialog-closed']);
		expect(text).not.toContain('PRIVATE_');
	});

	it('records queue timing and never invents an opening when reset happens before render', async () => {
		const clock = vi.spyOn(performance, 'now').mockReturnValue(100);
		const first = context().ui.alert({ title: 'First' });
		const id = modDialogsStore.current!.id;
		clock.mockReturnValue(130);
		flushSync();
		modDialogsStore.markOpened(id);
		clock.mockReturnValue(175);
		click('ok');
		await first;
		const second = context().ui.confirm({ title: 'Never rendered' });
		const secondId = modDialogsStore.current!.id;
		modDialogsStore.reset();
		flushSync();
		expect(await second).toBe(false);
		expect(modDialogsStore.current).toBeNull();
		const { events } = await records();
		expect(events.filter((event) => event.dialogId === id).map((event) => event.elapsedMs)).toEqual([0, 30, 75]);
		expect(events.filter((event) => event.dialogId === secondId).map((event) => [event.event, event.reason])).toEqual([
			['dialog-queued', undefined], ['dialog-closed', 'reset'],
		]);
	});

	it('does not assign dialogs to either overlapping run or close them when a run is cancelled', async () => {
		const first = modsRunsStore.start({ modId: 'hello', runKey: 'first', title: 'PRIVATE_FIRST_ACTION', stop: () => {} });
		modsRunsStore.start({ modId: 'hello', runKey: 'second', title: 'PRIVATE_SECOND_ACTION', stop: () => {} });
		const result = context().ui.prompt({ title: 'PRIVATE_TITLE' });
		flushSync();
		modsRunsStore.cancel(first);
		expect(modsRunsStore.runs.map((run) => run.status)).toEqual(['cancelled', 'running']);
		await pending(result);
		expect(shown()!.textContent).toContain('PRIVATE_TITLE');
		type('PRIVATE_SUBMITTED_RESULT');
		click('confirm');
		expect(await result).toBe('PRIVATE_SUBMITTED_RESULT');
		const { text, events } = await records();
		expect(events).toHaveLength(3);
		for (const event of events) {
			expect(event).not.toHaveProperty('runId');
			expect(event).not.toHaveProperty('actionId');
		}
		expect(text).not.toContain('PRIVATE_');
	});

	it.each(['logging-off', 'no-session'] as const)('writes no automatic records with %s', async (mode) => {
		await records();
		vi.mocked(writeTextFile).mockClear();
		if (mode === 'logging-off') {
			await initLogSession();
			settingsStore.updateDebugLogToFile(false);
		}
		const ctx = context();
		const result = ctx.ui.alert({ title: 'PRIVATE_TITLE' });
		flushSync();
		click('ok');
		await result;
		ctx.notify('PRIVATE_NOTIFICATION');
		await expect(ctx.ui.prompt(null as never)).rejects.toThrow('ui.prompt needs a non-empty string title');
		expect(await ctx.ui.loading('PRIVATE_LABEL', async () => 42)).toBe(42);
		expect(modDialogsStore.dialogs).toEqual([]);
		const { text, events } = await records();
		expect(events).toEqual([]);
		expect(text).not.toContain('PRIVATE_');
		if (mode === 'no-session') expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('unloads a real mod with a queued loading task without attributing its late success to another dialog', async () => {
		const globals = globalThis as unknown as { __dialogTestContext?: ReturnType<typeof context> };
		vi.mocked(readTextFile).mockResolvedValueOnce(JSON.stringify({ id: 'hello', name: 'Hello', version: '1.0.0' }))
			.mockResolvedValueOnce('export default { onload(ctx) { globalThis.__dialogTestContext = ctx; } };');
		modsEnabledStore.setEnabled(true);
		await enableMod(VAULT, 'hello');
		const ctx = globals.__dialogTestContext!;
		delete globals.__dialogTestContext;
		expect(ctx.mod.id).toBe('hello');
		const other = context('other').ui.alert({ title: 'Other mod' });
		flushSync();
		let signal!: AbortSignal;
		let finish!: (value: number) => void;
		const loading = ctx.ui.loading('PRIVATE_LABEL', (s) => {
			signal = s;
			return new Promise<number>((resolve) => { finish = resolve; });
		});
		const id = modDialogsStore.dialogs[1].id;
		disableMod('hello');
		flushSync();
		expect(ctx.signal.aborted).toBe(true);
		expect(signal.aborted).toBe(true);
		await pending(loading);
		expect(modDialogsStore.dialogs).toHaveLength(1);
		expect(shown()!.textContent).toContain('Other mod');
		await expect(ctx.ui.alert({ title: 'PRIVATE_AFTER_UNLOAD' })).rejects.toThrow('Mod "hello" is unloaded');
		finish(42);
		expect(await loading).toBe(42);
		flushSync();
		expect(shown()!.textContent).toContain('Other mod');
		click('ok');
		await other;
		const { text, events } = await records();
		const own = events.filter((event) => event.modId === 'hello');
		expect(own.map((event) => event.event)).toEqual(['dialog-queued', 'dialog-closed', 'loading-task-settled']);
		expect(own[1]).toMatchObject({ dialogId: id, reason: 'mod-unload', cancellationRequested: true });
		expect(own[2]).toMatchObject({ dialogId: id, outcome: 'success' });
		expect(text).not.toContain('PRIVATE_');
	});

	it('preserves post-unload failures before validation or notification', async () => {
		const live = runtime();
		const ctx = context('hello', live);
		live.unloaded = true;
		await expect(ctx.ui.alert(null as never)).rejects.toThrow('Mod "hello" is unloaded');
		await expect(ctx.ui.confirm({ title: 'PRIVATE_TITLE' })).rejects.toThrow('Mod "hello" is unloaded');
		await expect(ctx.ui.prompt({ title: 'PRIVATE_TITLE' })).rejects.toThrow('Mod "hello" is unloaded');
		await expect(ctx.ui.pick({ title: 'PRIVATE_TITLE', items: [] })).rejects.toThrow('Mod "hello" is unloaded');
		await expect(ctx.ui.loading('PRIVATE_LABEL', async () => {})).rejects.toThrow('Mod "hello" is unloaded');
		expect(() => ctx.notify('PRIVATE_NOTIFICATION')).toThrow('Mod "hello" is unloaded');
		expect(modDialogsStore.dialogs).toEqual([]);
		expect((await records()).events).toEqual([]);
	});

	it('records an empty submitted prompt as submission with no prompt content', async () => {
		const result = context().ui.prompt({ title: 'PRIVATE_TITLE', message: 'PRIVATE_MESSAGE', value: 'PRIVATE_INITIAL' });
		flushSync();
		expect(shown()!.textContent).toContain('PRIVATE_TITLE');
		expect(field().value).toBe('PRIVATE_INITIAL');
		const id = modDialogsStore.current!.id;
		type('');
		click('confirm');
		expect(await result).toBe('');
		expect(shown()).toBeNull();
		const { text, events } = await records();
		expect(events).toEqual([
			{ event: 'dialog-queued', modId: 'hello', dialogId: id, kind: 'prompt', elapsedMs: 0 },
			{ event: 'dialog-opened', modId: 'hello', dialogId: id, kind: 'prompt', elapsedMs: expect.any(Number) },
			{ event: 'dialog-closed', modId: 'hello', dialogId: id, kind: 'prompt', elapsedMs: expect.any(Number), reason: 'submitted' },
		]);
		expect(text).not.toContain('PRIVATE_');
	});
});
