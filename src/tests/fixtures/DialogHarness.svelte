<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';

	interface Props {
		/** Whether the dialog is open */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();
</script>

<!-- The shadcn dialog with no caller classes, so the test sees the content's own surface and radius. -->
<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Title>Harness dialog</Dialog.Title>
		<p>Body</p>
	</Dialog.Content>
</Dialog.Root>
