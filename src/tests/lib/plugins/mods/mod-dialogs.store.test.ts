// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { modDialogsStore } from '#lib/plugins/mods/mod-dialogs.store.svelte.js';

const alert = (title: string) => ({ kind: 'alert', title, alertKind: 'info' }) as const;
const confirm = (title: string) =>
	({ kind: 'confirm', title, confirmLabel: 'OK', cancelLabel: 'Cancel', destructive: false }) as const;
const prompt = (title: string) => ({ kind: 'prompt', title, value: '', multiline: false }) as const;
const loading = (label: string) => ({ kind: 'loading', label, cancellable: true }) as const;

/** Resolves to the settled value, or to 'pending' when the promise has not settled after a tick */
async function settled<T>(promise: Promise<T>): Promise<T | 'pending'> {
	return Promise.race([promise, new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 0))]);
}

describe('modDialogsStore', () => {
	beforeEach(() => {
		modDialogsStore.reset();
	});

	it('starts with no dialog', () => {
		expect(modDialogsStore.current).toBeNull();
		expect(modDialogsStore.dialogs).toEqual([]);
	});

	it('open shows the dialog with its mod and spec', () => {
		modDialogsStore.open('hello', 'Hello mod', confirm('Archive?'));

		expect(modDialogsStore.current).toMatchObject({ modId: 'hello', modName: 'Hello mod', kind: 'confirm', title: 'Archive?' });
	});

	it('shows one dialog at a time; the others wait in call order', () => {
		modDialogsStore.open('a', 'A', alert('first'));
		modDialogsStore.open('b', 'B', confirm('second'));
		modDialogsStore.open('a', 'A', prompt('third'));

		expect(modDialogsStore.current).toMatchObject({ title: 'first' });
		expect(modDialogsStore.dialogs.map((d) => 'title' in d && d.title)).toEqual(['first', 'second', 'third']);
	});

	it('answering the current dialog settles it and shows the next one', async () => {
		const first = modDialogsStore.open('a', 'A', confirm('first'));
		const second = modDialogsStore.open('a', 'A', prompt('second'));

		modDialogsStore.answer(first.id, true);

		expect(await first.result).toBe(true);
		expect(modDialogsStore.current).toMatchObject({ id: second.id, title: 'second' });
		expect(await settled(second.result)).toBe('pending');
	});

	it('answer settles a prompt with its text', async () => {
		const { id, result } = modDialogsStore.open('a', 'A', prompt('Name'));
		modDialogsStore.answer(id, 'Project X');
		expect(await result).toBe('Project X');
		expect(modDialogsStore.current).toBeNull();
	});

	describe('dismiss settles with the cancel value of each kind', () => {
		it('alert resolves', async () => {
			const { id, result } = modDialogsStore.open('a', 'A', alert('Done'));
			modDialogsStore.dismiss(id);
			expect(await result).toBeUndefined();
		});

		it('confirm resolves false', async () => {
			const { id, result } = modDialogsStore.open('a', 'A', confirm('Sure?'));
			modDialogsStore.dismiss(id);
			expect(await result).toBe(false);
		});

		it('prompt resolves null', async () => {
			const { id, result } = modDialogsStore.open('a', 'A', prompt('Name'));
			modDialogsStore.dismiss(id);
			expect(await result).toBeNull();
		});

		it('loading resolves true (cancelled)', async () => {
			const { id, result } = modDialogsStore.open('a', 'A', loading('Working'));
			modDialogsStore.dismiss(id);
			expect(await result).toBe(true);
		});
	});

	it('a queued dialog can be settled before its turn and is dropped from the queue', async () => {
		modDialogsStore.open('a', 'A', alert('first'));
		const queued = modDialogsStore.open('a', 'A', loading('Working'));

		modDialogsStore.answer(queued.id, false);

		expect(await queued.result).toBe(false);
		expect(modDialogsStore.dialogs.map((d) => d.kind)).toEqual(['alert']);
	});

	it('settling an unknown or already settled dialog does nothing', async () => {
		const { id, result } = modDialogsStore.open('a', 'A', confirm('Sure?'));
		modDialogsStore.answer(id, true);
		modDialogsStore.dismiss(id);
		modDialogsStore.answer(999, false);

		expect(await result).toBe(true);
		expect(modDialogsStore.current).toBeNull();
	});

	it("closeForMod settles every open and queued dialog of that mod as cancelled and keeps the others'", async () => {
		const a1 = modDialogsStore.open('a', 'A', confirm('a1'));
		const b1 = modDialogsStore.open('b', 'B', alert('b1'));
		const a2 = modDialogsStore.open('a', 'A', prompt('a2'));
		const a3 = modDialogsStore.open('a', 'A', loading('a3'));

		modDialogsStore.closeForMod('a');

		expect(await a1.result).toBe(false);
		expect(await a2.result).toBeNull();
		expect(await a3.result).toBe(true);
		expect(await settled(b1.result)).toBe('pending');
		expect(modDialogsStore.dialogs.map((d) => d.modId)).toEqual(['b']);
		expect(modDialogsStore.current).toMatchObject({ id: b1.id });
	});

	it('closeForMod with no dialog of that mod changes nothing', () => {
		modDialogsStore.open('b', 'B', alert('b1'));
		modDialogsStore.closeForMod('a');
		expect(modDialogsStore.dialogs).toHaveLength(1);
	});

	it('reset empties the queue', () => {
		modDialogsStore.open('a', 'A', alert('first'));
		modDialogsStore.reset();
		expect(modDialogsStore.current).toBeNull();
	});
});
