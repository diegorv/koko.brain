// Example vault mod. To try it, copy this folder to <vault>/_system/mods/dialogs-tour/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Every dialog goes through run.ui, so Stop closes the open one and the
// wizard ends there: an awaited run.ui call rejects with an AbortError, which
// the host reads as "cancelled", not "failed". Cancel (Esc) resolves instead:
// prompt to null, pick to null, confirm to false.

/** The notes this mod creates go here, so it never touches your own folders */
const FOLDER = 'Dialogs tour';

/** Extra fields on a pick item survive: pick resolves to the item itself */
const MOODS = [
	{ id: 'calm', title: 'Calm', description: 'Slow and steady', tag: 'mood/calm' },
	{ id: 'busy', title: 'Busy', description: 'Many things at once', tag: 'mood/busy' },
	{ id: 'tired', title: 'Tired', description: 'Running low', tag: 'mood/tired' },
];

/** Ends the tour on a user cancel; a toast, because a run without output closes by itself */
function cancelled(ctx, step) {
	ctx.notify(`Cancelled at the ${step} step; nothing was written`);
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'tour',
			title: 'Start the tour',
			description: `Five dialogs, then a note in "${FOLDER}"`,
			run: async (_input, run) => {
				const title = await run.ui.prompt({
					title: 'Name the note',
					message: 'Step 1 of 5: prompt. Esc cancels.',
					label: 'Title',
					placeholder: 'A day at the lake',
				});
				// '' is an empty submit, not a cancel: test for null.
				if (title === null) return cancelled(ctx, 'title');
				const name = title.trim().replace(/[/\\:]/g, '-');
				if (!name) throw new Error('Type a title');

				const mood = await run.ui.pick({ title: 'Step 2 of 5: pick a mood', items: MOODS });
				if (mood === null) return cancelled(ctx, 'mood');

				const body = await run.ui.prompt({
					title: 'Write a few lines',
					message: 'Step 3 of 5: a multiline prompt. Cmd+Enter submits.',
					multiline: true,
				});
				if (body === null) return cancelled(ctx, 'text');

				const path = `${FOLDER}/${name}.md`;
				const ok = await run.ui.confirm({
					title: 'Create the note?',
					message: `Step 4 of 5: confirm.\n${path}, tagged #${mood.tag}`,
					confirmLabel: 'Create',
				});
				if (!ok) return cancelled(ctx, 'confirm');

				// Step 5: loading runs the task at once, under a spinner. Its signal
				// aborts on Cancel and on Stop; on Stop the call also rejects right away
				// while the task goes on, so the task checks the signal before it writes.
				const created = await run.ui.loading('Creating the note', async (signal) => {
					if (await ctx.vault.exists(path)) throw new Error(`${path} already exists`);
					if (signal.aborted) return null;
					return ctx.vault.create(path, `# ${title.trim()}\n\n#${mood.tag}\n\n${body}\n`);
				}, { cancellable: true });
				if (created === null) return cancelled(ctx, 'loading');

				await run.ui.alert({ title: 'Done', message: `Created ${created}`, kind: 'success' });
				if (run.signal.aborted) return;
				await ctx.workspace.openNote(created);
			},
		});

		ctx.addRailButton({
			id: 'main',
			title: 'Dialogs tour',
			icon: 'lucide:messages-square',
			actions: ['tour'],
		});
	},
};
