import type { EVENT_CALENDAR_COLORS, EVENT_CALENDAR_VIEW_MODES, TODOIST_SYNC_CONTEXTS } from './settings.logic';

/** Supported periodic note types */
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Shared configuration for a single periodic note type */
export interface PeriodicNoteTypeSettings {
	/** dayjs format string for the note path (e.g. "YYYY/MM-MMM/_journal-day-DD-MM-YYYY") */
	format: string;
	/** Path to a template file relative to vault (e.g. "_templates/Weekly Note.md") */
	templatePath?: string;
}

/** Configuration for the periodic notes plugin */
export interface PeriodicNotesSettings {
	/** Base folder inside the vault where periodic notes are created (empty = vault root) */
	folder: string;
	/** Daily note settings (includes inline template and auto-open behaviour) */
	daily: PeriodicNoteTypeSettings & {
		/** Inline template fallback for daily notes */
		template: string;
		/** Whether to auto-open today's daily note when the vault loads */
		autoOpen?: boolean;
		/** Whether to auto-pin the daily note tab (requires autoOpen) */
		autoPin?: boolean;
	};
	/** Weekly note settings */
	weekly: PeriodicNoteTypeSettings;
	/** Monthly note settings */
	monthly: PeriodicNoteTypeSettings;
	/** Quarterly note settings */
	quarterly: PeriodicNoteTypeSettings;
	/** Yearly note settings */
	yearly: PeriodicNoteTypeSettings;
}

/** Deep-partial variant of PeriodicNotesSettings — nested period objects accept partial fields */
export interface PeriodicNotesUpdate {
	folder?: string;
	daily?: Partial<PeriodicNotesSettings['daily']>;
	weekly?: Partial<PeriodicNoteTypeSettings>;
	monthly?: Partial<PeriodicNoteTypeSettings>;
	quarterly?: Partial<PeriodicNoteTypeSettings>;
	yearly?: Partial<PeriodicNoteTypeSettings>;
}

/** Configuration for layout visibility preferences */
export interface LayoutSettings {
	/** Whether the panels between the rail and the editor (navigator, note list) are visible (rail shell) */
	railPanelsVisible: boolean;
	/**
	 * Key of the rail shell's active rail item. Loaded from settings.json unvalidated (it may
	 * not even be a string), so read it only through `restoreRailItem`, which falls back to Today.
	 */
	railItem: string;
	/**
	 * The Types navigator's pick (`{ kind: 'view', target: <.view path> }`, `{ kind: 'type', target: <name> }`
	 * or `{ kind: 'untyped' }`), or null
	 * before one is made. Loaded unvalidated, so read it only through `parseTypesPick` / `pickedTypesLens`.
	 */
	railTypesLens: { kind: string; target?: string } | null;
	/**
	 * Absolute path of the folder picked in the Files navigator, or null for the vault root.
	 * Loaded unvalidated, so read it only through `pickedFolderLens`.
	 */
	railFolder: string | null;
	/**
	 * Absolute paths of the folders expanded in the Files navigator. Loaded unvalidated, so read it only through
	 * `parseExpandedFolders`.
	 */
	railExpandedFolders: string[];
	/**
	 * The day (`YYYY-MM-DD`) picked in the Calendar navigator, or null for today.
	 * Loaded unvalidated, so read it only through `parseRailDay` / `pickedDayLens`.
	 */
	railDay: string | null;
	/**
	 * Keys of the rail items hidden in Settings > Layout (Search and Today are never hidden). Loaded unvalidated,
	 * so read it only through `parseRailHidden`.
	 */
	railHidden: string[];
	/**
	 * Keys of the rail items in the order Settings > Layout set, applied within each rail group. Loaded
	 * unvalidated, so read it only through `parseRailOrder`.
	 */
	railOrder: string[];
	/** Whether the rail's Inbox button shows the inbox count. Loaded unvalidated, so read it only through `parseRailInboxBadge`. */
	railInboxBadge: boolean;
	/** The labeled rail's width in px. Loaded unvalidated, so read it only through `parseRailWidth`. */
	railWidth: number;
	/** The rail's style. Loaded unvalidated, so read it only through `parseRailStyle`. */
	railStyle: 'labeled' | 'captioned';
	/** Whether the rail shows its small form; the style and width stay saved. Loaded unvalidated, so read it only through `parseRailCollapsed`. */
	railCollapsed: boolean;
	/** Whether the right sidebar (Properties, Backlinks, Outgoing links, Table of Contents) is visible */
	rightSidebarVisible: boolean;
	/** Whether the properties panel is shown in the right sidebar */
	propertiesVisible: boolean;
	/** Whether the backlinks panel is shown in the right sidebar */
	backlinksVisible: boolean;
	/** Whether the outgoing links panel is shown in the right sidebar */
	outgoingLinksVisible: boolean;
	/** Whether the table of contents panel is shown in the right sidebar */
	tableOfContentsVisible: boolean;
	/** Saved width percentage of the right sidebar pane */
	rightSidebarSize: number;
	/** Saved width percentage of the rail shell's note list pane */
	noteListSize: number;
	/** Saved width percentage of the rail shell's navigator pane (Types, Calendar, Files) */
	navigatorSize: number;
	/**
	 * Note-list sort and shown properties for the lenses that keep them in settings (folders, and
	 * types without a definition note), keyed by `listPrefsKey`. Loaded unvalidated, so read it only
	 * through `parseRailListPrefs`. `core/` cannot import `features/`, so the type stays `unknown`.
	 */
	railListPrefs: Record<string, unknown>;
}

