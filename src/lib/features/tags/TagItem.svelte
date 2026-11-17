<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import type { TagTreeNode } from './tags.types';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { getTagColor } from '#lib/utils/tag-colors.js';
	import TagColorDot from './TagColorDot.svelte';
	import TagColorPicker from './TagColorPicker.svelte';
	import Self from './TagItem.svelte';

	interface Props {
		node: TagTreeNode;
		onTagClick: (tag: string) => void;
		onColorChange: (tag: string, color: string | undefined) => void;
		/** Full paths shown expanded whatever the row's own state, while a filter query holds them open. */
		forceOpen?: ReadonlySet<string>;
	}

	let { node, onTagClick, onColorChange, forceOpen = new Set<string>() }: Props = $props();

	/** The user's own expansion, kept while a forced open overrides it. */
	let open = $state(false);
	let forced = $derived(forceOpen.has(node.fullPath));
	let isOpen = $derived(open || forced);
	let hasChildren = $derived(node.children.length > 0);

	function getColor() {
		return getTagColor(node.fullPath, settingsStore.tagColors.colors);
	}
</script>

{#if hasChildren}
	<!-- A forced row ignores the chevron, so the user's own state is intact when the query clears. -->
	<Collapsible.Root
		bind:open={
			() => isOpen,
			(next) => {
				if (!forced) open = next;
			}
		}
	>
		<div class="flex items-center">
			<Collapsible.Trigger
				class="flex w-5 shrink-0 items-center justify-center p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
				aria-label="Subtags of {node.fullPath}"
				title="Subtags of {node.fullPath}"
			>
				<ChevronRight class="size-3 shrink-0 transition-transform {isOpen ? 'rotate-90' : ''}" />
			</Collapsible.Trigger>
			<TagColorPicker
				currentColor={getColor()}
				label="Color of {node.fullPath}"
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
					<Self node={child} {onTagClick} {onColorChange} {forceOpen} />
				{/each}
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
{:else}
	<div class="flex items-center">
		<!-- Holds the place of a parent's chevron so leaf dots, names and counts line up with it. -->
		<span class="w-5 shrink-0" aria-hidden="true"></span>
		<TagColorPicker
			currentColor={getColor()}
			label="Color of {node.fullPath}"
			onSelect={(color) => onColorChange(node.fullPath, color)}
		>
			<TagColorDot color={getColor()} />
		</TagColorPicker>
		<button
			class="flex items-center gap-1.5 flex-1 min-w-0 rounded-md px-1 py-1 hover:bg-accent transition-colors cursor-pointer"
			onclick={() => onTagClick(node.fullPath)}
		>
			<span class="text-[14px] truncate">{node.segment}</span>
			<span class="ml-auto text-xs text-muted-foreground shrink-0">{node.count}</span>
		</button>
	</div>
{/if}
