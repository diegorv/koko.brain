<script lang="ts">
	import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";
	import * as ResizablePrimitive from "paneforge";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		withHandle = false,
		...restProps
	}: WithoutChildrenOrChild<ResizablePrimitive.PaneResizerProps> & {
		withHandle?: boolean;
	} = $props();
</script>

<ResizablePrimitive.PaneResizer
	bind:ref
	data-slot="resizable-handle"
	class={cn(
		"resizable-handle group relative flex cursor-col-resize items-center justify-center transition-[background] duration-150",
		"w-[3px] data-[direction=vertical]:h-[3px] data-[direction=vertical]:w-full data-[direction=vertical]:cursor-row-resize",
		"after:absolute after:inset-y-0 after:start-1/2 after:w-3 after:cursor-col-resize after:-translate-x-1/2 after:content-['']",
		"data-[direction=vertical]:after:inset-x-0 data-[direction=vertical]:after:start-0 data-[direction=vertical]:after:h-3 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:cursor-row-resize data-[direction=vertical]:after:translate-x-0 data-[direction=vertical]:after:-translate-y-1/2",
		"focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
		className
	)}
	{...restProps}
>
	<div
		class={cn(
			"pointer-events-none z-10 flex items-center justify-center rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-100",
			"h-8 w-3.5 bg-primary/50 text-primary-foreground backdrop-blur-sm",
			"group-data-[direction=vertical]:h-3.5 group-data-[direction=vertical]:w-8 group-data-[direction=vertical]:rotate-90"
		)}
	>
		<GripVerticalIcon class="size-3" />
	</div>
</ResizablePrimitive.PaneResizer>

<style>
	:global(.resizable-handle) {
		background: linear-gradient(to bottom, var(--tab-bar) 2.5rem, var(--divider) 2.5rem);
	}
	:global(.resizable-handle:hover) {
		background: color-mix(in oklch, var(--primary) 40%, transparent);
	}
	:global(.resizable-handle:active) {
		background: color-mix(in oklch, var(--primary) 60%, transparent);
	}
</style>
