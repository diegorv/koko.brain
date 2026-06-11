<script lang="ts">
	import CollectionView from '$lib/features/collection/CollectionView.svelte';

	interface HarnessApi {
		/** Simulates an EXTERNAL yaml change (not routed through onYamlChange). */
		setYaml: (yaml: string) => void;
		/** Reads the yaml the harness currently feeds the component. */
		getYaml: () => string;
	}

	interface Props {
		initialYaml: string;
		/** Receives the harness API at mount so tests can drive the prop. */
		register?: (api: HarnessApi) => void;
	}

	let { initialYaml, register }: Props = $props();

	/**
	 * Owns the yamlContent prop and round-trips onYamlChange back into it,
	 * mimicking the production parent (the collection tab persists the yaml
	 * and the updated content flows back down as a prop change).
	 *
	 * Capturing the initial prop values is intentional: the harness seeds
	 * once at mount and is driven afterwards via the registered API.
	 */
	// svelte-ignore state_referenced_locally
	let yamlContent = $state(initialYaml);

	// svelte-ignore state_referenced_locally
	register?.({
		setYaml: (yaml) => { yamlContent = yaml; },
		getYaml: () => yamlContent,
	});
</script>

<CollectionView {yamlContent} onYamlChange={(yaml) => { yamlContent = yaml; }} />
