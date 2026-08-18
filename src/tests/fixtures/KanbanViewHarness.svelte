<script lang="ts">
	import KanbanView from '$lib/plugins/kanban/KanbanView.svelte';

	interface HarnessApi {
		/** Simulates an EXTERNAL content change (not routed through onContentChange). */
		setMarkdown: (markdown: string) => void;
		/** Reads the markdown the harness currently feeds the component. */
		getMarkdown: () => string;
		/** How many times the component asked the parent to persist. */
		getPersistCount: () => number;
	}

	interface Props {
		initialMarkdown: string;
		/** Receives the harness API at mount so tests can drive the prop. */
		register?: (api: HarnessApi) => void;
	}

	let { initialMarkdown, register }: Props = $props();

	/**
	 * Owns the markdownContent prop and round-trips onContentChange back into it,
	 * mimicking the production parent (the editor tab persists the markdown and
	 * the updated content flows back down as a prop change).
	 *
	 * Capturing the initial prop values is intentional: the harness seeds once at
	 * mount and is driven afterwards via the registered API.
	 */
	// svelte-ignore state_referenced_locally
	let markdownContent = $state(initialMarkdown);
	let persistCount = 0;

	// svelte-ignore state_referenced_locally
	register?.({
		setMarkdown: (markdown) => { markdownContent = markdown; },
		getMarkdown: () => markdownContent,
		getPersistCount: () => persistCount,
	});
</script>

<KanbanView {markdownContent} onContentChange={(markdown) => { persistCount += 1; markdownContent = markdown; }} />
