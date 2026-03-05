<script lang="ts">
	import { X, FileText, Pin, ListChecks, Network, LayoutDashboard, Kanban } from 'lucide-svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { switchTab, closeTab, togglePinTab } from '$lib/core/editor/editor.service';
	import { isTabDirty, isTabPinned, isVirtualTab } from '$lib/core/editor/editor.logic';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
	import { extractIconFromFrontmatter } from '$lib/features/file-icons/file-icons.logic';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';
</script>

{#if editorStore.tabs.length > 0}
	<div class="flex items-end h-10 bg-tab-bar overflow-x-auto pt-1 px-1 gap-0.5" role="tablist" data-tauri-drag-region>
		{#each editorStore.tabs as tab, index}
			{@const customEntry = fileIconsStore.getIcon(tab.path)}
			{@const customIcon = customEntry ? getIconSync(customEntry.iconPack, customEntry.iconName) : undefined}
			{@const frontmatterRef = extractIconFromFrontmatter(tab.content)}
			{@const frontmatterIcon = frontmatterRef ? getIconSync(frontmatterRef.iconPack, frontmatterRef.iconName) : undefined}
			{@const tabIcon = frontmatterIcon ?? customIcon}
			{@const tabTextColor = frontmatterIcon ? undefined : customEntry?.textColor}
			{@const pinned = isTabPinned(tab)}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet children()}
						<div
							class="group flex items-center gap-1.5 rounded-t-lg py-1.5 text-sm cursor-pointer select-none shrink-0 transition-colors
								{pinned ? 'px-2' : 'px-3'}
								{index === editorStore.activeIndex
									? 'bg-card text-tab-text-active border-b-2 border-b-primary'
									: 'bg-tab-bar text-tab-text-inactive hover:bg-muted/30'}"
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
							{#if tab.fileType === 'tasks'}
								<ListChecks class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'graph'}
								<Network class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'canvas'}
								<LayoutDashboard class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'kanban'}
								<Kanban class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tabIcon}
								<IconRenderer icon={tabIcon} class="size-3.5 shrink-0" color={frontmatterIcon ? undefined : customEntry?.color} />
							{:else}
								<FileText class="size-3.5 shrink-0 text-muted-foreground" />
							{/if}
							{#if !pinned}
								<span class="truncate max-w-40" style:color={tabTextColor || undefined}>{tab.name}</span>
								<button
									class="ml-1 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity
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
						<Pin class="mr-2 size-4" />
						{pinned ? 'Unpin Tab' : 'Pin Tab'}
					</ContextMenu.Item>
					{#if !pinned}
						<ContextMenu.Separator />
						<ContextMenu.Item onclick={() => closeTab(index)}>
							<X class="mr-2 size-4" />
							Close Tab
						</ContextMenu.Item>
					{/if}
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/each}
	</div>
{/if}
