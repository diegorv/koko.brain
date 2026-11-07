// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string>());
const listeners = vi.hoisted(() => new Set<(paths: string[]) => void>());
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...files.keys()].some((key) => key === path || key.startsWith(`${path}/`))),
	mkdir: vi.fn(async () => {}),
	readDir: vi.fn(async (path: string) => [...new Set([...files.keys()]
		.filter((key) => key.startsWith(`${path}/`))
		.map((key) => key.slice(path.length + 1).split('/')[0]))]
		.map((name) => ({ name, isDirectory: true }))),
	readTextFile: vi.fn(async (path: string) => {
		const text = files.get(path);
		if (text === undefined) throw new Error('missing file');
		return text;
	}),
	writeTextFile: vi.fn(async (path: string, text: string, options?: { append?: boolean }) => {
		files.set(path, (options?.append ? files.get(path) ?? '' : '') + text);
	}),
}));
vi.mock('@tauri-apps/api/path', () => ({ appLogDir: async () => '/logs' }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null) }));
vi.mock('svelte-sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock('#lib/core/settings/sentry.service.js', () => ({ captureSentryException: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.watcher.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/core/filesystem/fs.watcher.js')>()),
	onFileChange: (listener: (paths: string[]) => void) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
}));

import { toast } from 'svelte-sonner';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { captureSentryException } from '#lib/core/settings/sentry.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { modCommandsStore } from '#lib/plugins/mods/mod-commands.store.svelte.js';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost } from '#lib/plugins/mods/mods-host.service.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { flushLog, initLogSession, teardownLogSession } from '#lib/utils/log.service.js';

const VAULT = '/vault';
const MOD = `${VAULT}/_system/mods/quiet`;

function writeMod(onload = ''): void {
	files.set(`${MOD}/manifest.json`, JSON.stringify({ id: 'quiet', name: 'Private title', version: '1' }));
	files.set(`${MOD}/main.js`, `export default { onload(ctx) { ${onload} } };`);
}

async function records(): Promise<Record<string, unknown>[]> {
	await flushLog();
	return [...files.entries()].filter(([path]) => path.startsWith('/logs/'))
		.flatMap(([, text]) => text.split('\n'))
		.filter((line) => line.includes('[FRONT-END:MOD-HOST] '))
		.map((line) => JSON.parse(line.slice(line.indexOf('[FRONT-END:MOD-HOST] ') + '[FRONT-END:MOD-HOST] '.length)));
}

function changed(): void {
	for (const listener of listeners) listener([`${MOD}/main.js`]);
}

function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

const globals = globalThis as typeof globalThis & { __traceGate?: Promise<void> };

