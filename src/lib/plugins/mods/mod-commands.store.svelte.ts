/** A mod action reachable through raw app access and, when marked, the palette. */
export interface ModCommand {
	/** Globally namespaced action id: `mod:<mod>:action:<action>`. */
	id: string;
	/** Mod name and action title. */
	label: string;
	/** Invokes the host's action wrapper, or reveals its running instance. */
	run: () => void;
	/** Whether the mod opted this action into the command palette. */
	palette: boolean;
}

/** Registered actions; raw state preserves identity for cleanup. */
let commands = $state.raw<Omit<ModCommand, 'palette'>[]>([]);
/** Each placement owns a distinct mark on its registered action. */
let placements = $state.raw<{ command: Omit<ModCommand, 'palette'> }[]>([]);

/** Live mod action registry, independent of the command palette UI. */
export const modCommandsStore = {
	/** Every action in registration order, including actions absent from the palette. */
	get list(): readonly ModCommand[] {
		return commands.map((command) => ({ ...command, palette: placements.some((p) => p.command === command) }));
	},

	/** Registers an action, replacing its id; cleanup removes only this registration. */
	register(command: Omit<ModCommand, 'palette'>): () => void {
		const entry = { ...command };
		placements = placements.filter((p) => p.command.id !== entry.id);
		commands = [...commands.filter((c) => c.id !== entry.id), entry];
		return () => {
			commands = commands.filter((c) => c !== entry);
			placements = placements.filter((p) => p.command !== entry);
		};
	},

	/** Marks a registered action for the palette until this placement is disposed. */
	place(id: string): () => void {
		const command = commands.find((c) => c.id === id);
		if (!command) throw new Error(`Unknown mod action "${id}"`);
		const placement = { command };
		placements = [...placements, placement];
		return () => {
			placements = placements.filter((p) => p !== placement);
		};
	},

	/** Drops registrations and their placements. */
	reset() {
		commands = [];
		placements = [];
	},
};
