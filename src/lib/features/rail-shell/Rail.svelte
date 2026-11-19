<script lang="ts">
	import type { Component } from 'svelte';
	import Archive from '@lucide/svelte/icons/archive';
	import FileText from '@lucide/svelte/icons/file-text';
	import Folder from '@lucide/svelte/icons/folder';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Layers from '@lucide/svelte/icons/layers';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Network from '@lucide/svelte/icons/network';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import Sun from '@lucide/svelte/icons/sun';
	import Table from '@lucide/svelte/icons/table';
	import Tag from '@lucide/svelte/icons/tag';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
	import { resolveThemeColor, themeSurface } from '#lib/core/settings/theme-surfaces.logic.js';
	import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
	import { iconColorCss, parseIconValuePermissive } from '#lib/features/file-icons/file-icons.logic.js';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { getInboxCount } from '#lib/features/type-definitions/inbox-workflow.logic.js';
	import { pinnedRailItems } from './lens.logic';
	import {
		parseRailCollapsed,
		parseRailHidden,
		parseRailInboxBadge,
		parseRailOrder,
		parseRailStyle,
		parseRailWidth,
		GRAPH_TAB_RAIL_ITEM,
		RAIL_ACTIVE_TINT,
		RAIL_PIN_COLOR,
		RAIL_WIDTH,
		railActionColor,
		railBadgeColors,
		railFormWidth,
		railIconColor,
		railItemColor,
		railItems,
		TAGS_TAB_RAIL_ITEM,
		TASKS_TAB_RAIL_ITEM,
		type RailItem,
	} from './rail-items.logic';
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
		[TASKS_TAB_RAIL_ITEM]: ListChecks,
		[GRAPH_TAB_RAIL_ITEM]: Network,
		[TAGS_TAB_RAIL_ITEM]: Tag,
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
	/** The items that open a tab (Tasks, Graph, Tags), after the navigators. */
	let tabItems = $derived(items.filter((i) => i.group === 'tabs'));
	let pinnedItems = $derived(items.flatMap((i) => (i.pin ? [i.pin] : [])));
	/** Pinned to the bottom of the rail, below the flexible gap. */
	let bottomItems = $derived(items.filter((i) => i.group === 'bottom'));

	/** The classes that differ by form; the owner approved these spacings in the real app. */
	const FORM_CLASSES = {
		labeled: {
			nav: 'gap-0.5',
			row: 'mx-2 flex h-7 items-center gap-2 rounded-md px-2',
			icon: 'size-4',
			title: 'min-w-0 flex-1 truncate text-left',
			divider: 'mx-2 my-2 h-px',
			group: 'gap-0.5',
			bottom: 'gap-0.5 py-2',
			badge: 'rounded-full px-1.5',
		},
		captioned: {
			nav: 'items-center gap-1.5',
			row: 'flex w-[72px] flex-col items-center gap-1.5 rounded-lg px-1 py-2.5',
			icon: 'size-5',
			title: 'w-full truncate text-center',
			divider: 'my-1.5 h-px w-10',
			group: 'items-center gap-1.5',
			bottom: 'items-center pt-1.5 pb-3',
			badge: 'absolute top-1 right-3 rounded-full px-1',
		},
		collapsed: {
			nav: 'items-center gap-1',
			row: 'rounded-md p-2',
			icon: 'size-4',
			title: null,
			divider: 'my-1 h-px w-6',
			group: 'items-center gap-1',
			bottom: 'items-center gap-1 pb-2',
			badge: 'absolute -top-0.5 -right-0.5 rounded-full px-1',
		},
	};

	let style = $derived(parseRailStyle(settingsStore.layout.railStyle));
	let collapsed = $derived(parseRailCollapsed(settingsStore.layout.railCollapsed));
	let form = $derived(collapsed ? ('collapsed' as const) : style);
	let classes = $derived(FORM_CLASSES[form]);

	/** One button of any group: an item, a pin or an action, flattened so one snippet draws them all. */
	interface Row {
		key: string;
		label: string;
		/** The icon color, `--rail-c`: the source hue lifted on this theme's rail */
		color: string;
		/** The source hue, before the lift; the count badge derives its own fill from it */
		hue: string;
		active: boolean;
		/** The count the pill shows; 0 shows none */
		count: number;
		item?: RailItem;
		pin?: RailPin;
		action?: RailAction;
		select: () => void;
	}

	let railBg = $derived(themeSurface(appliedThemeStore, 'rail-bg'));

	/** A source hue (a `var(--type-*)` resolved) as drawn on the applied theme's rail; as is before a theme is applied. */
	function onRail(hue: string): string {
		const value = resolveThemeColor(appliedThemeStore, hue);
		return railBg && value ? railIconColor(value, railBg) : hue;
	}

	function itemRow(item: RailItem): Row {
		const hue = railItemColor(item.key);
		return {
			key: item.key,
			label: item.label,
			color: onRail(hue),
			hue,
			// A Tabs item is never picked, so it follows the active tab instead.
			active: item.tabPath ? editorStore.activeTabPath === item.tabPath : item.key === activeItem,
			count: item.key === 'inbox' && showsInboxBadge ? inboxCount : 0,
			item,
			select: () => onSelect(item.key),
		};
	}

	function pinRow(pin: RailPin): Row {
		const hue = iconColorCss(resolveIconForPath(pin.path)?.color) ?? RAIL_PIN_COLOR;
		return {
			key: pin.key,
			label: pin.label,
			color: onRail(hue),
			hue,
			// A click on a view that opens in the editor does not pick it, so its pin also follows the active tab, like its Views row.
			active: pin.key === activeItem || (pin.opensInEditor && editorStore.activeTabPath === pin.path),
			count: 0,
			pin,
			select: () => onSelect(pin.key, pin),
		};
	}

	/** Runs on click; never picked, so it has no highlight and is not saved as the rail item. */
	function actionRow(action: RailAction): Row {
		const hue = railActionColor(action.color, appliedThemeStore.isDark);
		return {
			key: action.key,
			label: action.label,
			// A declared color is the mod's own choice per mode and stays as declared.
			color: action.color ? hue : onRail(hue),
			hue,
			active: false,
			count: 0,
			action,
			select: () => action.run(),
		};
	}

	let topRows = $derived(topItems.map(itemRow));
	let navigatorRows = $derived(navigatorItems.map(itemRow));
	let tabRows = $derived(tabItems.map(itemRow));
	let pinRows = $derived(pinnedItems.map(pinRow));
	let actionRows = $derived(railRegistryStore.actions.map(actionRow));
	let bottomRows = $derived(bottomItems.map(itemRow));

	/**
	 * The icon an action's ref names, or undefined until its pack is loaded. Reading packVersion re-runs it when a
	 * pack arrives; whoever registers the action preloads the pack.
	 */
	function actionIcon(ref: string) {
		void fileIconsStore.packVersion;
		const parsed = parseIconValuePermissive(ref);
		return parsed ? getIconSync(parsed.iconPack, parsed.iconName) : undefined;
	}

	/** Where the running resize started; null while none runs. */
	let resizeStart: { x: number; width: number } | null = null;
	/**
	 * The width during a drag, null until its first move. It stays out of the store because `updateLayout` makes the
	 * persistence effect re-serialize every setting on each call and write after a 500 ms pause, so a per-move call
	 * would cost a full serialize per pointer event and a slow drag would write mid-way.
	 */
	let dragWidth = $state<number | null>(null);
	let width = $derived(dragWidth ?? parseRailWidth(settingsStore.layout.railWidth));
	let frameWidth = $derived(railFormWidth(style, collapsed, width));

	function startResize(event: PointerEvent & { currentTarget: HTMLButtonElement }) {
		// A right press opens the native context menu, which may swallow the pointerup and leave the resize running.
		if (event.button !== 0) return;
		resizeStart = { x: event.clientX, width };
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function moveResize(event: PointerEvent) {
		if (resizeStart) dragWidth = parseRailWidth(resizeStart.width + event.clientX - resizeStart.x);
	}

	function endResize() {
		if (dragWidth !== null) settingsStore.updateLayout({ railWidth: dragWidth });
		resizeStart = null;
		dragWidth = null;
	}

	/**
	 * As the rail shrinks, a draggable note row ends up under the pressed point; its native drag would cancel the
	 * pointer and stop the resize.
	 */
	function blockDragWhileResizing(event: DragEvent) {
		if (resizeStart) event.preventDefault();
	}
</script>

<svelte:window ondragstart={blockDragWhileResizing} />

<!--
	Outside the nav, which scrolls, and at the same spot in every form, so a second click always undoes the first: clear
	of the traffic lights, and past the captioned rail's edge.
-->
<button
	type="button"
	class="fixed top-[7px] left-[88px] z-40 shrink-0 rounded-md size-6 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-default"
	title={collapsed ? 'Expand rail' : 'Collapse rail'}
	aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}
	data-rail-collapse
	onclick={() => settingsStore.updateLayout({ railCollapsed: !collapsed })}
