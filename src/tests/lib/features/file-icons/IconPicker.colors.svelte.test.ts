// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick, type ComponentProps } from 'svelte';
import IconPicker from '#lib/features/file-icons/IconPicker.svelte';

// The icon grid's bits-ui ScrollArea observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** The swatch buttons titled `name`: the Icon row's first, then the Text row's. */
function swatches(name: string): { icon: HTMLButtonElement; text: HTMLButtonElement } {
	const buttons = document.querySelectorAll<HTMLButtonElement>(`button[title="${name}"]`);
	expect(buttons).toHaveLength(2);
	return { icon: buttons[0], text: buttons[1] };
}

function dialogContent(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
}

describe('IconPicker color swatches', () => {
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	async function open(props: Record<string, unknown>) {
		const onSelect = vi.fn();
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, {
			target,
			props: { open: true, onSelect, onRemove: () => {}, onClose: () => {}, ...props },
		});
		await settle();
		expect(dialogContent()!.textContent).toContain('Change icon');
		return onSelect;
	}

	it('saves a text color with the current icon at once and keeps the dialog open', async () => {
		const onSelect = await open({ currentPack: 'feather', currentName: 'aperture', currentColor: '#22c55e' });

		swatches('Green').text.click();
		await settle();

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith('feather', 'aperture', '#22c55e', '#22c55e');
		expect(dialogContent()?.dataset.state).toBe('open');
	});

	it('saves an icon color with the current icon and keeps the text color it opened with', async () => {
		const onSelect = await open({ currentPack: 'lucide', currentName: 'star', currentTextColor: '#3b82f6' });

		swatches('Red').icon.click();
		await settle();

		expect(onSelect).toHaveBeenCalledWith('lucide', 'star', '#ef4444', '#3b82f6');
	});

	it('clears a color through the Default swatch', async () => {
		const onSelect = await open({ currentPack: 'lucide', currentName: 'star', currentColor: '#ef4444', currentTextColor: '#3b82f6' });

		swatches('Default').text.click();
		await settle();

		expect(onSelect).toHaveBeenCalledWith('lucide', 'star', '#ef4444', undefined);
	});

	it('holds a color without saving when there is no icon yet', async () => {
		const onSelect = await open({});

		swatches('Green').text.click();
		await settle();

		expect(onSelect).not.toHaveBeenCalled();
		expect(swatches('Green').text.className).toContain('ring-2');
		expect(dialogContent()?.dataset.state).toBe('open');
	});

	it('saves colors alone through onColorsChange when there is no icon', async () => {
		const onColorsChange = vi.fn();
		const onSelect = await open({ currentColor: '#ef4444', onColorsChange });

		swatches('Green').text.click();
		await settle();

		expect(onColorsChange).toHaveBeenCalledTimes(1);
		expect(onColorsChange).toHaveBeenCalledWith('#ef4444', '#22c55e');
		expect(onSelect).not.toHaveBeenCalled();
		expect(dialogContent()?.dataset.state).toBe('open');
	});

	it('saves through onSelect, not onColorsChange, when there is an icon', async () => {
		const onColorsChange = vi.fn();
		const onSelect = await open({ currentPack: 'feather', currentName: 'aperture', onColorsChange });

		swatches('Green').text.click();
		await settle();

		expect(onSelect).toHaveBeenCalledWith('feather', 'aperture', undefined, '#22c55e');
		expect(onColorsChange).not.toHaveBeenCalled();
	});

	it('keeps the colors, search and pack being chosen when an earlier save lands while open', async () => {
		// The caller passes the saved colors back as props once a write lands, as the navigators do.
		const props = $state<ComponentProps<typeof IconPicker>>({
			open: true,
			currentPack: 'lucide',
			currentName: 'star',
			onSelect: vi.fn(),
			onRemove: () => {},
			onClose: () => {},
		});
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, { target, props });
		await settle();
		const search = document.querySelector<HTMLInputElement>('[data-slot="dialog-content"] input[placeholder="Search icons..."]')!;
		search.value = 'star';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		[...document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-content"] button')]
			.find((b) => b.textContent?.trim() === 'Lucide')!
			.click();
		swatches('Red').icon.click();
		swatches('Green').text.click();
		await settle();

		// The first write (red, no text color) lands after the second click.
		props.currentColor = '#ef4444';
		props.currentTextColor = undefined;
		await settle();

		expect(swatches('Green').text.className).toContain('ring-2');
		expect(search.value).toBe('star');
		const lucideTab = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-content"] button')].find(
			(b) => b.textContent?.trim() === 'Lucide',
		)!;
		expect(lucideTab.className).toContain('bg-primary');
		swatches('Blue').icon.click();
		expect(props.onSelect).toHaveBeenLastCalledWith('lucide', 'star', '#3b82f6', '#22c55e');
	});

	it('takes the current colors again when it reopens', async () => {
		const props = $state<ComponentProps<typeof IconPicker>>({
			open: true,
			currentPack: 'lucide',
			currentName: 'star',
			currentTextColor: '#3b82f6',
			onSelect: vi.fn(),
			onRemove: () => {},
			onClose: () => {},
		});
		const target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, { target, props });
		await settle();

		props.open = false;
		await settle();
		props.currentTextColor = '#a855f7';
		props.open = true;
		await settle();

		expect(swatches('Purple').text.className).toContain('ring-2');
	});

	it('saves a custom text color when the color input commits, not on every input', async () => {
		const onSelect = await open({ currentPack: 'lucide', currentName: 'star' });
		const custom = document.querySelector<HTMLInputElement>('label[title="Custom text color"] input[type="color"]')!;

		custom.value = '#123456';
		custom.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		expect(onSelect).not.toHaveBeenCalled();

		custom.dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
		expect(onSelect).toHaveBeenCalledWith('lucide', 'star', undefined, '#123456');
	});
});