/** Configuration for the folder notes feature */
export interface FolderNotesSettings {
	/** Whether clicking a folder also opens its matching folder note */
	enabled: boolean;
}

/** Font weight options for headings */
export type HeadingFontWeight = 'bold' | 'semibold' | 'normal';

/** Typography settings for a single heading level */
export interface HeadingLevelSettings {
	/** Font size relative to base, in em (0.5–5.0) */
	fontSize: number;
	/** Line height multiplier (1.0–3.0) */
	lineHeight: number;
	/** Font weight */
	fontWeight: HeadingFontWeight;
	/** Letter spacing in em (-0.1 to 0.1) */
	letterSpacing: number;
}

/** Typography configuration for all heading levels (h1–h6) */
export interface HeadingTypography {
	h1: HeadingLevelSettings;
	h2: HeadingLevelSettings;
	h3: HeadingLevelSettings;
	h4: HeadingLevelSettings;
	h5: HeadingLevelSettings;
	h6: HeadingLevelSettings;
}

/** Configuration for the markdown editor appearance */
export interface EditorSettings {
	/** Font family stack for the editor (CSS font-family value) */
	fontFamily: string;
	/** Font size in pixels */
	fontSize: number;
	/** Line height multiplier */
	lineHeight: number;
	/** Maximum content width in pixels (0 = no limit) */
	contentWidth: number;
	/** Every note uses the full editor width instead of `contentWidth` (the action bar's width toggle) */
	wideNotes: boolean;
	/** Extra vertical spacing added after each paragraph line, in em (0 = none) */
	paragraphSpacing: number;
	/** Typography settings for heading levels h1–h6 */
	headingTypography: HeadingTypography;
	/**
	 * True once the saved editor settings are on the current type scale (font
	 * size is the rendered body size, distinct H4-H6). A saved block without it
	 * goes through `migrateTypeScale` on load, which sets it.
	 */
	typeScaleMigrated: boolean;
}

/** Configuration for the templates plugin */
export interface TemplatesSettings {
	/** Folder name (relative to vault root) where templates are stored */
	folder: string;
	/**
	 * Vault-relative folder that holds system/template files which should be
	 * excluded from the type sidebar (note list, nav counts, inbox dock badge).
	 * Empty string disables the exclusion. Defaults to `_system`.
	 */
	systemFolder: string;
}

/** Configuration for the 1:1 notes plugin */
export interface OneOnOneSettings {
	/** Folder name (relative to vault root) where personal people files are stored */
	peopleFolder: string;
	/** Folder name (relative to vault root) where work people files are stored */
	workPeopleFolder: string;
	/** dayjs format for the subfolder path (e.g. "YYYY/MM-MMM") */
	folderFormat: string;
	/** dayjs format for the filename, with {person} placeholder (e.g. "[-1on1-]{person}[-]DD-MM-YYYY") */
	filenameFormat: string;
	/** Path to template file relative to vault (e.g. "_templates/One on One.md") */
	templatePath?: string;
	/** Days without a 1:1 after which Today's My people flags a person */
	dueAfterDays: number;
}

/**
 * Per-kind template paths for the Quick Capture composer + clipboard
 * shortcut. Each kind picks its own template; an empty string means
 * "no template — just write the rendered body".
 */
export interface QuickCaptureTemplates {
	note: string;
	clip: string;
	link: string;
	shot: string;
	file: string;
}

/** Configuration for the Quick Capture surface (composer popover + clipboard shortcut) */
export interface QuickCaptureSettings {
	/** dayjs format for the subfolder path (e.g. "YYYY/MM-MMM") */
	folderFormat: string;
	/** dayjs format for the filename (e.g. "[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS") */
	filenameFormat: string;
	/** Template file paths relative to vault root, keyed by capture kind */
	templates: QuickCaptureTemplates;
}

/** Partial Quick Capture update — `templates` accepts a per-kind subset */
export interface QuickCaptureUpdate {
	folderFormat?: string;
	filenameFormat?: string;
	templates?: Partial<QuickCaptureTemplates>;
}

