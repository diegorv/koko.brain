// Example vault mod. To try it, copy this folder to <vault>/_system/mods/hello/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md

/** The notes this mod creates go here, so it never touches your own folders */
const FOLDER = 'Hello mod';

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
				// Enter on an empty field runs the action with ''.
				if (!title) throw new Error('Type a title');
				// A "/" would make a subfolder; ":" and "\" are awkward in file names.
				const path = `${FOLDER}/${title.replace(/[/\\:]/g, '-')}.md`;

				// Stop aborts run.signal: check it between steps.
				if (run.signal.aborted) return;
				run.progress(0, 2, 'Creating the note');
				await ctx.vault.create(path, `# ${title}\n\nCreated by the hello mod.\n`);
				run.log(`Created ${path}`);

				if (run.signal.aborted) return;
				run.progress(1, 2, 'Opening it');
				await ctx.workspace.openNote(path);
				run.progress(2, 2, 'Done');
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
