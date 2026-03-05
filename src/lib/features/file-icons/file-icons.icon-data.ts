import type { IconPackId, IconPackMeta, NormalizedIcon } from './file-icons.types';

/** Cache for loaded icon packs to avoid re-processing */
const packCache = new Map<IconPackId, NormalizedIcon[]>();

/** Returns metadata about all available icon packs */
export function getAllIconPacks(): IconPackMeta[] {
	return [
		{ id: 'lucide', label: 'Lucide', iconCount: 0 },
		{ id: 'feather', label: 'Feather', iconCount: 0 },
		{ id: 'fa-solid', label: 'FA Solid', iconCount: 0 },
		{ id: 'fa-regular', label: 'FA Regular', iconCount: 0 },
		{ id: 'fa-brands', label: 'FA Brands', iconCount: 0 },
		{ id: 'octicons', label: 'Octicons', iconCount: 0 },
		{ id: 'boxicons', label: 'Boxicons', iconCount: 0 },
		{ id: 'coolicons', label: 'Coolicons', iconCount: 0 },
		{ id: 'simple-icons', label: 'Simple Icons', iconCount: 0 },
		{ id: 'tabler', label: 'Tabler Icons', iconCount: 0 },
		{ id: 'remix', label: 'Remix Icons', iconCount: 0 },
		{ id: 'emoji', label: 'Emoji', iconCount: 0 },
	];
}

