<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";
	import { inCommandDialog } from "./command-dialog-context.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CommandPrimitive.ListProps = $props();

	const inDialog = inCommandDialog();
</script>

<CommandPrimitive.List
	bind:ref
	data-slot="command-list"
	class={cn(
		inDialog ? "max-h-[min(60vh,400px)]" : "max-h-[300px]",
		"scroll-py-1 overflow-x-hidden overflow-y-auto",
		className
	)}
	{...restProps}
/>
