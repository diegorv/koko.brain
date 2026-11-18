<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import Pin from '@lucide/svelte/icons/pin';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Network from '@lucide/svelte/icons/network';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/kanban';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import Tag from '@lucide/svelte/icons/tag';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { untrack, type Snippet } from 'svelte';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { switchTab, closeTab, togglePinTab } from '#lib/core/editor/editor.service.js';
	import { isTabDirty, isTabPinned, isVirtualTab } from '#lib/core/editor/editor.logic.js';
	import { hidesRightSidebar } from '#lib/core/layout/layout.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
	} from '#lib/components/ui/dropdown-menu/index.js';
	import type { EditorTab } from '#lib/core/editor/editor.types.js';
	import { countHiddenTabs, edgeFades } from './editor-tabs.logic';

	let {
		tabIcon,
		tabTitleColor,
	}: {
		/** Renders the icon of a tab with no fixed type icon (a note or file). Without it, a plain file icon. */
		tabIcon?: Snippet<[EditorTab]>;
		/** Color of a tab's title, or undefined for the theme default. */
		tabTitleColor?: (path: string) => string | undefined;
	} = $props();

	/** The scrolling tab strip, set once it renders (it only exists while tabs are open). */
	let strip = $state<HTMLElement>();

	// The strip scrolls horizontally and nothing else moves it, so a tab that
	// becomes active (opened at the end, cycled to, restored) could sit off-strip.
	// The path catches a new tab at the same index (pinned insert, closing the
	// active tab). It goes through a `$derived` because the store getter reads
	// `tabs.length`: tracked directly, closing any other tab would pull a strip
	// the user scrolled away back to the active tab.
	const activePath = $derived(editorStore.activeTabPath);
	$effect(() => {
		const index = editorStore.activeIndex;
		void activePath;
		strip?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	});

	/** Width of each edge fade; also the scroller's scroll padding, so the reveal above stops clear of it. */
	const FADE_WIDTH = 34;

	/** Which strip edges have tabs scrolled past them. */
	let fades = $state({ left: false, right: false });
	/** How many tabs are off screen, shown on the list button. */
	let hiddenCount = $state(0);

	function measure(): void {
		if (!strip) return;
		fades = edgeFades(strip.scrollLeft, strip.clientWidth, strip.scrollWidth);
		const tabs = [...strip.querySelectorAll('[role="tab"]')].map((tab) => tab.getBoundingClientRect());
		hiddenCount = countHiddenTabs(strip.getBoundingClientRect(), tabs);
	}

	$effect(() => {
		if (!strip) return;
		const observer = new ResizeObserver(() => measure());
		observer.observe(strip);
		return () => observer.disconnect();
	});

	// A new or closed tab changes the strip's content but not its size, so the observer misses it.
	$effect(() => {
		void editorStore.tabs.length;
		void strip;
		untrack(measure);
	});

	/** Turns a mostly vertical wheel over an overflowing strip into sideways scroll. */
	function handleWheel(event: WheelEvent): void {
		const el = event.currentTarget as HTMLElement;
		if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
		el.scrollLeft += event.deltaY;
		event.preventDefault();
	}

	// With the right sidebar hidden its toggle floats over the strip's right end (AppShell),
	// so the strip stops short of it. Tabs in hidesRightSidebar show no toggle.
	const reservesToggle = $derived(!hidesRightSidebar(editorStore.activeTabPath) && !settingsStore.layout.rightSidebarVisible);
</script>

{#snippet kindIcon(tab: EditorTab)}
	{#if tab.fileType === 'tasks'}
		<ListChecks class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tab.fileType === 'graph'}
		<Network class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tab.fileType === 'canvas'}
		<LayoutDashboard class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tab.fileType === 'kanban'}
		<Kanban class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tab.fileType === 'event-calendar'}
		<CalendarRange class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tab.fileType === 'tags'}
		<Tag class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tabIcon}
		{@render tabIcon(tab)}
	{:else}
		<FileText class="size-3.5 shrink-0 text-muted-foreground" />
	{/if}
{/snippet}

