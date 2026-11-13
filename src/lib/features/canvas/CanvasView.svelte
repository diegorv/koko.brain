<script lang="ts">
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import CanvasInner from './CanvasInner.svelte';

	interface Props {
		/** Path of the .canvas file; fixed for the instance's lifetime (the parent keys it by path) */
		path: string;
		/** Raw JSON content of the .canvas file */
		jsonContent: string;
		/** Callback to persist changes into the tab of `path` */
		onJsonChange: (path: string, json: string) => void;
	}

	let { path, jsonContent, onJsonChange }: Props = $props();
</script>

<SvelteFlowProvider>
	<CanvasInner {path} {jsonContent} {onJsonChange} />
</SvelteFlowProvider>