/** Configuration for the file history feature */
export interface HistorySettings {
	/** Whether automatic snapshots are enabled */
	enabled: boolean;
	/** Number of days to keep all snapshots before applying thinning policy */
	retentionDays: number;
	/** Whether snapshots are also saved as plain .md files in .kokobrain/snapshots-backup/ */
	snapshotBackupEnabled: boolean;
}

/** Configuration for the search feature */
export interface SearchSettings {
	/** Whether semantic (AI-powered) search is enabled — downloads the ~542MB BGE-M3 model */
	semanticSearchEnabled: boolean;
}

/** Configuration for the Todoist integration */
export interface TodoistSettings {
	/**
	 * Todoist personal API token (from Settings → Integrations → Developer).
	 * Stored in plain text in the vault's `.kokobrain/settings.json`; see ADR-0019's 2026-11-06 amendment.
	 */
	apiToken: string;
	/** Label name applied to every task created by the app (empty = none) */
	defaultLabel: string;
	/** Whether the two-way sync runs for this vault */
	syncEnabled: boolean;
	/** Vault-relative folder holding one note per synced Todoist project */
	syncFolder: string;
	/** Minutes between automatic sync cycles (at least 1) */
	syncIntervalMinutes: number;
	/**
	 * Which context this vault is. A brain-born task in a `work` vault is sent
	 * with no context label, so the owner's webhook adds `Work`; in a
	 * `personal` vault it is sent with the label `personal`.
	 */
	syncContext: TodoistSyncContext;
	/** Todoist project whose tree (itself and every nested project) this vault syncs; empty = sync off */
	syncRootProjectId: string;
	/** Whether the Todoist Inbox is synced in addition to the root's tree */
	syncIncludeInbox: boolean;
}

/** One of the vault contexts in `TODOIST_SYNC_CONTEXTS` */
export type TodoistSyncContext = (typeof TODOIST_SYNC_CONTEXTS)[number];

/** Configuration for the optional Sentry error-monitoring integration. */
export interface SentrySettings {
	/** Whether this vault explicitly allows error events to be sent to Sentry. */
	enabled: boolean;
	/** Sentry Cloud project DSN, which identifies the destination for error events. */
	dsn: string;
}

/** Settings for the auto-move feature, persisted inside AppSettings */
export interface AutoMoveSettings {
	/** Whether auto-move is globally enabled */
	enabled: boolean;
	/** Debounce delay in milliseconds after save before evaluating rules */
	debounceMs: number;
}

/** Configuration for tag color assignments */
export interface TagColorSettings {
	/** Map of lowercase tag path to hex color (e.g., { "work": "#fb464c", "personal/health": "#44cf6e" }) */
	colors: Record<string, string>;
}

/** Policy for QueryJS block execution — controls when `kb.pages()`/`dv.view()` blocks run */
export type AutoRunQueriesPolicy =
	| 'first-open' // execute the first time the file is opened in this session, then cache for the session
	| 'always' // execute whenever a block has no cached result; a cache hit re-attaches the result
	| 'manual'; // never auto-execute — user clicks ▶ Run on each block

/** Configuration for the QueryJS scripting plugin */
export interface QueryjsSettings {
	/** When QueryJS blocks should auto-execute. Default 'first-open'. */
	autoRunQueries: AutoRunQueriesPolicy;
}

/**
 * Release channel the in-app auto-updater follows.
 *
 * - `'stable'` → tag-driven builds from `.github/workflows/release.yml`.
 * - `'nightly'` → push-to-main builds from `.github/workflows/nightly.yml`.
 *
 * The channel chosen here is independent of the channel the build itself
 * belongs to (see `__APP_CHANNEL__`). A nightly build can follow the
 * stable channel and vice versa, but switching from nightly to stable
 * does not automatically downgrade the user — nightly versions are
 * semver-greater than the same-base stable versions, so the auto-updater
 * will never offer a "downgrade". Manual reinstall is required.
 */
export type ReleaseChannel = 'stable' | 'nightly';

/** Configuration for the in-app auto-updater */
export interface UpdateSettings {
	/**
	 * Which release channel the auto-updater should check.
	 *
	 * Defaults to the channel the current build belongs to on first launch
	 * (so a freshly installed nightly DMG starts on the nightly channel,
	 * a freshly installed stable DMG starts on stable). Persists across
	 * restarts.
	 */
	channel: ReleaseChannel;
	/**
	 * Whether the app should silently check for updates when the vault
	 * opens. Off by default — the first check should be a user-initiated
	 * action so the app does not phone home on every cold start without
	 * consent. When enabled, fires once per vault open (no throttle —
	 * the cost is one HTTP request per launch to a public GitHub CDN
	 * object, and a Nightly user publishing several builds per day
	 * expects the toggle to actually fire on every launch).
	 */
	autoCheck: boolean;
	/**
	 * Unix milliseconds timestamp of the last update check, manual or
	 * automatic. `null` means the user has never checked. Drives the
	 * "Last checked: X ago" text in the Update section. Does NOT gate the
	 * launch-time auto-check — every vault open re-checks when
	 * `autoCheck` is on.
	 */
	lastCheckedAt: number | null;
}

