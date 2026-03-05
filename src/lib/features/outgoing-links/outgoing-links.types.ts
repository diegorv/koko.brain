export interface OutgoingLink {
	target: string;
	alias: string | null;
	heading: string | null;
	resolvedPath: string | null;
	position: number;
}

export interface OutgoingUnlinkedMention {
	noteName: string;
	notePath: string;
	count: number;
}
