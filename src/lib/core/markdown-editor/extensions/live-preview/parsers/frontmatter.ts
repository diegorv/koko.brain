/** A single key-value pair extracted from YAML frontmatter */
export interface FrontmatterProperty {
	key: string;
	value: string;
}

/** Range and parsed data for a frontmatter block at the start of a document */
export interface FrontmatterBlock {
	/** Line index of the opening `---` fence */
	openIdx: number;
	/** Line index of the closing `---` fence */
	closeIdx: number;
	/** Parsed key-value properties */
	properties: FrontmatterProperty[];
}

/** Matches the opening/closing `---` fence of a YAML frontmatter block */
export const FRONTMATTER_FENCE_RE = /^---\s*$/;

/** Matches a simple `key: value` YAML line (no nested structures) */
const YAML_KV_RE = /^(\w[\w\s\-.]*):\s*(.*)$/;

/** Matches a YAML block list item like `  - value` */
const YAML_LIST_ITEM_RE = /^\s*-\s+(.+)$/;

/**
 * Strips surrounding YAML string quotes (double or single) from a value.
 * E.g. `"[[rafaela]]"` → `[[rafaela]]`, `'hello'` → `hello`.
 */
function stripYamlQuotes(value: string): string {
	if (value.length >= 2) {
		const first = value[0];
		const last = value[value.length - 1];
		if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
			return value.slice(1, -1);
		}
	}
	return value;
}

/**
 * Parses YAML key-value pairs from frontmatter content lines.
 * Handles flat `key: value` pairs and block list arrays (`key:\n  - item`).
 * Block list values are joined as a comma-separated string (e.g. `"daily, amor"`).
 */
export function parseFrontmatterProperties(lines: string[]): FrontmatterProperty[] {
	const properties: FrontmatterProperty[] = [];
	let i = 0;

	while (i < lines.length) {
		const trimmed = lines[i].trim();
		if (trimmed === '') {
			i++;
			continue;
		}

		const match = trimmed.match(YAML_KV_RE);
		if (!match) {
			i++;
			continue;
		}

		const key = match[1].trim();
		const value = stripYamlQuotes(match[2].trim());

		// If the value is empty, check for block list items on subsequent lines
		if (value === '') {
			const items: string[] = [];
			let j = i + 1;
			while (j < lines.length) {
				const itemMatch = lines[j].match(YAML_LIST_ITEM_RE);
				if (itemMatch) {
					items.push(itemMatch[1].trim());
					j++;
				} else if (lines[j].trim() === '') {
					j++;
				} else {
					break;
				}
			}

			if (items.length > 0) {
				properties.push({ key, value: items.join(', ') });
				i = j;
				continue;
			}
		}

		properties.push({ key, value });
		i++;
	}

	return properties;
}

/**
 * Finds a YAML frontmatter block at the beginning of a document.
 * Frontmatter must start on line index 0 with `---` and end with another `---`.
 * Returns null if no valid frontmatter block is found.
 */
export function findFrontmatterBlock(
	lines: { text: string; from: number; to: number }[],
): FrontmatterBlock | null {
	if (lines.length < 2) return null;

	const firstLine = lines[0];
	if (!FRONTMATTER_FENCE_RE.test(firstLine.text)) return null;

	for (let i = 1; i < lines.length; i++) {
		if (FRONTMATTER_FENCE_RE.test(lines[i].text)) {
			const contentLines = lines.slice(1, i).map((l) => l.text);
			return {
				openIdx: 0,
				closeIdx: i,
				properties: parseFrontmatterProperties(contentLines),
			};
		}
	}

	return null;
}
