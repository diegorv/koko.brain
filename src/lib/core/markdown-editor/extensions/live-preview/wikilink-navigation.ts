/**
 * Opens a wikilink target, mirroring the editor's click behaviour:
 * - Resolves against the file tree and opens if found.
 * - If not found and target matches a periodic note pattern, creates it via the periodic service.
 * - Otherwise creates a blank note at the target path.
 */
export async function openWikilinkTarget(target: string): Promise<void> {
	const { fsStore } = await import('$lib/core/filesystem/fs.store.svelte');
	const { flattenFileTree } = await import('$lib/features/quick-switcher/quick-switcher.logic');
	const { resolveWikilink } = await import('$lib/features/backlinks/backlinks.logic');
	const { openFileInEditor } = await import('$lib/core/editor/editor.service');

	const files = flattenFileTree(fsStore.fileTree);
	const allPaths = files.map((f) => f.path);
	let resolved = resolveWikilink(target, allPaths);

	if (!resolved) {
		const { detectPeriodicNoteType } = await import(
			'$lib/plugins/periodic-notes/periodic-notes.logic'
		);
		const { settingsStore } = await import('$lib/core/settings/settings.store.svelte');
		const periodicMatch = detectPeriodicNoteType(target, settingsStore.periodicNotes);
		if (periodicMatch) {
			const { openOrCreatePeriodicNoteForDate } = await import(
				'$lib/plugins/periodic-notes/periodic-notes.service'
			);
			await openOrCreatePeriodicNoteForDate(periodicMatch.periodType, periodicMatch.date);
			return;
		}
		const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');
		if (vaultStore.path) {
			const { createFile } = await import('$lib/core/filesystem/fs.service');
			const newPath = await createFile(vaultStore.path, `${target}.md`);
			if (!newPath) return;
			resolved = newPath;
		}
	}

	if (resolved) await openFileInEditor(resolved);
}
