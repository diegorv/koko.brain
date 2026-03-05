/** Common image extensions recognized for wikilink image embeds */
const IMAGE_EXTENSIONS = new Set([
	'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif',
]);

/** Matches wikilink embeds: `![[target]]`, `![[target#heading]]`, `![[target#^block]]`, `![[target|size]]` */
export const WIKILINK_EMBED_RE =
	/!\[\[([^\]|#]+?)(?:#(\^?[^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** Type of wikilink embed */
export type WikilinkEmbedType = 'image' | 'note';

/** Parsed range for a single wikilink embed match */
export interface WikilinkEmbedRange {
	/** Start position of `![[` */
	fullFrom: number;
	/** End position of `]]` */
	fullTo: number;
	/** Target file name (e.g. `decorator`, `image.png`) */
	target: string;
	/** Heading anchor (e.g. `Heading 2`) — null if not present */
	heading: string | null;
	/** Block ID anchor (e.g. `5ki07f`) — null if not present */
	blockId: string | null;
	/** Display/size text after pipe (e.g. `300`) — null if not present */
	display: string | null;
	/** Whether this is an image embed or a note embed */
	type: WikilinkEmbedType;
}

/** Returns true if the target filename has an image extension */
export function isImageEmbed(target: string): boolean {
	const dotIndex = target.lastIndexOf('.');
	if (dotIndex < 0) return false;
	const ext = target.substring(dotIndex + 1).toLowerCase();
	return IMAGE_EXTENSIONS.has(ext);
}

/** Finds all wikilink embed ranges in a line of text */
export function findWikilinkEmbedRanges(text: string, offset: number): WikilinkEmbedRange[] {
	const ranges: WikilinkEmbedRange[] = [];
	WIKILINK_EMBED_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = WIKILINK_EMBED_RE.exec(text)) !== null) {
		const target = match[1];
		const anchor = match[2] ?? null;
		const display = match[3] ?? null;

		let heading: string | null = null;
		let blockId: string | null = null;
		if (anchor !== null) {
			if (anchor.startsWith('^')) {
				blockId = anchor.slice(1);
			} else {
				heading = anchor;
			}
		}

		ranges.push({
			fullFrom: offset + match.index,
			fullTo: offset + match.index + match[0].length,
			target,
			heading,
			blockId,
			display,
			type: isImageEmbed(target) ? 'image' : 'note',
		});
	}

	return ranges;
}
