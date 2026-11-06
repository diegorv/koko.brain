<script lang="ts">
	import type { Component } from 'svelte';
	import Archive from '@lucide/svelte/icons/archive';
	import FileText from '@lucide/svelte/icons/file-text';
	import Folder from '@lucide/svelte/icons/folder';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Layers from '@lucide/svelte/icons/layers';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import Sun from '@lucide/svelte/icons/sun';
	import Table from '@lucide/svelte/icons/table';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
	import { parseIconValuePermissive } from '#lib/features/file-icons/file-icons.logic.js';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { getInboxCount } from '#lib/features/type-definitions/inbox-workflow.logic.js';
	import { pinnedRailItems } from './lens.logic';
	import { parseRailHidden, parseRailInboxBadge, parseRailOrder, railItems, type RailItem } from './rail-items.logic';
	import { railRegistryStore } from './rail-registry.store.svelte';
	import type { RailAction, RailPin } from './rail-shell.types';

	interface Props {
		/** Key of the highlighted rail item */
		activeItem: string;
		/**
		 * Called with the picked item's key, and with its pin for a pinned item (absent for every other item); the
		 * owner decides what the click does, a pin's `_open_in_editor` rule included. `restoreRailItem` in
		 * lens.logic.ts maps the key to its lens
		 */
		onSelect: (item: string, pin?: RailItem['pin']) => void;
	}

	let { activeItem, onSelect }: Props = $props();

	// Same input as the dock badge in AppShell, so both show the same number.
	let inboxCount = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return getInboxCount(
			excludeSystemFolder(typeDefinitionsStore.entries, vaultStore.path, settingsStore.templates.systemFolder),
		);
	});

	/** The icons of the built-in items; a navigator and a pin bring their own. */
	const BUILT_IN_ICONS: Record<string, Component> = {
		search: Search,
		inbox: Inbox,
		today: Sun,
		favorites: Star,
		types: Layers,
		files: Folder,
		archive: Archive,
	};

	/**
	 * Every rail item; the navigators plugins registered and the `.view` files and type definitions with `_rail: true`
	 * included, less the items Settings > Layout hides, in its order.
	 */
	let items = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return railItems(
			railRegistryStore.navigators,
			pinnedRailItems(typeDefinitionsStore.entries, typeDefinitionsStore.typeMetadataMap),
			parseRailHidden(settingsStore.layout.railHidden),
			parseRailOrder(settingsStore.layout.railOrder),
		);
	});
	let showsInboxBadge = $derived(parseRailInboxBadge(settingsStore.layout.railInboxBadge));
	let topItems = $derived(items.filter((i) => i.group === 'top'));
	/** The items that open a navigator, below the divider. */
	let navigatorItems = $derived(items.filter((i) => i.group === 'navigator'));
	let pinnedItems = $derived(items.flatMap((i) => (i.pin ? [i.pin] : [])));
	/** Pinned to the bottom of the rail, below the flexible gap. */
	let bottomItems = $derived(items.filter((i) => i.group === 'bottom'));

	/**
	 * The icon an action's ref names, or undefined until its pack is loaded. Reading packVersion re-runs it when a
	 * pack arrives; whoever registers the action preloads the pack.
	 */
	function actionIcon(ref: string) {
		void fileIconsStore.packVersion;
		const parsed = parseIconValuePermissive(ref);
		return parsed ? getIconSync(parsed.iconPack, parsed.iconName) : undefined;
	}

	function buttonClass(active: boolean): string {
		return `relative shrink-0 rounded-md p-2 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset ${active
			? 'bg-file-explorer-primary/25 text-file-explorer-primary'
			: 'text-file-explorer-fg/70 hover:bg-file-explorer-accent/60 hover:text-file-explorer-fg'}`;
	}
</script>

<nav
	aria-label="Rail"
	class="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-file-explorer-border bg-background"
	data-rail
>
	<!-- Room for the macOS traffic lights (titleBarStyle Overlay), and a handle to drag the window. -->
	<div class="h-10 w-full shrink-0" data-tauri-drag-region></div>
	{#each topItems as item (item.key)}
		{@render railButton(item)}
	{/each}
	{#if navigatorItems.length > 0}
		<div class="my-1 h-px w-6 shrink-0 bg-file-explorer-border" data-rail-divider></div>
		{#each navigatorItems as item (item.key)}
			{@render railButton(item)}
		{/each}
	{/if}
	{#if pinnedItems.length > 0}
		<div class="my-1 h-px w-6 shrink-0 bg-file-explorer-border" data-rail-pinned-divider></div>
		<!-- The only part of the rail that shrinks: with many pins it scrolls and the rest stays fixed. -->
		<div class="flex min-h-0 w-full flex-col items-center gap-1 overflow-y-auto" data-rail-pinned>
			{#each pinnedItems as pin (pin.key)}
				{@render pinButton(pin)}
			{/each}
		</div>
	{/if}
	{#if railRegistryStore.actions.length > 0}
		<div class="my-1 h-px w-6 shrink-0 bg-file-explorer-border" data-rail-actions-divider></div>
		<div class="flex shrink-0 flex-col items-center gap-1" data-rail-actions>
			{#each railRegistryStore.actions as action (action.key)}
				{@render actionButton(action)}
			{/each}
		</div>
	{/if}
	<div class="mt-auto flex shrink-0 flex-col items-center gap-1 pb-2" data-rail-bottom>
		{#each bottomItems as item (item.key)}
			{@render railButton(item)}
		{/each}
	</div>
</nav>

{#snippet railButton(item: RailItem)}
	{@const active = item.key === activeItem}
	{@const Icon = item.navigator?.icon ?? BUILT_IN_ICONS[item.key]}
	<button
		class={buttonClass(active)}
		title={item.label}
		aria-label={item.label}
		aria-current={active ? 'page' : undefined}
		data-rail-item={item.key}
		onclick={() => onSelect(item.key)}
	>
		<Icon class="size-4" />
		{#if item.key === 'inbox' && showsInboxBadge && inboxCount > 0}
			<span
				class="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] leading-[14px] tabular-nums text-primary-foreground"
				data-rail-badge
			>{inboxCount}</span>
		{/if}
	</button>
{/snippet}

{#snippet pinButton(pin: RailPin)}
	<!-- A click on a view that opens in the editor does not pick it, so its pin also follows the active tab, like its Views row. -->
	{@const active = pin.key === activeItem || (pin.opensInEditor && editorStore.activeTabPath === pin.path)}
	{@const resolved = resolveIconForPath(pin.path)}
	<button
		class={buttonClass(active)}
		title={pin.label}
		aria-label={pin.label}
		aria-current={active ? 'page' : undefined}
		data-rail-item={pin.key}
		onclick={() => onSelect(pin.key, pin)}
	>
		{#if resolved?.icon}
			<IconRenderer icon={resolved.icon} class="size-4" color={resolved.color} />
		{:else if pin.kind === 'view'}
			<Table class="size-4" />
		{:else}
			<FileText class="size-4" />
		{/if}
	</button>
{/snippet}

{#snippet actionButton(action: RailAction)}
	<!-- Runs on click; never picked, so it has no highlight and is not saved as the rail item. -->
	{@const icon = actionIcon(action.icon)}
	<button
		class={buttonClass(false)}
		title={action.label}
		aria-label={action.label}
		data-rail-item={action.key}
		onclick={() => action.run()}
	>
		{#if icon}
			<IconRenderer {icon} class="size-4" />
		{:else}
			<Puzzle class="size-4" />
		{/if}
	</button>
{/snippet}
