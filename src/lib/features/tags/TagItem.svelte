<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import type { TagTreeNode } from './tags.types';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { getTagColor } from './tag-colors.logic';
	import TagColorDot from './TagColorDot.svelte';
	import TagColorPicker from './TagColorPicker.svelte';
	import Self from './TagItem.svelte';

	interface Props {
		node: TagTreeNode;
		onTagClick: (tag: string) => void;
		onColorChange: (tag: string, color: string | undefined) => void;
	}

	let { node, onTagClick, onColorChange }: Props = $props();

	let open = $state(false);
	let hasChildren = $derived(node.children.length > 0);

	function getColor() {
		return getTagColor(node.fullPath, settingsStore.tagColors.colors);
	}
</script>

{#if hasChildren}
	<Collapsible.Root bind:open>
		<div class="flex items-center">
			<Collapsible.Trigger class="flex items-center p-1 rounded-md hover:bg-accent transition-colors cursor-pointer shrink-0">
				<ChevronRight class="size-3 shrink-0 transition-transform {open ? 'rotate-90' : ''}" />
			</Collapsible.Trigger>
			<TagColorPicker
				currentColor={getColor()}
				onSelect={(color) => onColorChange(node.fullPath, color)}
			>
				<TagColorDot color={getColor()} />
			</TagColorPicker>
			<button
				class="flex items-center gap-1.5 flex-1 min-w-0 rounded-md px-1 py-1 hover:bg-accent transition-colors cursor-pointer"
				onclick={() => onTagClick(node.fullPath)}
			>
				<span class="text-[14px] truncate">{node.segment}</span>
				<span class="ml-auto text-xs text-muted-foreground shrink-0">{node.totalCount}</span>
			</button>
		</div>
		<Collapsible.Content>
			<div class="pl-4 space-y-0.5">
				{#each node.children as child (child.fullPath)}
					<Self node={child} {onTagClick} {onColorChange} />
				{/each}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
{:else}
	<div class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent transition-colors">
		<TagColorPicker
			currentColor={getColor()}
			onSelect={(color) => onColorChange(node.fullPath, color)}
		>
			<TagColorDot color={getColor()} />
		</TagColorPicker>
		<button
			class="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
			onclick={() => onTagClick(node.fullPath)}
		>
			<span class="text-[14px] truncate">{node.segment}</span>
			<span class="ml-auto text-xs text-muted-foreground shrink-0">{node.count}</span>
		</button>
	</div>
{/if}
