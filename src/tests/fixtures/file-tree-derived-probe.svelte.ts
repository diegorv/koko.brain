import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';

/**
 * Subscribes an effect to a `$derived` over `fsStore.fileTree` (the root
 * paths) and exposes the latest derived value and a disposer.
 */
export function probeFileTreeDerived(): { paths: () => string[]; dispose: () => void } {
	let latest: string[] = [];
	const dispose = $effect.root(() => {
		const paths = $derived(fsStore.fileTree.map((n) => n.path));
		$effect(() => {
			latest = paths;
		});
	});
	return { paths: () => latest, dispose };
}