describe('host execution trace through the real buffered logger', () => {
	beforeEach(async () => {
		stopModsHost();
		teardownLogSession();
		await flushLog();
		files.clear();
		vi.clearAllMocks();
		localStorage.clear();
		modsRunsStore.reset();
		modPickerStore.reset();
		railRegistryStore.reset();
		modCommandsStore.reset();
		modsEnabledStore._reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		modsEnabledStore.setEnabled(true);
		settingsStore.updateDebugMode(false);
		settingsStore.updateDebugLogToFile(true);
		await initLogSession();
	});

	afterEach(async () => {
		stopModsHost();
		teardownLogSession();
		await flushLog();
		settingsStore.updateDebugLogToFile(false);
	});

	it('keeps empty discovery a no-op', async () => {
		await startModsHost(VAULT);
		expect(modsStore.entries).toEqual([]);
		expect(modsRunsStore.runs).toEqual([]);
		expect(await records()).toEqual([]);
	});

	it.each(['disabled', 'no-session'])('does not persist automatic records with logging %s', async (mode) => {
		if (mode === 'disabled') settingsStore.updateDebugLogToFile(false);
		else teardownLogSession();
		writeMod("ctx.addAction({ id: 'quiet', title: 'Quiet', run() {} });");
		await startModsHost(VAULT);
		modCommandsStore.list[0].run();
		await vi.waitFor(() => expect(modsRunsStore.runs[0]?.status).toBe('done'));
		expect(modsStore.entries[0].state).toBe('loaded');
		stopModsHost();
		expect(await records()).toEqual([]);
	});

	it('preserves action error feedback but keeps error text out of automatic records', async () => {
		writeMod("ctx.addAction({ id: 'fail', title: 'Secret title', run() { throw new Error('secret error'); } });");
		await startModsHost(VAULT);
		modCommandsStore.list[0].run();
		const run = modsRunsStore.runs[0];
		expect(run.status).toBe('failed');
		expect(run.error?.message).toBe('secret error');
		expect(modsRunsStore.isBusy(run.buttonKey)).toBe(false);
		expect(toast.error).toHaveBeenCalledWith('Private title: Secret title failed: secret error');
		const events = (await records()).filter((record) => record.runId === run.id);
		expect(events).toHaveLength(2);
		expect(events[1]).toMatchObject({ event: 'action-end', outcome: 'failed', runId: run.id });
		expect(JSON.stringify(events)).not.toMatch(/Secret title|secret error/);
		expect(captureSentryException).not.toHaveBeenCalled();
	});

	it.each(['resolve', 'reject'])('records Stop once and ignores a late %s, including after a replacement run', async (settlement) => {
		const gate = deferred();
		globals.__traceGate = gate.promise;
		writeMod("ctx.addAction({ id: 'hold', title: 'Hold', run: () => globalThis.__traceGate });");
		await startModsHost(VAULT);
		modCommandsStore.list[0].run();
		const old = modsRunsStore.runs[0];
		old.stop();
		expect(modsRunsStore.runFor(old.buttonKey)?.status).toBe('cancelled');
		expect(modsRunsStore.isBusy(old.buttonKey)).toBe(false);
		expect((await records()).filter((record) => record.runId === old.id && record.event === 'action-end')).toEqual([
			expect.objectContaining({ outcome: 'cancelled' }),
		]);
		const replacement = deferred();
		globals.__traceGate = replacement.promise;
		modCommandsStore.list[0].run();
		const next = modsRunsStore.runs[0];
		expect(next.id).not.toBe(old.id);
		if (settlement === 'resolve') gate.resolve();
		else gate.reject(new Error('late secret failure'));
		await Promise.resolve();
		expect(modsRunsStore.runFor(next.buttonKey)?.status).toBe('running');
		expect((await records()).filter((record) => record.runId === old.id && record.event === 'action-end')).toHaveLength(1);
		expect(toast.error).not.toHaveBeenCalled();
		expect(captureSentryException).not.toHaveBeenCalled();
		replacement.resolve();
		await vi.waitFor(() => expect(modsRunsStore.runFor(next.buttonKey)?.status).toBe('done'));
		expect((await records()).filter((record) => record.runId === next.id && record.event === 'action-end')).toEqual([
			expect.objectContaining({ outcome: 'done' }),
		]);
	});

	it('keeps concurrent identities separate and reveals a busy key without another start', async () => {
		const gate = deferred();
		globals.__traceGate = gate.promise;
		writeMod(`
			ctx.addAction({ id: 'hold', title: 'Hold', run: () => globalThis.__traceGate });
			ctx.addRailButton({ id: 'one', title: 'One', icon: '', actions: ['hold'] });
			ctx.addRailButton({ id: 'two', title: 'Two', icon: '', actions: ['hold'] });
		`);
		await startModsHost(VAULT);
		railRegistryStore.actions[0].run();
		railRegistryStore.actions[1].run();
		const [one, two] = modsRunsStore.runs;
		expect(one.id).not.toBe(two.id);
		expect(modsRunsStore.isBusy(one.buttonKey)).toBe(true);
		expect(modsRunsStore.isBusy(two.buttonKey)).toBe(true);
		modPickerStore.close();
		railRegistryStore.actions[0].run();
		expect(modPickerStore.isOpen).toBe(true);
		expect(modPickerStore.runKey).toBe(one.buttonKey);
		expect(modsRunsStore.runs).toHaveLength(2);
		expect((await records()).filter((record) => record.event === 'action-start')).toHaveLength(2);
		one.stop();
		gate.resolve();
		await vi.waitFor(() => expect(modsRunsStore.runFor(two.buttonKey)?.status).toBe('done'));
		expect(modsRunsStore.runFor(one.buttonKey)?.status).toBe('cancelled');
		const events = await records();
		for (const [id, outcome] of [[one.id, 'cancelled'], [two.id, 'done']]) {
			expect(events.filter((record) => record.runId === id && record.event === 'action-end')).toEqual([
				expect.objectContaining({ outcome }),
			]);
		}
	});

	it('escapes action identifiers and excludes input, target, titles and progress from automatic records', async () => {
		const actionId = 'id\n[FRONT-END:MOD-HOST] forged\r"\\';
		writeMod(`
			ctx.addAction({ id: ${JSON.stringify(actionId)}, title: 'secret title', input: {},
				run(input, run) { run.log('secret content'); run.progress(1, 2, 'secret progress'); } });
			ctx.labs.place(${JSON.stringify(actionId)}, { menu: { on: ['note'] } });
		`);
		await startModsHost(VAULT);
		railRegistryStore.menuItems[0].run({ on: 'note', path: 'secret-target.md' });
		expect(modPickerStore.inputAction?.id).toBe(actionId);
		await modPickerStore.inputAction!.run('secret input');
		const run = modsRunsStore.runs[0];
		expect(run.lines).toEqual(['secret content']);
		expect(run.progress?.label).toBe('secret progress');
		expect(run.status).toBe('done');
		const events = await records();
		expect(events).toHaveLength(4);
		expect(events.filter((record) => record.runId === run.id)).toEqual([
			{ event: 'action-start', modId: 'quiet', actionId, runId: run.id, origin: 'note-menu', outcome: 'running', elapsedMs: 0 },
			{ event: 'action-end', modId: 'quiet', actionId, runId: run.id, origin: 'note-menu', outcome: 'done', elapsedMs: expect.any(Number) },
		]);
		expect(JSON.stringify(events)).not.toContain('secret');
	});

	it('records failed load without replacing the existing error feedback', async () => {
		writeMod("throw new Error('private failure');");
		await startModsHost(VAULT);
		expect(modsStore.entries[0].state).toBe('error');
		expect(modsStore.entries[0].error?.message).toContain('private failure');
		expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('private failure'));
		expect(await records()).toContainEqual({ event: 'load-result', modId: 'quiet', outcome: 'failed', elapsedMs: expect.any(Number) });
		expect(JSON.stringify(await records())).not.toContain('private failure');
		expect(captureSentryException).not.toHaveBeenCalled();
	});

	it.each(['disable', 'delete', 'stop'])('records unload on %s exactly once', async (operation) => {
		writeMod();
		await startModsHost(VAULT);
		if (operation === 'disable') {
			disableMod('quiet');
			expect(modsStore.entries[0].state).toBe('disabled');
		} else if (operation === 'delete') {
			files.delete(`${MOD}/manifest.json`);
			changed();
			await vi.waitFor(() => expect(modsStore.entries).toEqual([]));
		} else stopModsHost();
		stopModsHost();
		expect(modsStore.entries).toEqual([]);
		expect((await records()).filter((record) => record.event === 'unload')).toEqual([{ event: 'unload', modId: 'quiet' }]);
	});

	it('records a busy reload wait and only loads the replacement after the run ends', async () => {
		const gate = deferred();
		globals.__traceGate = gate.promise;
		writeMod("ctx.addAction({ id: 'hold', title: 'Hold', run: () => globalThis.__traceGate });");
		await startModsHost(VAULT);
		modCommandsStore.list[0].run();
		const run = modsRunsStore.runs[0];
		writeMod();
		changed();
		await vi.waitFor(() => expect(modsRunsStore.isReloadPending('quiet')).toBe(true));
		expect(modsRunsStore.isBusy(run.buttonKey)).toBe(true);
		const waiting = await records();
		expect(waiting).toContainEqual({ event: 'reload-wait', modId: 'quiet' });
		expect(waiting.filter((record) => record.event === 'load-attempt')).toHaveLength(1);
		gate.resolve();
		await vi.waitFor(async () => expect((await records()).filter((record) => record.outcome === 'loaded')).toHaveLength(2));
		expect(modsRunsStore.runFor(run.buttonKey)?.status).toBe('done');
		expect(modsRunsStore.isReloadPending('quiet')).toBe(false);
		expect(modsStore.entries[0].state).toBe('loaded');
		expect((await records()).map((record) => record.event)).toEqual([
			'load-attempt', 'load-result', 'action-start', 'reload-wait', 'action-end', 'unload', 'load-attempt', 'load-result',
		]);
	});

	it('does not claim superseded onload code loaded successfully', async () => {
		const gate = deferred();
		globals.__traceGate = gate.promise;
		writeMod('return globalThis.__traceGate;');
		const loading = startModsHost(VAULT);
		await vi.waitFor(async () => expect(await records()).toContainEqual({ event: 'load-attempt', modId: 'quiet' }));
		disableMod('quiet');
		gate.resolve();
		await loading;
		expect(modsStore.entries[0].state).toBe('disabled');
		expect((await records()).filter((record) => record.event === 'load-result')).toEqual([
			{ event: 'load-result', modId: 'quiet', outcome: 'superseded', elapsedMs: expect.any(Number) },
		]);
	});

	it.each(['rail', 'command', 'note-menu', 'folder-menu'])('traces quiet %s success with explicit origin and real run identity', async (origin) => {
		writeMod(`
			ctx.addAction({ id: 'quiet-action', title: 'Private action title', run() {} });
			ctx.addRailButton({ id: 'button', title: 'Private button', icon: '', actions: ['quiet-action'] });
			ctx.labs.place('quiet-action', { palette: true, menu: { on: ['note', 'folder'] } });
		`);
		await startModsHost(VAULT);
		if (origin === 'rail') railRegistryStore.actions[0].run();
		else if (origin === 'command') modCommandsStore.list[0].run();
		else railRegistryStore.menuItems[0].run({ on: origin === 'note-menu' ? 'note' : 'folder', path: 'private/note.md' });
		await vi.waitFor(() => expect(modsRunsStore.runs[0]?.status).toBe('done'));
		const run = modsRunsStore.runs[0];
		expect(modsRunsStore.runFor(run.buttonKey)).toBe(run);
		expect(modsRunsStore.isBusy(run.buttonKey)).toBe(false);
		const events = (await records()).filter((record) => record.event === 'action-start' || record.event === 'action-end');
		expect(events).toEqual([
			{ event: 'action-start', modId: 'quiet', actionId: 'quiet-action', runId: run.id, origin, outcome: 'running', elapsedMs: 0 },
			{ event: 'action-end', modId: 'quiet', actionId: 'quiet-action', runId: run.id, origin, outcome: 'done', elapsedMs: expect.any(Number) },
		]);
		expect(events[1].elapsedMs).toBeGreaterThanOrEqual(0);
		expect(captureSentryException).not.toHaveBeenCalled();
	});

	it('persists a quiet load attempt and result alongside loaded status', async () => {
		writeMod();
		await startModsHost(VAULT);
		expect(modsStore.entries).toEqual([expect.objectContaining({ id: 'quiet', state: 'loaded' })]);
		expect(await records()).toEqual([
			{ event: 'load-attempt', modId: 'quiet' },
			{ event: 'load-result', modId: 'quiet', outcome: 'loaded', elapsedMs: expect.any(Number) },
		]);
		expect(captureSentryException).not.toHaveBeenCalled();
	});
});