/** Sidebar navigation sections in the settings dialog */
export type SettingsSection = 'appearance' | 'layout' | 'editor' | 'periodic-notes' | 'quick-capture' | 'one-on-one' | 'files' | 'search' | 'file-history' | 'auto-move' | 'trash' | 'todoist' | 'sentry' | 'queryjs' | 'types' | 'event-calendar' | 'troubleshooting' | 'update' | 'labs';

/** One of the event colors in `EVENT_CALENDAR_COLORS` */
export type EventCalendarColor = (typeof EVENT_CALENDAR_COLORS)[number];

/** One of the calendar view modes in `EVENT_CALENDAR_VIEW_MODES` */
export type EventCalendarViewMode = (typeof EVENT_CALENDAR_VIEW_MODES)[number];

/** Configuration for the event calendar */
export interface EventCalendarSettings {
	/** First day of the week: 0 = Sunday, 1 = Monday */
	weekStartsOn: 0 | 1;
	/** Clock format used for time labels */
	timeFormat: '24h' | '12h';
	/** First hour the time grid scrolls to (integer, 0–12) */
	dayStartHour: number;
	/** Whether Saturday and Sunday are shown in the week view */
	showWeekends: boolean;
	/** Whether dated tasks (📅) are shown on their due day */
	showTasks: boolean;
	/** View mode the calendar opens in */
	defaultView: EventCalendarViewMode;
	/** Duration of a newly created event in minutes (multiple of 15, 15–480) */
	defaultDurationMinutes: number;
	/** Color of a newly created event */
	defaultColor: EventCalendarColor;
	/** Type name event notes carry in their `type` frontmatter (never `Type`) */
	eventTypeName: string;
}

/** Top-level settings object persisted as `.kokobrain/settings.json` inside the vault */
export interface AppSettings {
	periodicNotes: PeriodicNotesSettings;
	quickCapture: QuickCaptureSettings;
	oneOnOne: OneOnOneSettings;
	layout: LayoutSettings;
	folderNotes: FolderNotesSettings;
	editor: EditorSettings;
	templates: TemplatesSettings;
	appearance: import('./theme.types').AppearanceSettings;
	/** File history feature configuration */
	history: HistorySettings;
	/** Search feature configuration */
	search: SearchSettings;
	/** Todoist integration configuration */
	todoist: TodoistSettings;
	/** Optional Sentry error-monitoring configuration */
	sentry: SentrySettings;
	/** Auto-move feature configuration */
	autoMove: AutoMoveSettings;
	/** Event calendar configuration */
	eventCalendar: EventCalendarSettings;
	/** Whether debug messages are logged to the browser console */
	debugMode: boolean;
	/** Whether Rust backend debug logs are forwarded to browser devtools */
	debugModeTauri: boolean;
	/** Whether frontend debug logs are also written to a file in .kokobrain/logs/ */
	debugLogToFile: boolean;
	/** Explicit consent to save raw mod run messages locally; also requires frontend file logging. */
	debugModRunMessages: boolean;
	/** Whether Tauri backend debug logs are also written to a file in .kokobrain/logs/ */
	debugTauriLogToFile: boolean;
	/**
	 * Whether the log heartbeat ticks every 250 ms ([HB] alive lines). Used only when
	 * investigating UI freezes — a missing tick pinpoints the wall-clock window the
	 * JS event loop was stuck. Off by default; turn on alongside `debugLogToFile`
	 * when reproducing a stall. No effect unless a log session is active.
	 */
	debugHeartbeat: boolean;
	/** Whether live preview decoration plugin timing is logged (LP-PROFILE entries) */
	livePreviewProfiling: boolean;
	/** Live preview decorators that are disabled (keyed by decorator name) */
	disabledDecorators: Record<string, boolean>;
	/** Tag color assignments (persisted per-vault) */
	tagColors: TagColorSettings;
	/** QueryJS plugin configuration (execution policy, …) */
	queryjs: QueryjsSettings;
	/** In-app auto-updater configuration (channel selection, …) */
	updates: UpdateSettings;
	/** Whether new notes start unorganized and require explicit organization (Portent inbox workflow) */
	explicitOrganization: boolean;
	/** Whether to show notes without a type in the type sidebar */
	showUntypedNotes: boolean;
	/** Vault-relative base folder prepended to a type's own `_folder` when creating typed notes (empty = vault root) */
	typesBaseFolder: string;
	/** Whether the inbox count is shown as a red badge on the macOS dock icon */
	dockBadgeInboxCount: boolean;
}