{#if editorStore.tabs.length > 0}
	<!-- Both this wrapper and the scroller are drag regions, or the empty strip right of the last tab stops dragging the window. -->
	<div class="tab-strip relative flex items-end h-10 bg-tab-bar {reservesToggle ? 'pr-10' : ''}" data-tab-strip data-tauri-drag-region>
		<div class="relative flex-1 min-w-0 h-full">
			<div
				bind:this={strip}
				class="editor-tabs-bar flex items-end h-full overflow-x-auto pt-1 px-1 gap-0.5"
				style:scroll-padding-inline="{FADE_WIDTH}px"
				role="tablist"
				data-tauri-drag-region
				onscroll={measure}
				onwheel={handleWheel}
			>
				{#each editorStore.tabs as tab, index}
					{@const pinned = isTabPinned(tab)}
					<ContextMenu.Root>
						<!-- bits-ui wraps the tab in the trigger's own div, which is the strip's flex item, so the widths go here. -->
						<ContextMenu.Trigger class={pinned ? 'shrink-0' : 'flex-[0_1_220px] min-w-[100px]'}>
							{#snippet children()}
								<div
									class="group flex items-center gap-1.5 w-full min-w-0 h-8 border-b-2 rounded-t-lg text-sm cursor-pointer select-none transition-colors
										{pinned ? 'px-2' : 'px-3'}
										{index === editorStore.activeIndex
											? 'bg-editor-bg text-tab-text-active border-b-primary'
											: 'bg-tab-bar text-tab-text-inactive border-b-transparent hover:bg-muted/30'}"
									role="tab"
									tabindex="0"
									aria-selected={index === editorStore.activeIndex}
									onclick={() => switchTab(index)}
									onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab(index); }}
								>
									{#if isTabDirty(tab) && !isVirtualTab(tab)}
										<span class="size-2 rounded-full bg-foreground shrink-0"></span>
									{/if}
									{#if pinned}
										<Pin class="size-3 shrink-0 text-muted-foreground" />
									{/if}
									{@render kindIcon(tab)}
									{#if !pinned}
										<span class="min-w-0 truncate" style:color={tabTitleColor?.(tab.path) || undefined}>{tab.name}</span>
										<button
											class="ml-1 rounded-xs p-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-muted transition-opacity
												{index === editorStore.activeIndex ? 'opacity-100' : ''}"
											onclick={(e) => { e.stopPropagation(); closeTab(index); }}
											aria-label="Close {tab.name}"
										>
											<X class="size-3" />
										</button>
									{/if}
								</div>
							{/snippet}
						</ContextMenu.Trigger>
						<ContextMenu.Content class="w-48">
							<ContextMenu.Item onclick={() => togglePinTab(index)}>
								<Pin class="size-4" />
								{pinned ? 'Unpin tab' : 'Pin tab'}
							</ContextMenu.Item>
							{#if !pinned}
								<ContextMenu.Item onclick={() => closeTab(index)}>
									<X class="size-4" />
									Close tab
								</ContextMenu.Item>
							{/if}
						</ContextMenu.Content>
					</ContextMenu.Root>
				{/each}
			</div>
			{#if fades.left}
				<div class="pointer-events-none absolute inset-y-0 left-0 bg-linear-to-r from-tab-bar from-20% to-transparent" style:width="{FADE_WIDTH}px" data-tab-fade="left"></div>
			{/if}
			{#if fades.right}
				<div class="pointer-events-none absolute inset-y-0 right-0 bg-linear-to-l from-tab-bar from-20% to-transparent" style:width="{FADE_WIDTH}px" data-tab-fade="right"></div>
			{/if}
		</div>
		<DropdownMenu>
			<DropdownMenuTrigger
				class="relative mb-0.5 mx-0.5 inline-flex h-7 w-6.5 shrink-0 items-center justify-center rounded-md text-tab-text-inactive hover:bg-muted/60 hover:text-foreground data-[state=open]:bg-muted/60 data-[state=open]:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-default"
				aria-label="List all tabs"
				title="List all tabs"
			>
				<ChevronDown class="size-3.5" />
				{#if hiddenCount > 0}
					<span class="absolute -top-0.5 -right-1 min-w-3 rounded-md bg-primary px-[3px] text-center text-[11px] font-bold leading-3 text-primary-foreground" data-hidden-tabs>{hiddenCount}</span>
				{/if}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-68 max-h-96 overflow-y-auto">
				{#each editorStore.tabs as tab, index}
					{@const active = index === editorStore.activeIndex}
					<DropdownMenuItem onclick={() => switchTab(index)} aria-current={active ? 'true' : undefined} class={active ? 'font-medium bg-accent/50' : ''}>
						{#if isTabDirty(tab) && !isVirtualTab(tab)}
							<span class="size-2 shrink-0 rounded-full bg-foreground" data-dirty-dot></span>
						{:else}
							<span class="size-2 shrink-0" aria-hidden="true"></span>
						{/if}
						{@render kindIcon(tab)}
						<span class="min-w-0 truncate">{tab.name}</span>
						{#if isTabPinned(tab)}
							<Pin class="ml-auto size-3 text-muted-foreground" data-pin-mark />
						{/if}
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
{/if}

<style>
	.tab-strip {
		box-shadow: inset 0 -1px 0 var(--divider);
	}
</style>
