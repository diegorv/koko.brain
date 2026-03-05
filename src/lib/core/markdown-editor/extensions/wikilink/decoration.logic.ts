/** Matches wikilinks: `[[target]]`, `[[target#heading]]`, `[[target|display]]`, `[[#heading]]` */
export const WIKILINK_DECORATION_RE =
	/\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** Parsed positions for a single wikilink match */
export interface WikilinkDecorationRange {
	openBracketFrom: number;
	openBracketTo: number;
	targetFrom: number;
	targetTo: number;
	targetText: string;
	headingFrom: number | null;
	headingTo: number | null;
	blockIdFrom: number | null;
	blockIdTo: number | null;
	blockIdText: string | null;
	displayFrom: number | null;
	displayTo: number | null;
	closeBracketFrom: number;
	closeBracketTo: number;
}

/** Finds all wikilink ranges in a line of text */
export function findWikilinkRanges(text: string, offset: number): WikilinkDecorationRange[] {
	const ranges: WikilinkDecorationRange[] = [];
	WIKILINK_DECORATION_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = WIKILINK_DECORATION_RE.exec(text)) !== null) {
		const start = offset + match.index;
		const end = start + match[0].length;

		const targetText = match[1];
		const headingText = match[2];
		const displayText = match[3];

		// Reject empty wikilinks like [[]]
		if (targetText.length === 0 && headingText === undefined) continue;

		const targetFrom = start + 2;
		const targetTo = targetFrom + targetText.length;

		let headingFrom: number | null = null;
		let headingTo: number | null = null;
		let blockIdFrom: number | null = null;
		let blockIdTo: number | null = null;
		let blockIdText: string | null = null;
		if (headingText !== undefined) {
			if (headingText.startsWith('^')) {
				// Block reference: #^block-id
				blockIdFrom = targetTo;
				blockIdTo = targetTo + 1 + headingText.length;
				blockIdText = headingText.slice(1);
			} else {
				// Heading reference: #heading
				headingFrom = targetTo;
				headingTo = headingFrom + 1 + headingText.length;
			}
		}

		let displayFrom: number | null = null;
		let displayTo: number | null = null;
		if (displayText !== undefined) {
			displayFrom = end - 2 - displayText.length - 1;
			displayTo = end - 2;
		}

		ranges.push({
			openBracketFrom: start,
			openBracketTo: start + 2,
			targetFrom,
			targetTo,
			targetText,
			headingFrom,
			headingTo,
			blockIdFrom,
			blockIdTo,
			blockIdText,
			displayFrom,
			displayTo,
			closeBracketFrom: end - 2,
			closeBracketTo: end,
		});
	}

	return ranges;
}

/** Full wikilink info including target, heading, and block-id */
export interface WikilinkInfo {
	target: string;
	heading: string | null;
	blockId: string | null;
}

/** Returns full wikilink info (target + heading/blockId) at a given document position, or null */
export function findWikilinkInfoAtPosition(
	lineText: string,
	lineFrom: number,
	docPos: number,
): WikilinkInfo | null {
	WIKILINK_DECORATION_RE.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = WIKILINK_DECORATION_RE.exec(lineText)) !== null) {
		const start = lineFrom + match.index;
		const end = start + match[0].length;

		if (docPos >= start && docPos <= end) {
			const target = match[1];
			const anchorText = match[2] ?? null;

			let heading: string | null = null;
			let blockId: string | null = null;
			if (anchorText !== null) {
				if (anchorText.startsWith('^')) {
					blockId = anchorText.slice(1);
				} else {
					heading = anchorText;
				}
			}

			return { target, heading, blockId };
		}
	}

	return null;
}
