/** Information about a ```meta-bind-button code block */
export interface MetaBindButtonBlock {
	/** Start of the opening ```meta-bind-button line */
	openFenceFrom: number;
	/** End of the opening ```meta-bind-button line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The YAML content between the fences */
	yamlContent: string;
}

/**
 * Finds a ```meta-bind-button code block starting at the given index in the lines array.
 * Returns the block info and the index of the closing fence, or null if not found.
 */
export function findMetaBindButtonBlock(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
): { block: MetaBindButtonBlock; endIdx: number } | null {
	const firstLine = lines[startIdx];
	const openMatch = firstLine.text.match(/^(`{3,})\s*meta-bind-button\s*$/);
	if (!openMatch) return null;

	const fenceChar = '`';
	const fenceLen = openMatch[1].length;

	const yamlLines: string[] = [];

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
					yamlContent: yamlLines.join('\n'),
				},
				endIdx: i,
			};
		}
		yamlLines.push(line.text);
	}

	return null;
}
