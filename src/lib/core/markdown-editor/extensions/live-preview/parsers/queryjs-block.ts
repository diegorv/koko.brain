/** Information about a ```queryjs code block */
export interface QueryjsBlockInfo {
	/** Start of the opening ```queryjs line */
	openFenceFrom: number;
	/** End of the opening ```queryjs line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The JavaScript content between the fences */
	jsContent: string;
}

/**
 * Finds a ```queryjs code block starting at the given index in the lines array.
 * Returns the block info and the index of the closing fence, or null if not found.
 */
export function findQueryjsBlock(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
): { block: QueryjsBlockInfo; endIdx: number } | null {
	const firstLine = lines[startIdx];
	const openMatch = firstLine.text.match(/^(`{3,})\s*queryjs\s*$/);
	if (!openMatch) return null;

	const fenceChar = '`';
	const fenceLen = openMatch[1].length;

	const jsLines: string[] = [];

	for (let i = startIdx + 1; i < lines.length; i++) {
		const line = lines[i];
		const closeMatch = line.text.match(/^(`{3,})\s*$/);
		if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLen) {
			return {
				block: {
					openFenceFrom: firstLine.from,
					openFenceTo: firstLine.to,
					closeFenceFrom: line.from,
					closeFenceTo: line.to,
					jsContent: jsLines.join('\n'),
				},
				endIdx: i,
			};
		}
		jsLines.push(line.text);
	}

	return null;
}
