/** Signature for a method implementation */
type MethodFn = (value: unknown, args: unknown[]) => unknown;

/** Signature for a field (property-like access without parentheses) */
type FieldFn = (value: unknown) => unknown;

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats a Date using a simple format string subset: YYYY, MM, DD, HH, mm, ss, ddd, MMM */
function formatDate(d: Date, fmt: string): string {
	return fmt
		.replace('YYYY', String(d.getFullYear()))
		.replace('MMM', SHORT_MONTHS[d.getMonth()])
		.replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
		.replace('DD', String(d.getDate()).padStart(2, '0'))
		.replace('HH', String(d.getHours()).padStart(2, '0'))
		.replace('mm', String(d.getMinutes()).padStart(2, '0'))
		.replace('ss', String(d.getSeconds()).padStart(2, '0'))
		.replace('ddd', SHORT_DAYS[d.getDay()]);
}

/** Returns a relative date string like "2 days ago" or "in 3 hours" */
function relativeDateString(d: Date): string {
	const now = Date.now();
	const diffMs = now - d.getTime();
	const absDiff = Math.abs(diffMs);
	const past = diffMs > 0;

	const seconds = Math.floor(absDiff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);
	const months = Math.floor(days / 30);
	const years = Math.floor(days / 365);

	let label: string;
	if (years > 0) label = `${years} year${years > 1 ? 's' : ''}`;
	else if (months > 0) label = `${months} month${months > 1 ? 's' : ''}`;
	else if (weeks > 0) label = `${weeks} week${weeks > 1 ? 's' : ''}`;
	else if (days > 0) label = `${days} day${days > 1 ? 's' : ''}`;
	else if (hours > 0) label = `${hours} hour${hours > 1 ? 's' : ''}`;
	else if (minutes > 0) label = `${minutes} minute${minutes > 1 ? 's' : ''}`;
	else label = `${seconds} second${seconds !== 1 ? 's' : ''}`;

	return past ? `${label} ago` : `in ${label}`;
}

/** Determines the runtime type category of a value */
function getRuntimeType(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (value instanceof Date) return 'date';
	if (Array.isArray(value)) return 'list';
	const t = typeof value;
	if (t === 'string' || t === 'number' || t === 'boolean') return t;
	if (t === 'object') return 'object';
	return 'unknown';
}

