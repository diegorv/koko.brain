<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';

	interface Props {
		/** Whether the dialog is open */
		open?: boolean;
		/** Key hints passed to the dialog's footer */
		hints?: { keys: string; label: string }[];
	}

	let { open = $bindable(false), hints }: Props = $props();
</script>

<!-- A command dialog with one row and no caller classes, so the test sees the primitives' own density. -->
<Command.Dialog bind:open {hints} title="Harness commands" description="Pick a command">
	<Command.Input placeholder="Type..." />
	<Command.List>
		<Command.Group>
			<Command.Item value="one">One</Command.Item>
		</Command.Group>
	</Command.List>
</Command.Dialog>
