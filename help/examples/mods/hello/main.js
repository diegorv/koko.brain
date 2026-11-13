// Example vault mod. To try it, copy this folder to <vault>/_system/mods/hello/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md

/** The notes this mod creates go here, so it never touches your own folders */
const FOLDER = 'Hello mod';

/**
 * A title as one safe file name without extension; '' when nothing is left (the caller refuses it).
 * Replaces path separators, ":", the characters that end a [[link]] target (# | ^ [ ]) and control
 * characters; drops leading dots (a dotfile is hidden); caps the name at 200 UTF-8 bytes.
 */
function safeName(title) {
	const MAX_BYTES = 200;
	const cleaned = String(title)
		.replace(/[\\/:#|^[\]]/g, ' ')
		.replace(/\p{Cc}/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^[.\s]+/, '');
	const encoder = new TextEncoder();
	let name = '';
	let bytes = 0;
	for (const char of cleaned) {
		bytes += encoder.encode(char).length;
		if (bytes > MAX_BYTES) break;
		name += char;
	}
	return name.trim();
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'say-hello',
			title: 'Say hello',
			description: 'Shows a toast',
			run: () => ctx.notify('Hello from a mod'),
		});

		ctx.addAction({
			id: 'new-note',
			title: 'New note',
			description: `Creates a note in "${FOLDER}" and opens it`,
			input: { placeholder: 'Note title' },
			run: async (text, run) => {
				const title = text.trim();
				const name = safeName(title);
				// Enter on an empty field runs the action with ''.
				if (!name) throw new Error('Type a title with at least one letter or digit');
				const path = `${FOLDER}/${name}.md`;

				// Stop aborts run.signal: check it between steps.
				if (run.signal.aborted) return;
				await ctx.vault.create(path, `# ${title}\n\nCreated by the hello mod.\n`);
				if (run.signal.aborted) return;
				// No run.log or run.progress: a run with output stays open on Done, on top of the note.
				await ctx.workspace.openNote(path);
			},
		});

		ctx.addRailButton({
			id: 'main',
			title: 'Hello',
			icon: 'lucide:sparkles',
			actions: ['say-hello', 'new-note'],
		});
	},
};