/** Registry of methods organized by runtime type. Type-specific entries take priority over 'any'. */
export const methodRegistry: Record<string, Record<string, MethodFn>> = {
	string: {
		lower: (value) => String(value ?? '').toLowerCase(),
		title: (value) =>
			String(value ?? '')
				.toLowerCase()
				.replace(/\b\w/g, (c) => c.toUpperCase()),
		trim: (value) => String(value ?? '').trim(),
		replace: (value, args) => {
			const str = String(value ?? '');
			const pattern = String(args[0] ?? '');
			const replacement = String(args[1] ?? '');
			return str.replace(pattern, replacement);
		},
		split: (value, args) => {
			const str = String(value ?? '');
			const separator = String(args[0] ?? '');
			const limit = args[1] !== undefined ? Number(args[1]) : undefined;
			return str.split(separator, limit);
		},
		slice: (value, args) => {
			const str = String(value ?? '');
			const start = Number(args[0] ?? 0);
			const end = args[1] !== undefined ? Number(args[1]) : undefined;
			return str.slice(start, end);
		},
		matches: (value, args) => {
			try {
				const pattern = String(args[0] ?? '');
				const regex = new RegExp(pattern, 'i');
				return regex.test(String(value ?? ''));
			} catch {
				return false;
			}
		},
	},
	number: {
		abs: (value) => Math.abs(Number(value ?? 0)),
		round: (value, args) => {
			const num = Number(value ?? 0);
			const digits = args[0] !== undefined ? Number(args[0]) : 0;
			if (digits === 0) return Math.round(num);
			const factor = Math.pow(10, digits);
			return Math.round(num * factor) / factor;
		},
		ceil: (value) => Math.ceil(Number(value ?? 0)),
		floor: (value) => Math.floor(Number(value ?? 0)),
		toFixed: (value, args) => {
			const num = Number(value ?? 0);
			const precision = args[0] !== undefined ? Number(args[0]) : 0;
			return num.toFixed(precision);
		},
	},
	date: {
		format: (value, args) => {
			if (!(value instanceof Date)) return '';
			const fmt = String(args[0] ?? 'YYYY-MM-DD');
			return formatDate(value, fmt);
		},
		relative: (value) => {
			if (!(value instanceof Date)) return '';
			return relativeDateString(value);
		},
		date: (value) => {
			if (!(value instanceof Date)) return null;
			const d = new Date(value);
			d.setHours(0, 0, 0, 0);
			return d;
		},
		time: (value) => {
			if (!(value instanceof Date)) return '';
			return [
				String(value.getHours()).padStart(2, '0'),
				String(value.getMinutes()).padStart(2, '0'),
				String(value.getSeconds()).padStart(2, '0'),
			].join(':');
		},
	},
	list: {
		contains: (value, args) => {
			if (!Array.isArray(value)) return false;
			const needle = String(args[0] ?? '');
			return value.some((item) => String(item).toLowerCase() === needle.toLowerCase());
		},
		sort: (value) => {
			if (!Array.isArray(value)) return [];
			return [...value].sort((a, b) => String(a).localeCompare(String(b)));
		},
		unique: (value) => {
			if (!Array.isArray(value)) return [];
			return [...new Set(value)];
		},
		join: (value, args) => {
			if (!Array.isArray(value)) return '';
			const separator = String(args[0] ?? ',');
			return value.join(separator);
		},
		flat: (value) => {
			if (!Array.isArray(value)) return [];
			return value.flat();
		},
		slice: (value, args) => {
			if (!Array.isArray(value)) return [];
			const start = Number(args[0] ?? 0);
			const end = args[1] !== undefined ? Number(args[1]) : undefined;
			return value.slice(start, end);
		},
	},
	object: {
		keys: (value) => {
			if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
				return Object.keys(value as Record<string, unknown>);
			}
			return [];
		},
		values: (value) => {
			if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
				return Object.values(value as Record<string, unknown>);
			}
			return [];
		},
		isEmpty: (value) => {
			if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
				return Object.keys(value as Record<string, unknown>).length === 0;
			}
			return true;
		},
	},
	any: {
		contains: (value, args) => {
			const str = String(value ?? '');
			const needle = String(args[0] ?? '');
			return str.toLowerCase().includes(needle.toLowerCase());
		},
		startsWith: (value, args) => {
			const str = String(value ?? '');
			const prefix = String(args[0] ?? '');
			return str.toLowerCase().startsWith(prefix.toLowerCase());
		},
		endsWith: (value, args) => {
			const str = String(value ?? '');
			const suffix = String(args[0] ?? '');
			return str.toLowerCase().endsWith(suffix.toLowerCase());
		},
		isEmpty: (value) => {
			if (value === null || value === undefined || value === '') return true;
			if (Array.isArray(value) && value.length === 0) return true;
			return false;
		},
		isTruthy: (value) => {
			if (value === null || value === undefined) return false;
			if (value === 0 || value === '' || value === false) return false;
			return true;
		},
		isType: (value, args) => {
			const expected = String(args[0] ?? '');
			const type = getRuntimeType(value);
			return type === expected;
		},
		['toString']: (value: unknown) => {
			if (value === null || value === undefined) return '';
			if (value instanceof Date) return value.toISOString();
			return String(value);
		},
	},
};

/** Registry of fields (property-like access without parentheses) organized by runtime type */
export const fieldRegistry: Record<string, Record<string, FieldFn>> = {
	string: {
		length: (value) => String(value ?? '').length,
	},
	date: {
		year: (value) => (value instanceof Date ? value.getFullYear() : null),
		month: (value) => (value instanceof Date ? value.getMonth() + 1 : null),
		day: (value) => (value instanceof Date ? value.getDate() : null),
		hour: (value) => (value instanceof Date ? value.getHours() : null),
		minute: (value) => (value instanceof Date ? value.getMinutes() : null),
		second: (value) => (value instanceof Date ? value.getSeconds() : null),
		millisecond: (value) => (value instanceof Date ? value.getMilliseconds() : null),
	},
	list: {
		length: (value) => (Array.isArray(value) ? value.length : 0),
	},
};

/** Checks own property only, avoiding Object.prototype collisions (e.g. toString) */
const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Dispatches a method call to the appropriate handler based on the runtime type of the value.
 * Resolution order: type-specific registry → 'any' registry → error.
 */
export function dispatchMethod(value: unknown, method: string, args: unknown[]): unknown {
	const type = getRuntimeType(value);

	// Try type-specific registry first
	const typeMethods = methodRegistry[type];
	if (typeMethods && hasOwn(typeMethods, method)) {
		return typeMethods[method](value, args);
	}

	// Try 'any' registry (universal methods)
	if (hasOwn(methodRegistry.any, method)) {
		return methodRegistry.any[method](value, args);
	}

	throw new Error(`Unknown method: ${method}`);
}

/**
 * Dispatches a field access to the appropriate handler based on the runtime type of the value.
 * Returns undefined if no field handler exists for this type+field combination.
 */
export function dispatchField(value: unknown, field: string): unknown | undefined {
	const type = getRuntimeType(value);

	const typeFields = fieldRegistry[type];
	if (typeFields && hasOwn(typeFields, field)) {
		return typeFields[field](value);
	}

	return undefined;
}
