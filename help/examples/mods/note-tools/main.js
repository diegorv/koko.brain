// Example vault mod. To try it, copy this folder to <vault>/_system/mods/note-tools/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Right-click a note in the rail's note list, or run the actions from the
// command palette on the open note. Uses ctx.app and ctx.labs: raw and
// experimental, with no compatibility promise.

/** The boolean frontmatter property the toggle flips */
const PROPERTY = 'reviewed';
const NOTE_EXTENSION = /\.(md|markdown)$/i;

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/**
 * The vault-relative path of the note to act on: the clicked note from a
 * menu, else the active tab. Call it before the first await, so a tab change
 * while a dialog is open cannot redirect the edit to another note.
 */
function targetNote(ctx, run) {
	let path;
	if (run.target) {
		if (run.target.on !== 'note') throw new Error('Pick a note, not a folder');
		path = run.target.path;
	} else {
		const tab = ctx.app.editorStore.activeTab;
		const root = `${ctx.app.vaultStore.path}/`;
		if (!tab || !tab.path.startsWith(root)) throw new Error('Open a note first');
		path = tab.path.slice(root.length);
	}
	if (!NOTE_EXTENSION.test(path)) throw new Error(`${path} is not a Markdown note`);
	return path;
}

/** Pure, as updateNoteFrontmatter requires: it can run twice for one call */
function toggled(props) {
	const on = props.some((p) => p.key === PROPERTY && p.value === true);
	const rest = props.filter((p) => p.key !== PROPERTY);
	return on ? rest : [...rest, { key: PROPERTY, value: true, type: 'boolean' }];
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'toggle-reviewed',
			title: `Toggle "${PROPERTY}"`,
			description: `Sets or removes ${PROPERTY}: true in the note's frontmatter`,
			run: async (_input, run) => {
				const path = targetNote(ctx, run);
				if (run.signal.aborted) return;
				let on = false;
				try {
					await ctx.app.updateNoteFrontmatter(`${ctx.app.vaultStore.path}/${path}`, (props) => {
						const next = toggled(props);
						// The last call is the one written, so its answer is the one reported.
						on = next.some((p) => p.key === PROPERTY);
						return next;
					});
				} catch (err) {
					// The editor already showed a toast for a failed save of an open tab.
					if (err?.reason === 'save-failed') return;
					throw new Error(`Cannot update ${path}: ${errorMessage(err)}`);
				}
				ctx.notify(`${path}: ${PROPERTY} ${on ? 'set' : 'removed'}`, { kind: 'success' });
			},
		});

		ctx.addAction({
			id: 'rename',
			title: 'Rename note',
			description: 'Asks for a new name; links to the note are updated',
			run: async (_input, run) => {
				const path = targetNote(ctx, run);
				const file = path.split('/').pop();
				const extension = file.match(NOTE_EXTENSION)[0];
				const current = file.slice(0, -extension.length);

				const answer = await run.ui.prompt({ title: 'Rename note', label: 'New name', value: current });
				// null is Cancel; '' is an empty submit.
				if (answer === null) return;
				const name = answer.trim();
				if (!name) throw new Error('Type a name');
				// Path characters, and those that end a [[link]] target early, so the note stays linkable.
				if (/[\\/:#|^[\]]/.test(name)) throw new Error('A name cannot hold / \\ : # | ^ [ or ]');
				// A dotfile leaves the file explorer and the index.
				if (name.startsWith('.')) throw new Error('A name cannot start with a dot');
				if (name === current) return;

				if (run.signal.aborted) return;
				// Renaming a note rewrites [[links]] to it in other notes.
				const renamed = await ctx.vault.rename(path, `${name}${extension}`);
				ctx.notify(`Renamed to ${renamed}`, { kind: 'success' });
			},
		});

		for (const id of ['toggle-reviewed', 'rename']) {
			ctx.labs.place(id, { palette: true, menu: { on: ['note'] } });
		}
		ctx.addRailButton({
			id: 'main',
			title: 'Note tools',
			icon: 'lucide:wrench',
			actions: ['toggle-reviewed', 'rename'],
		});
	},
};
