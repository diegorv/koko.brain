import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modCommandsStore } from '#lib/plugins/mods/mod-commands.store.svelte.js';

const command = (id = 'mod:hello:action:greet') => ({ id, label: 'Hello: Greet', run: vi.fn() });

describe('modCommandsStore', () => {
	beforeEach(() => modCommandsStore.reset());

	it('starts empty and lists unmarked actions with their executable callback', () => {
		expect(modCommandsStore.list).toEqual([]);
		const row = command();
		modCommandsStore.register(row);
		expect(modCommandsStore.list).toEqual([{ ...row, palette: false }]);
		modCommandsStore.list[0].run();
		expect(row.run).toHaveBeenCalledOnce();
	});

	it('removes a registration by identity, without removing its replacement', () => {
		const old = modCommandsStore.register(command());
		const replacement = command();
		const remove = modCommandsStore.register(replacement);
		old();
		expect(modCommandsStore.list).toEqual([{ ...replacement, palette: false }]);
		remove();
		remove();
		expect(modCommandsStore.list).toEqual([]);
	});

	it('marks a row until its placement is disposed, without removing the row', () => {
		const row = command();
		modCommandsStore.register(row);
		const unplace = modCommandsStore.place(row.id);
		expect(modCommandsStore.list[0].palette).toBe(true);
		unplace();
		unplace();
		expect(modCommandsStore.list).toEqual([{ ...row, palette: false }]);
	});

	it('keeps independent placements until their own disposers run', () => {
		const row = command();
		modCommandsStore.register(row);
		const first = modCommandsStore.place(row.id);
		const second = modCommandsStore.place(row.id);
		first();
		expect(modCommandsStore.list[0].palette).toBe(true);
		second();
		expect(modCommandsStore.list[0].palette).toBe(false);
	});

	it('does not transfer an old placement or its cleanup to a replacement', () => {
		const row = command();
		const remove = modCommandsStore.register(row);
		const unplace = modCommandsStore.place(row.id);
		remove();
		modCommandsStore.register(command());
		expect(modCommandsStore.list[0].palette).toBe(false);
		modCommandsStore.place(row.id);
		unplace();
		expect(modCommandsStore.list[0].palette).toBe(true);
	});

	it('rejects an unknown action without changing the list', () => {
		expect(() => modCommandsStore.place('missing')).toThrow('Unknown mod action');
		expect(modCommandsStore.list).toEqual([]);
	});

	it('reset clears registrations and placements', () => {
		const row = command();
		modCommandsStore.register(row);
		modCommandsStore.place(row.id);
		modCommandsStore.reset();
		expect(modCommandsStore.list).toEqual([]);
		modCommandsStore.register(row);
		expect(modCommandsStore.list[0].palette).toBe(false);
	});
});
