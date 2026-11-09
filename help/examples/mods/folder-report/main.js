// Example vault mod. To try it, copy this folder to <vault>/_system/mods/folder-report/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// Right-click a folder in Files and pick "Folder report: Report on this folder".
// ctx.labs (the menu placement) is experimental, with no compatibility promise.

/** Reports go here, so the mod never writes into the folders it reads */
const REPORT_FOLDER = 'Folder report';
/** Only the text between these markers is regenerated; the rest of the note is the user's */
const START = '<!-- folder-report:generated:start v1 -->';
const END = '<!-- folder-report:generated:end -->';
/** Keeps a huge folder's report readable */
const MAX_LISTED = 200;

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** A wikilink to the note, or plain text when its path would break the link syntax */
function link(path) {
	const target = path.replace(/\.md$/i, '');
	return /[[\]|#^\\]/.test(target) ? target : `[[${target}]]`;
}

/**
 * `text` with the generated block replaced by `block`. Refuses unless the
 * note holds exactly one start and one end marker, each alone on its line, in
 * order: an edited marker is the user's to fix, not something to guess at.
 */
function replaceBlock(text, block) {
	const lines = text.split('\n');
	const start = lines.indexOf(START);
	const end = lines.indexOf(END);
	const count = (marker) => lines.filter((line) => line === marker).length;
	if (start < 0 || end < start || count(START) !== 1 || count(END) !== 1) {
		throw new Error('The report markers were edited or removed; restore them or delete the report note');
	}
	return [...lines.slice(0, start), block, ...lines.slice(end + 1)].join('\n');
}

/** Every Markdown note under `folder`, listing one folder at a time so Stop takes effect between them */
async function walk(ctx, folder, run) {
	const notes = [];
	const queue = [folder];
	let listed = 0;
	while (queue.length > 0) {
		if (run.signal.aborted) return null;
		const current = queue.shift();
		let entries;
		try {
			entries = await ctx.vault.list(current);
		} catch (err) {
			throw new Error(`Cannot list ${current}: ${errorMessage(err)}`);
		}
		for (const entry of entries) {
			if (entry.isFolder) queue.push(entry.path);
			else if (/\.md$/i.test(entry.name)) notes.push(entry.path);
		}
		run.progress(++listed, listed + queue.length, current);
	}
	return { notes: notes.sort(), folders: listed };
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'report',
			title: 'Report on this folder',
			description: `Lists the folder's notes in a note under "${REPORT_FOLDER}"`,
			run: async (_input, run) => {
				if (run.target?.on !== 'folder') throw new Error('Right-click a folder in Files to run this');
				const folder = run.target.path;
				// '' is the vault root: a report of every note is not what this example is for.
				if (folder === '') throw new Error('Pick a folder, not the vault root');
				if (folder === REPORT_FOLDER || folder.startsWith(`${REPORT_FOLDER}/`)) {
					throw new Error(`"${REPORT_FOLDER}" holds the reports themselves`);
				}

				const found = await walk(ctx, folder, run);
				if (!found) return;
				const path = `${REPORT_FOLDER}/${folder.replaceAll('/', ' - ')}.md`;
				const ok = await run.ui.confirm({
					title: 'Write the report?',
					message: `${found.notes.length} notes in ${found.folders} folders. The report goes to ${path}.`,
					confirmLabel: 'Write',
				});
				if (!ok) return;

				const listed = found.notes.slice(0, MAX_LISTED).map((note) => `- ${link(note)}`);
				if (found.notes.length > MAX_LISTED) listed.push(`- and ${found.notes.length - MAX_LISTED} more`);
				const block = [
					START,
					`Generated ${new Date().toLocaleString()}: ${found.notes.length} notes in ${found.folders} folders.`,
					'',
					...listed,
					END,
				].join('\n');

				if (run.signal.aborted) return;
				if (await ctx.vault.exists(path)) {
					const before = await ctx.vault.read(path);
					const after = replaceBlock(before, block);
					if (run.signal.aborted) return;
					// write refuses a note with unsaved edits in an open tab, so nothing typed is lost.
					if (after !== before) await ctx.vault.write(path, after);
				} else {
					if (run.signal.aborted) return;
					await ctx.vault.create(path, `# Report: ${folder}\n\nYour notes here are kept when the report is regenerated.\n\n${block}\n`);
				}
				run.log(`Wrote ${path}`);
				await ctx.workspace.openNote(path);
			},
		});
		ctx.labs.place('report', { menu: { on: ['folder'] } });
	},
};
