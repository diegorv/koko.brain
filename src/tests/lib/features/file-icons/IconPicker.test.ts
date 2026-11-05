// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
import { preloadPacks } from '#lib/features/file-icons/file-icons.icon-data.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';

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

describe('IconPicker', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('widens the dialog to 550px from the sm breakpoint, replacing the default width', async () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, {
			target,
			props: { open: true, onSelect: () => {}, onRemove: () => {}, onClose: () => {} },
		});
		await settle();

		const content = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
		expect(content).not.toBeNull();
		expect(content!.textContent).toContain('Change icon');
		const classes = content!.classList;
		expect(classes.contains('sm:max-w-[550px]')).toBe(true);
		expect(classes.contains('sm:max-w-lg')).toBe(false);
		expect(classes.contains('max-w-[550px]')).toBe(false);
	});

	it('has one close button, the built-in one, which closes the picker', async () => {
		const onClose = vi.fn();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, {
			target,
			props: { open: true, onSelect: () => {}, onRemove: () => {}, onClose },
		});
		await settle();

		const closes = [...document.body.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Close');
		expect(closes).toHaveLength(1);

		closes[0].click();
		await settle();

		expect(onClose).toHaveBeenCalledTimes(1);
		// bits-ui keeps the content mounted for its exit animation, so read its state.
		expect(document.querySelector('[data-slot="dialog-content"]')?.getAttribute('data-state')).toBe('closed');
	});

	it('reserves end space in the header row so the close X does not cover the title', async () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(IconPicker, {
			target,
			props: { open: true, onSelect: () => {}, onRemove: () => {}, onClose: () => {} },
		});
		await settle();

		const title = document.querySelector<HTMLElement>('[data-slot="dialog-title"]');
		expect(title?.textContent?.trim()).toBe('Change icon');
		expect(title!.parentElement!.classList.contains('pe-10')).toBe(true);
	});

	describe('lucide spellings', () => {
		afterEach(() => {
			fileIconsStore.reset();
		});

		/** Mounts the picker on the Lucide pack alone and returns the button of `title` in the grid. */
		async function openOnLucide(props: Record<string, unknown>, search: string, title: string) {
			target = document.body.appendChild(document.createElement('div'));
			component = mount(IconPicker, {
				target,
				props: { open: true, onSelect: () => {}, onRemove: () => {}, onClose: () => {}, ...props },
			});
			await settle();
			[...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Lucide')!.click();
			const input = document.querySelector<HTMLInputElement>('input[placeholder="Search icons..."]')!;
			input.value = search;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			return vi.waitFor(
				() => {
					flushSync();
					const button = document.querySelector<HTMLElement>(`button[title="${title}"]`);
					if (!button) throw new Error(`${title} not rendered`);
					return button;
				},
				{ timeout: 10_000 },
			);
		}

		it('lists the icon under its canonical name when searched by the old spelling', async () => {
			const button = await openOnLucide({}, 'trash-2', 'trash (lucide)');

			expect(button.classList.contains('ring-1')).toBe(false);
		});

		it.each(['trash2', 'trash-2', 'trash'])('highlights the current icon saved as %s', async (currentName) => {
			const button = await openOnLucide({ currentPack: 'lucide', currentName }, 'trash', 'trash (lucide)');

			expect(button.classList.contains('ring-1')).toBe(true);
		});

		it('shows one recent icon for two spellings of it, without a duplicate key', async () => {
			await preloadPacks(['lucide']);
			fileIconsStore.setRecentIcons([
				{ iconPack: 'lucide', iconName: 'trash2' },
				{ iconPack: 'lucide', iconName: 'trash' },
				{ iconPack: 'lucide', iconName: 'clock1' },
			]);
			target = document.body.appendChild(document.createElement('div'));
			component = mount(IconPicker, {
				target,
				props: { open: true, onSelect: () => {}, onRemove: () => {}, onClose: () => {} },
			});
			await settle();

			const heading = [...document.querySelectorAll('p')].find((p) => p.textContent === 'Recently used')!;
			const titles = [...heading.parentElement!.querySelectorAll('button')].map((b) => b.title);
			expect(titles).toEqual(['trash (lucide)', 'clock-1 (lucide)']);
		});
	});
});
