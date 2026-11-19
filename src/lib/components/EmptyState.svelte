<script lang="ts">
	import type { Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { cn } from '#lib/utils.js';

	/**
	 * A list or panel with nothing to show: why, and what to do next. A shared
	 * primitive, so it imports nothing from core, features or plugins.
	 */
	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
		/** The one-line cause */
		title: string;
		/** The next step, under the title */
		hint?: string;
		/** The icon shown in a tinted circle above the title */
		icon?: Component;
		/** A button under the hint that undoes the cause */
		action?: { label: string; onclick: () => void };
		/** One muted line with the title only, for a state inside a list */
		compact?: boolean;
		/** A spinner in place of the icon, for a state still loading */
		spinner?: boolean;
		/** Extra classes on the root, e.g. its tone */
		class?: string;
	}

	let { title, hint, icon: Icon, action, compact = false, spinner = false, class: className, ...rest }: Props = $props();
</script>

{#if compact}
	<p class={cn('px-2 py-1 text-meta text-muted-foreground', className)} {...rest}>{title}</p>
{:else}
	<div class={cn('flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center', className)} {...rest}>
		{#if spinner}
			<LoaderCircle class="size-5 animate-spin text-primary" aria-hidden="true" />
		{:else if Icon}
			<span class="mb-1 grid size-9 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden="true" data-empty-state-icon>
				<Icon class="size-4" />
			</span>
		{/if}
		<p class="max-w-full break-words text-row font-semibold" data-empty-state-title>{title}</p>
		{#if hint}
			<p class="max-w-56 text-meta text-muted-foreground" data-empty-state-hint>{hint}</p>
		{/if}
		{#if action}
			<button
				type="button"
				class="mt-1.5 cursor-default rounded-md border border-border px-2.5 py-1 text-meta transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
				onclick={action.onclick}
				data-empty-state-action
			>
				{action.label}
			</button>
		{/if}
	</div>
{/if}
