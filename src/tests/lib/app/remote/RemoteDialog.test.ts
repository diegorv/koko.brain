// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import RemoteDialog from '#lib/app/remote/RemoteDialog.svelte';
import { remoteDialogStore } from '#lib/app/remote/remote-dialog.store.svelte.js';

describe('RemoteDialog', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		remoteDialogStore.reset();
	});

	async function render() {
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(RemoteDialog, { target });
		flushSync();
		await tick();
	}

	const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('[data-remote-dialog-button]')];

	it('shows nothing with no request', async () => {
		await render();
		expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
	});

	it('shows the title, the message and one button per label; a click answers it', async () => {
		await render();
		const answer = remoteDialogStore.open({ title: 'Move to Trash', message: 'Move "a" to trash?', kind: 'warning', buttons: ['Yes', 'No'] });
		flushSync();
		await tick();

		const content = document.querySelector('[data-slot="dialog-content"]');
		expect(content?.textContent).toContain('Move to Trash');
		expect(content?.textContent).toContain('Move "a" to trash?');
		expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Yes', 'No']);

		buttons()[0].click();
		await expect(answer).resolves.toBe('Yes');
		flushSync();
		await tick();
		expect(remoteDialogStore.current).toBeNull();
	});

	it('Escape answers with the last button', async () => {
		await render();
		const answer = remoteDialogStore.open({ title: null, message: 'Discard?', kind: null, buttons: ['Discard', 'Keep'] });
		flushSync();
		await tick();
		document.querySelector('[data-slot="dialog-content"]')!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
		);
		await expect(answer).resolves.toBe('Keep');
	});

	it('shows queued requests one after the other', async () => {
		await render();
		const first = remoteDialogStore.open({ title: null, message: 'First', kind: null, buttons: ['Ok'] });
		const second = remoteDialogStore.open({ title: null, message: 'Second', kind: null, buttons: ['Ok'] });
		flushSync();
		await tick();
		expect(document.querySelector('[data-slot="dialog-content"]')?.textContent).toContain('First');
		buttons()[0].click();
		await expect(first).resolves.toBe('Ok');
		flushSync();
		await tick();
		expect(document.querySelector('[data-slot="dialog-content"]')?.textContent).toContain('Second');
		buttons()[0].click();
		await expect(second).resolves.toBe('Ok');
	});
});
