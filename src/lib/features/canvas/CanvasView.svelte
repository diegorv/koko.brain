<script lang="ts">
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import CanvasInner from './CanvasInner.svelte';

	interface Props {
		/** Raw JSON content of the .canvas file */
		jsonContent: string;
		/** Callback to persist changes */
		onJsonChange: (json: string) => void;
	}

	let { jsonContent, onJsonChange }: Props = $props();
</script>

<SvelteFlowProvider>
	<CanvasInner {jsonContent} {onJsonChange} />
</SvelteFlowProvider>
