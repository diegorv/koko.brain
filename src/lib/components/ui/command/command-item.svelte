<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";
	import { inCommandDialog } from "./command-dialog-context.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CommandPrimitive.ItemProps = $props();

	// A minimum, not a fixed height, so a row with a second line (a mod action's description) is not clipped.
	const dense = inCommandDialog();
</script>

<CommandPrimitive.Item
	bind:ref
	data-slot="command-item"
	class={cn(
		"aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		dense && "min-h-9",
		className
	)}
	{...restProps}
/>