/** Converts a PascalCase or camelCase string to kebab-case for display */
function toKebabCase(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

/** Strips the outer <svg> wrapper and returns just the inner content */
function extractSvgContent(svgString: string): string {
	const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
	return match ? match[1].trim() : svgString;
}

/**
 * Loads icons from an Iconify JSON pack.
 * Iconify JSON format: { prefix, icons: { [name]: { body } }, width, height }
 */
function loadIconifyPack(
	data: { icons: Record<string, { body: string }>; width?: number; height?: number },
	pack: IconPackId,
	namePrefix?: string,
): NormalizedIcon[] {
	const w = data.width ?? 24;
	const h = data.height ?? 24;
	const viewBox = `0 0 ${w} ${h}`;
	const icons: NormalizedIcon[] = [];
	for (const [name, icon] of Object.entries(data.icons)) {
		const displayName = namePrefix ? `${namePrefix}-${name}` : name;
		icons.push({
			name: displayName,
			pack,
			svgContent: icon.body,
			viewBox,
			keywords: [displayName],
		});
	}
	return icons;
}

/** Loads and normalizes Lucide icons */
async function loadLucide(): Promise<NormalizedIcon[]> {
	const allIcons = (await import('lucide-static')) as unknown as Record<string, string>;
	const icons: NormalizedIcon[] = [];
	for (const [key, svg] of Object.entries(allIcons)) {
		if (typeof svg !== 'string' || !svg.startsWith('<svg')) continue;
		icons.push({
			name: toKebabCase(key),
			pack: 'lucide',
			svgContent: extractSvgContent(svg),
			viewBox: '0 0 24 24',
			keywords: [toKebabCase(key)],
		});
	}
	return icons;
}

/** Loads and normalizes Feather icons */
async function loadFeather(): Promise<NormalizedIcon[]> {
	const feather = (await import('feather-icons')) as unknown as {
		icons: Record<string, { name: string; contents: string; tags: string[]; attrs: Record<string, string> }>;
	};
	const icons: NormalizedIcon[] = [];
	for (const [key, icon] of Object.entries(feather.icons)) {
		icons.push({
			name: key,
			pack: 'feather',
			svgContent: icon.contents,
			viewBox: icon.attrs.viewBox || '0 0 24 24',
			keywords: [key, ...icon.tags],
		});
	}
	return icons;
}

/** Loads and normalizes Font Awesome icons for a specific style */
async function loadFontAwesome(
	packId: 'fa-solid' | 'fa-regular' | 'fa-brands',
): Promise<NormalizedIcon[]> {
	type FaDef = { prefix: string; iconName: string; icon: [number, number, string[], string, string | string[]] };
	let mod: Record<string, FaDef>;
	switch (packId) {
		case 'fa-solid': mod = (await import('@fortawesome/free-solid-svg-icons')) as unknown as Record<string, FaDef>; break;
		case 'fa-regular': mod = (await import('@fortawesome/free-regular-svg-icons')) as unknown as Record<string, FaDef>; break;
		case 'fa-brands': mod = (await import('@fortawesome/free-brands-svg-icons')) as unknown as Record<string, FaDef>; break;
	}
	const icons: NormalizedIcon[] = [];
	const seen = new Set<string>();
	for (const [key, def] of Object.entries(mod)) {
		if (!key.startsWith('fa') || !def?.icon) continue;
		// Skip duplicate iconNames (aliases like faAngleDoubleDown → faAnglesDown)
		if (seen.has(def.iconName)) continue;
		seen.add(def.iconName);
		const [width, height, , , pathData] = def.icon;
		const svgContent = Array.isArray(pathData)
			? pathData.map((d) => `<path fill="currentColor" d="${d}"/>`).join('')
			: `<path fill="currentColor" d="${pathData}"/>`;
		icons.push({
			name: def.iconName,
			pack: packId,
			svgContent,
			viewBox: `0 0 ${width} ${height}`,
			keywords: [def.iconName],
		});
	}
	return icons;
}

/** Loads and normalizes Octicons */
async function loadOcticons(): Promise<NormalizedIcon[]> {
	const octicons = (await import('@primer/octicons')) as unknown as Record<string, {
		name: string;
		keywords: string[];
		heights: Record<string, { path: string; width: number; height: number }>;
	}>;
	const icons: NormalizedIcon[] = [];
	for (const [key, icon] of Object.entries(octicons)) {
		if (!icon?.heights) continue;
		// Prefer 24px variant, fallback to 16px
		const size = icon.heights['24'] || icon.heights['16'];
		if (!size) continue;
		icons.push({
			name: key,
			pack: 'octicons',
			svgContent: size.path,
			viewBox: `0 0 ${size.width} ${size.height || size.width}`,
			keywords: [key, ...(icon.keywords || [])],
		});
	}
	return icons;
}

/** Loads and normalizes Boxicons (regular + solid + logos via Iconify JSON) */
async function loadBoxicons(): Promise<NormalizedIcon[]> {
	const [bx, bxs, bxl] = await Promise.all([
		import('@iconify-json/bx/icons.json'),
		import('@iconify-json/bxs/icons.json'),
		import('@iconify-json/bxl/icons.json'),
	]);
	return [
		...loadIconifyPack(bx.default ?? bx, 'boxicons', 'bx'),
		...loadIconifyPack(bxs.default ?? bxs, 'boxicons', 'bxs'),
		...loadIconifyPack(bxl.default ?? bxl, 'boxicons', 'bxl'),
	];
}

/** Loads and normalizes Coolicons via Iconify JSON */
async function loadCoolicons(): Promise<NormalizedIcon[]> {
	const data = await import('@iconify-json/ci/icons.json');
	return loadIconifyPack(data.default ?? data, 'coolicons');
}

/** Loads and normalizes Simple Icons */
async function loadSimpleIcons(): Promise<NormalizedIcon[]> {
	const mod = (await import('simple-icons')) as unknown as Record<string, {
		title: string;
		slug: string;
		path: string;
		hex: string;
	}>;
	const icons: NormalizedIcon[] = [];
	for (const [key, icon] of Object.entries(mod)) {
		if (!key.startsWith('si') || !icon?.path) continue;
		icons.push({
			name: icon.slug,
			pack: 'simple-icons',
			svgContent: `<path fill="currentColor" d="${icon.path}"/>`,
			viewBox: '0 0 24 24',
			keywords: [icon.slug, icon.title.toLowerCase()],
		});
	}
	return icons;
}

/** Loads and normalizes Tabler Icons via Iconify JSON */
async function loadTabler(): Promise<NormalizedIcon[]> {
	const data = await import('@iconify-json/tabler/icons.json');
	return loadIconifyPack(data.default ?? data, 'tabler');
}

/** Loads and normalizes Remix Icons via Iconify JSON */
async function loadRemix(): Promise<NormalizedIcon[]> {
	const data = await import('@iconify-json/ri/icons.json');
	return loadIconifyPack(data.default ?? data, 'remix');
}

/** Common emoji list for the emoji "pack" */
const EMOJI_LIST = [
	'📁', '📂', '📄', '📝', '📋', '📌', '📎', '📐', '📏', '📊',
	'📈', '📉', '📅', '📆', '🗂️', '🗃️', '🗄️', '🗑️', '🗒️', '🗓️',
	'💡', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '📲', '🔋', '🔌',
	'💾', '💿', '📀', '🎮', '🕹️', '🎯', '🎨', '🎭', '🎪', '🎬',
	'🎵', '🎶', '🎧', '🎤', '🎸', '🥁', '🎹', '🎺', '🎻', '🪗',
	'📷', '📸', '📹', '🎥', '📽️', '🎞️', '📺', '📻', '🔍', '🔎',
	'🔬', '🔭', '🧪', '🧫', '🧬', '🩺', '💊', '🩹', '🏥', '🏫',
	'🏠', '🏡', '🏢', '🏗️', '🏭', '🏛️', '⛪', '🕌', '🕍', '⛩️',
	'🌍', '🌎', '🌏', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️',
	'🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂',
	'🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
	'🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
	'🦅', '🦆', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
	'🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍',
	'🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬',
	'❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
	'⭐', '🌟', '✨', '⚡', '🔥', '💧', '🌊', '❄️', '☀️', '🌈',
	'✅', '❌', '⚠️', '🚫', '💤', '💬', '💭', '🔔', '🔕', '🏷️',
	'🔒', '🔓', '🔑', '🗝️', '🛠️', '⚙️', '🧰', '🔧', '🔨', '⛏️',
	'🚀', '✈️', '🚂', '🚗', '🚕', '🚌', '🏎️', '🚲', '⛵', '🚁',
];

/** Returns emoji as NormalizedIcon array */
function loadEmoji(): NormalizedIcon[] {
	return EMOJI_LIST.map((emoji) => ({
		name: emoji,
		pack: 'emoji' as const,
		svgContent: '',
		viewBox: '',
		keywords: [emoji],
	}));
}

/**
 * Loads icons for a specific pack (cached).
 * Uses dynamic imports so Vite can code-split each icon pack.
 */
export async function getIconsForPack(packId: IconPackId): Promise<NormalizedIcon[]> {
	const cached = packCache.get(packId);
	if (cached) return cached;

	let icons: NormalizedIcon[];
	switch (packId) {
		case 'lucide': icons = await loadLucide(); break;
		case 'feather': icons = await loadFeather(); break;
		case 'fa-solid': icons = await loadFontAwesome('fa-solid'); break;
		case 'fa-regular': icons = await loadFontAwesome('fa-regular'); break;
		case 'fa-brands': icons = await loadFontAwesome('fa-brands'); break;
		case 'octicons': icons = await loadOcticons(); break;
		case 'boxicons': icons = await loadBoxicons(); break;
		case 'coolicons': icons = await loadCoolicons(); break;
		case 'simple-icons': icons = await loadSimpleIcons(); break;
		case 'tabler': icons = await loadTabler(); break;
		case 'remix': icons = await loadRemix(); break;
		case 'emoji': icons = loadEmoji(); break;
		default: icons = [];
	}

	packCache.set(packId, icons);
	return icons;
}

/**
 * Looks up a single icon by pack and name (for rendering in file tree).
 * Returns undefined if the pack hasn't been loaded yet.
 * Call preloadPacks() at startup to ensure referenced packs are cached.
 */
export function getIconSync(pack: IconPackId, name: string): NormalizedIcon | undefined {
	const cached = packCache.get(pack);
	if (!cached) return undefined;
	return cached.find((i) => i.name === name);
}

/** Pre-loads specific packs into cache (call at startup for packs referenced in saved icons) */
export async function preloadPacks(packIds: IconPackId[]): Promise<void> {
	const unique = [...new Set(packIds)];
	await Promise.all(unique.map((id) => getIconsForPack(id)));
}
