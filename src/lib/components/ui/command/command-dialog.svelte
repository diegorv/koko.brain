<script lang="ts">
	import type { Command as CommandPrimitive, Dialog as DialogPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import Command from "./command.svelte";
	import { setCommandDialogContext } from "./command-dialog-context.js";
	import * as Dialog from "#lib/components/ui/dialog/index.js";
	import type { WithoutChildrenOrChild } from "#lib/utils.js";

	let {
		open = $bindable(false),
		ref = $bindable(null),
		value = $bindable(""),
		title = "Command Palette",
		description = "Search for a command to run",
		hints = [],
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.RootProps> &
		WithoutChildrenOrChild<CommandPrimitive.RootProps> & {
			portalProps?: DialogPrimitive.PortalProps;
			children: Snippet;
			title?: string;
			description?: string;
			/** Key hints for the one-line footer, in order; no hints renders no footer. */
			hints?: { keys: string; label: string }[];
		} = $props();

	setCommandDialogContext();
</script>

<Dialog.Root bind:open {...restProps}>
	<Dialog.Header class="sr-only">
		<Dialog.Title>{title}</Dialog.Title>
		<Dialog.Description>{description}</Dialog.Description>
	</Dialog.Header>
	<!-- Anchored near the top rather than centred, so the input stays put while the list shrinks or grows. Escape closes it, so no X. The height cap keeps the bottom edge 1rem above the viewport's. -->
	<Dialog.Content class="top-[18vh] translate-y-0 max-h-[calc(82dvh-1rem)] gap-0 overflow-hidden p-0" showCloseButton={false} {portalProps}>
		<Command
			class="[&_[data-command-group]]:px-2 [&_[data-command-group]:not([hidden])_~[data-command-group]]:pt-0"
			{...restProps}
			bind:value
			bind:ref
			{children}
		/>
		{#if hints.length > 0}
			<div
				data-slot="command-dialog-footer"
				class="text-muted-foreground flex items-center gap-4 border-t px-3 py-2 text-xs"
			>
				{#each hints as hint (hint.keys)}
					<span class="flex items-center gap-1.5">
						<kbd class="bg-muted rounded-xs border px-1.5 font-sans">{hint.keys}</kbd>
						{hint.label}
					</span>
				{/each}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