>
	<PanelLeft class="size-3.5" />
</button>

<div class="relative flex shrink-0" style:width="{frameWidth}px">
	<nav
		aria-label="Rail"
		class="flex w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto bg-rail-bg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden {classes.nav}"
		data-rail
		data-rail-form={form}
	>
		<!--
			Room for the macOS traffic lights (titleBarStyle Overlay), and a handle to drag the window. Continues the
			neighbouring headers, so the rail's edge starts below the lights; sticky so the rows never pass under them.
		-->
		<div class="sticky top-0 z-10 h-10 w-full shrink-0 bg-tab-bar" style="box-shadow: inset 0 -1px 0 var(--divider)" data-rail-strip data-tauri-drag-region></div>
		{#if form === 'labeled'}
			<div class="h-1.5 shrink-0"></div>
		{/if}
		{@render sectionTitle('Workspace')}
		{#each topRows as row (row.key)}
			{@render railRow(row)}
		{/each}
		{#if navigatorRows.length > 0}
			<div class="{classes.divider} shrink-0 bg-file-explorer-fg/25" data-rail-divider></div>
			{@render sectionTitle('Browse')}
			{#each navigatorRows as row (row.key)}
				{@render railRow(row)}
			{/each}
		{/if}
		{#if tabRows.length > 0}
			<div class="{classes.divider} shrink-0 bg-file-explorer-fg/25" data-rail-tabs-divider></div>
			<div class="flex shrink-0 flex-col {classes.group}" data-rail-tabs>
				{@render sectionTitle('Tabs')}
				{#each tabRows as row (row.key)}
					{@render railRow(row)}
				{/each}
			</div>
		{/if}
		{#if pinRows.length > 0}
			<div class="{classes.divider} shrink-0 bg-file-explorer-fg/25" data-rail-pinned-divider></div>
			<div class="flex shrink-0 flex-col {classes.group}" data-rail-pinned>
				{@render sectionTitle('Pinned')}
				{#each pinRows as row (row.key)}
					{@render railRow(row)}
				{/each}
			</div>
		{/if}
		{#if actionRows.length > 0}
			<div class="{classes.divider} shrink-0 bg-file-explorer-fg/25" data-rail-actions-divider></div>
			<div class="flex shrink-0 flex-col {classes.group}" data-rail-actions>
				{@render sectionTitle('Actions')}
				{#each actionRows as row (row.key)}
					{@render railRow(row)}
				{/each}
			</div>
		{/if}
		<div class="mt-auto flex shrink-0 flex-col {classes.bottom}" data-rail-bottom>
			{#each bottomRows as row (row.key)}
				{@render railRow(row)}
			{/each}
		</div>
	</nav>
	<!-- Outside the nav, which scrolls. -->
	<div class="pointer-events-none absolute top-10 right-0 bottom-0 w-px bg-file-explorer-border" data-rail-edge></div>
	{#if form === 'labeled'}
		<button
			type="button"
			class="absolute top-10 -right-1 bottom-0 z-30 w-2 shrink-0 cursor-col-resize touch-none transition-colors hover:bg-file-explorer-primary/40"
			aria-label="Resize rail"
			title="Drag to resize, double-click to reset"
			tabindex="-1"
			data-rail-resize
			onmousedown={(event) => event.preventDefault()}
			onpointerdown={startResize}
			onpointermove={moveResize}
			onpointerup={endResize}
			onpointercancel={endResize}
			ondblclick={() => settingsStore.updateLayout({ railWidth: RAIL_WIDTH.default })}
		></button>
	{/if}
</div>

{#snippet sectionTitle(text: string)}
	{#if form === 'labeled'}
		<div class="section-label text-rail-muted-fg shrink-0 px-4 pb-0.5" data-rail-section-title={text}>{text}</div>
	{/if}
{/snippet}

{#snippet icon(row: Row, sizeClass: string)}
	{@const resolved = row.pin ? resolveIconForPath(row.pin.path) : null}
	{@const Icon = row.item?.navigator?.icon ?? (row.item ? BUILT_IN_ICONS[row.item.key] : null)}
	{@const actionSvg = row.action ? actionIcon(row.action.icon) : undefined}
	{#if row.action}
		{#if actionSvg}
			<IconRenderer icon={actionSvg} class={sizeClass} />
		{:else}
			<Puzzle class={sizeClass} />
		{/if}
	{:else if Icon}
		<Icon class={sizeClass} />
	{:else if resolved?.icon}
		<!-- No color of its own: it inherits the lifted `--rail-c` from the wrapper. -->
		<IconRenderer icon={resolved.icon} class={sizeClass} />
	{:else if row.pin?.kind === 'view'}
		<Table class={sizeClass} />
	{:else}
		<FileText class={sizeClass} />
	{/if}
{/snippet}

{#snippet railRow(row: Row)}
	{@const busy = row.action?.busy?.() ?? false}
	<button
		class="relative shrink-0 cursor-default {classes.row} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset {row.active ? 'text-file-explorer-fg' : 'text-file-explorer-fg/85 hover:bg-file-explorer-fg/10 hover:text-file-explorer-fg'}"
		style:--rail-c={row.color}
		style:background-color={row.active ? `color-mix(in oklch, var(--rail-c) ${RAIL_ACTIVE_TINT * 100}%, transparent)` : undefined}
		title={row.label}
		aria-label={row.label}
		aria-current={row.active ? 'page' : undefined}
		aria-busy={busy || undefined}
		data-rail-item={row.key}
		onclick={row.select}
	>
		{#if row.active}
			<!-- The tint alone measures 1.06 to 1.45:1 on the rail; the bar is the 3:1 cue, the only one when collapsed. -->
			<span class="absolute inset-y-1 left-0 w-0.5 rounded-full" style:background-color="var(--rail-c)" aria-hidden="true" data-rail-active-bar></span>
		{/if}
		<span class="shrink-0" style:color="var(--rail-c)">{@render icon(row, classes.icon)}</span>
		{#if classes.title}
			<span class="{classes.title} text-rail {row.active ? 'font-medium' : ''}" data-rail-title>{row.label}</span>
		{/if}
		{#if row.count > 0}
			{@const badge = railBadgeColors(row.hue)}
			<span class="{classes.badge} text-label tabular-nums" style:background-color={badge.fill} style:color={badge.text} data-rail-badge>{row.count}</span>
		{/if}
		{#if busy}
			<span class="absolute top-1 right-1 size-1.5 animate-pulse rounded-full bg-file-explorer-primary" aria-hidden="true" data-rail-busy></span>
		{/if}
	</button>
{/snippet}
