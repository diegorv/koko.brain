// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// bits-ui Popover positions via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// openFileInEditor hits Tauri IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): the view is driven through the real collectionStore
// and the rendered DOM, with the harness round-tripping onYamlChange.
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import CollectionViewHarness from '../../../fixtures/CollectionViewHarness.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';

const YAML = `filters: 'status == "open"'
views:
  - type: table
    name: "All"
`;

interface HarnessApi {
	setYaml: (yaml: string) => void;
	getYaml: () => string;
}

describe('CollectionView — selfUpdate latch', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		collectionStore.reset();
		collectionStore.setPropertyIndex(new Map()); // index ready, empty vault
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	function mountView(yaml = YAML): void {
		component = mount(CollectionViewHarness, {
			target,
			props: { initialYaml: yaml, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	/** Opens the Filter popover via its toolbar trigger (ListFilter icon). */
	function openFilterPanel(): void {
		const icon = document.querySelector('svg.lucide-list-filter');
		const trigger = icon?.closest('button');
		if (!trigger) throw new Error('filter toolbar button not found');
		trigger.click();
		flushSync();
	}

	/** The structured filter row's value input (renders in the popover portal). */
	function valueInput(): HTMLInputElement {
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]');
		if (!input) throw new Error('filter value input not found — row did not render');
		return input;
	}

	it('keeps the filter row input mounted and focused across a per-keystroke self-persist', () => {
		mountView();
		openFilterPanel();

		const input = valueInput();
		expect(input.value).toBe('open');
		input.focus();
		expect(document.activeElement).toBe(input);

		// One keystroke: FilterRow fires onUpdate per input event → CollectionView
		// persistState → onYamlChange → the harness round-trips the new yaml back
		// down as a prop change. The selfUpdate latch must swallow exactly this
		// round-trip; if the guard re-runs into the reset branch, the seeding
		// effect regenerates row uids and the keyed each replaces this input.
		input.value = 'opened';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(api?.getYaml()).toContain('opened'); // the persist itself happened
		expect(input.isConnected).toBe(true);
		expect(document.activeElement).toBe(input);
	});

	it('does not wipe an in-progress (editing) formula entry when another persist fires', () => {
		mountView();
		openFilterPanel();

		// Two consecutive keystrokes: the second runs against the re-seeded state
		// if the latch is broken, so its target element differs and the typed
		// value of the first edit is what survives in the yaml.
		const input = valueInput();
		input.value = 'a';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		const after = document.querySelector<HTMLInputElement>('input[placeholder="Value..."]');
		expect(after).toBe(input);
	});

	it('still re-seeds local state when the yaml changes externally', () => {
		mountView();
		openFilterPanel();
		const input = valueInput();

		// External change (vault sync, another tab): NOT routed through
		// onYamlChange, so the reset branch MUST run and re-seed the rows.
		api?.setYaml(`filters: 'status == "closed"'
views:
  - type: table
    name: "All"
`);
		flushSync();

		const reseeded = valueInput();
		expect(reseeded).not.toBe(input);
		expect(reseeded.value).toBe('closed');
	});
});
