// Example vault mod. To try it, copy this folder to <vault>/_system/mods/click-counter/
// and turn on Settings > Labs > Vault mods. Guide: help/documentation/28-mods.md,
// reference: help/documentation/mods/README.md
//
// The data lives in <vault>/.kokobrain/mods/click-counter/data.json, outside
// the notes: search, file history and the file tree never see it.

/** Bump it when the shape changes, and convert older data in readData */
const VERSION = 1;
const DEFAULTS = { version: VERSION, count: 0, step: 1 };
const STEPS = [1, 5, 10];

/** Anything thrown, as text: a Tauri rejection is a bare string, not an Error */
function errorMessage(err) {
	const message = err?.message;
	return typeof message === 'string' ? message : String(err);
}

/** Whether `data` is exactly the shape this version saves */
function isCounterData(data) {
	return (
		typeof data === 'object' && data !== null && !Array.isArray(data) &&
		Object.keys(data).length === 3 && data.version === VERSION &&
		Number.isSafeInteger(data.count) && data.count >= 0 && STEPS.includes(data.step)
	);
}

/**
 * The saved data, or the defaults when there is none. A data.json that is not
 * valid JSON was already moved aside by the host, so starting over cannot
 * overwrite it. Data of an unknown shape throws: saving over it would lose it.
 */
async function readData(ctx) {
	let data;
	try {
		data = await ctx.loadData();
	} catch (err) {
		if (err?.name !== 'ModDataCorruptError') throw new Error(`Cannot read the counter: ${errorMessage(err)}`);
		ctx.notify(`The saved counter was not valid JSON; it was kept in ${err.corruptPath} and the counter starts over`, { kind: 'warning' });
		return { ...DEFAULTS };
	}
	if (data === null) return { ...DEFAULTS };
	if (!isCounterData(data)) throw new Error('The saved counter has an unknown shape; it was left unchanged');
	return data;
}

export default {
	onload(ctx) {
		ctx.addAction({
			id: 'click',
			title: 'Click',
			description: 'Adds the step to the counter',
			run: async (_input, run) => {
				const data = await readData(ctx);
				const next = { ...data, count: data.count + data.step };
				if (run.signal.aborted) return;
				await ctx.saveData(next);
				ctx.notify(`Count: ${next.count}`);
			},
		});

		ctx.addAction({
			id: 'settings',
			title: 'Choose the step',
			description: 'How much one click adds',
			run: async (_input, run) => {
				const data = await readData(ctx);
				const picked = await run.ui.pick({
					title: 'Step',
					items: STEPS.map((step) => ({
						id: String(step),
						title: `Add ${step}`,
						description: step === data.step ? 'Current' : undefined,
						step,
					})),
				});
				if (picked === null || picked.step === data.step) return;
				if (run.signal.aborted) return;
				// Read again: a click during the picker saved a newer count.
				const latest = await readData(ctx);
				if (run.signal.aborted) return;
				await ctx.saveData({ ...latest, step: picked.step });
				ctx.notify(`Each click now adds ${picked.step}`);
			},
		});

		ctx.addAction({
			id: 'reset',
			title: 'Reset',
			description: 'Sets the counter back to 0',
			run: async (_input, run) => {
				const data = await readData(ctx);
				const ok = await run.ui.confirm({
					title: 'Reset the counter?',
					message: `It is at ${data.count}.`,
					confirmLabel: 'Reset',
					destructive: true,
				});
				if (!ok) return;
				const latest = await readData(ctx);
				if (run.signal.aborted) return;
				await ctx.saveData({ ...latest, count: 0 });
				ctx.notify('Count: 0');
			},
		});

		ctx.addRailButton({
			id: 'main',
			title: 'Click counter',
			icon: 'lucide:mouse-pointer-click',
			actions: ['click', 'settings', 'reset'],
		});
	},
};
