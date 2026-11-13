<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';

	/**
	 * One right sidebar section: a `pane-toolbar` header (so the first one lines
	 * up with the note action bar's edge) with a chevron slot reserved on every
	 * section, so all titles start at one x, and a body on one left edge.
	 *
	 * Dividers sit under the header and under an open body, never above a
	 * section: a `border-t` would double the header's own edge under a
	 * collapsed section.
	 */
	interface Props {
		/** The section title, in sentence case. */
		title: string;
		/**
		 * Whether the body shows. Leave it undefined for a static section that
		 * never collapses; bind it to make the section collapsible.
		 */
		open?: boolean;
		/** Called when the person opens or closes the section from its header. */
		onOpenChange?: (open: boolean) => void;
		/** The section body. */
		children: Snippet;
	}

	let { title, open = $bindable(), onOpenChange, children }: Props = $props();

	const collapsible = $derived(open !== undefined);
</script>

{#snippet header(props: Record<string, unknown> = {})}
	<svelte:element
		this={collapsible ? 'button' : 'div'}
		{...props}
		class="pane-toolbar w-full text-left {collapsible ? 'cursor-pointer transition-colors hover:bg-right-sidebar-accent/50' : ''}"
		data-sidebar-section-header
	>
		<span class="flex size-3.5 shrink-0 items-center justify-center" data-sidebar-section-chevron>
			{#if collapsible}
				<ChevronRight class="size-3.5 text-right-sidebar-muted-fg transition-transform {open ? 'rotate-90' : ''}" />
			{/if}
		</span>
		<h2 class="text-title text-right-sidebar-primary">{title}</h2>
	</svelte:element>
{/snippet}

{#snippet body()}
	<div class="p-2 border-b border-divider" data-sidebar-section-body>
		{@render children()}
	</div>
{/snippet}

{#if collapsible}
	<Collapsible.Root bind:open={() => open ?? false, (value) => (open = value)} {onOpenChange} data-sidebar-section>
		<Collapsible.Trigger>
			{#snippet child({ props })}
				{@render header(props)}
			{/snippet}
		</Collapsible.Trigger>
		<Collapsible.Content>
			{@render body()}
		</Collapsible.Content>
	</Collapsible.Root>
{:else}
	<section data-sidebar-section>
		{@render header()}
		{@render body()}
	</section>
{/if}
