# Scout 29: ext-task-syntax

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

I did not write the report file. My instructions say to return findings in the final message, not as a .md file, so the findings are below. Logseq's official docs were unreachable, so the Logseq claims rest on secondary sources.

## Facts

**Obsidian Tasks emoji format** (https://publish.obsidian.md/tasks/Reference/Task+Formats/Tasks+Emoji+Format, fetched)
- Dates: ➕ created, ⏳ scheduled, 🛫 start, 📅 due, ✅ done (on `[x]`), ❌ cancelled (on `[-]`). Examples use YYYY-MM-DD only.
- Priority: ⏬ lowest, 🔽 low, none = normal, 🔼 medium, ⏫ high, 🔺 highest.
- Recurrence: 🔁 (e.g. "every day when done").
- onCompletion: 🏁 with `keep` or `delete`. No 🏁 means keep.
- Dependencies: 🆔 `<id>` gives a task an ID. ⛔ `<id>,<id>` lists the IDs it depends on, comma-separated with no spaces. Examples: `🆔 dcf64c`, `⛔ dcf64c,0h17ye`.
- Known limitations: NBSP characters and Unicode variation selectors break emoji parsing (issues #606 and #2273, linked from the page).
- Unverified: the search excerpt listed aliases 📆 and 🗓 (due) and ⌛ (scheduled). The official page lists none, and I could not confirm them against the plugin source. The aliases come from a GitHub issue (https://github.com/cronai-labs/okf-vault-kit/issues/50), which is secondary.
- Date-only and times (https://publish.obsidian.md/tasks/Getting+Started/Dates, fetched): only `YYYY-MM-DD`, must be absolute (`📅 today` is not understood), invalid dates are silently ignored. Times are not supported for due/scheduled/start, and created/done/cancelled timestamps are not recorded. The page says nothing about timezone, DST, or how recurrence computes the next date.

**Dataview inline fields** (https://blacksmithgu.github.io/obsidian-dataview/annotation/metadata-tasks/ and /annotation/add-metadata/, fetched)
- Syntax `[key:: value]`. Paren form `(key:: value)` hides the key in reader mode. Unbracketed `key:: value` works only when the field is alone on its line. Lists and tasks always need brackets.
- Value runs to the end of the line. `due:: 2022-04-05` becomes a Date. Keys may be UTF-8, but emoji keys need brackets.
- Shorthands: 🗓️→`due`, ✅→`completion`, ➕→`created`, 🛫→`start`, ⏳→`scheduled`. Date shorthands only. Priority and recurrence are not supported.
- Implicit task fields: `status`, `checked`, `completed`, `fullyCompleted`, `text`, `line`, `parent`, `section`, `blockId`, and others. Dataview's `completed`/`checked` fields can clash with user-written keys (secondary source: https://www.dsebastien.net/the-complete-guide-to-dataview-in-obsidian/).

**todo.txt** (https://github.com/todotxt/todo.txt, fetched)
- Core spec: priority `(A)`–`(Z)` first, optional creation date `YYYY-MM-DD`, `@context`, `+project`, completion `x ` plus completion date.
- Metadata is `key:value` with one colon, no whitespace in key or value. The README's example is `due:2010-01-02`, and it says tool developers may define extras.
- Due dates are not part of the core spec. `t:` (threshold) is not mentioned in the README (the search excerpts that cover it are secondary).

**Logseq** (official docs https://docs.logseq.com/#/page/tasks unreachable; GitHub docs path 404)
- Org-mode timestamps on a line under the block: `SCHEDULED: <2022-07-20 Wed .+1d>`, `DEADLINE: <YYYY-MM-DD Day>`. Repeaters `+`, `++`, `.+`, with units h, d, w, m, y, per the Org manual (https://orgmode.org/manual/Repeated-tasks.html, search excerpt only). Logseq's format summary is from a DeepWiki page, which is a third-party summary.
- Logseq issues: #6715 (weekly/hourly repeater syntax inconsistent), #6116 (date picker silently changes `+1d` to `.+1d`), db-test #1355 (monthly repeat on the 1st shifts across timezones east of UTC). Source: https://github.com/logseq/logseq/issues/6715, https://github.com/logseq/logseq/issues/6116, https://github.com/logseq/db-test/issues/1355.
- Forum (https://discuss.logseq.com/t/is-there-a-full-doc-about-scheduled/23265): repeater is stored as plain text, so queries cannot compute from it. Advanced queries see `:block/scheduled` as an integer such as `20251209`.

## Problems and gaps
- Emoji and Dataview fields both store the done date under different names (`done`/`completion`). An importer must map them.
- Dataview's `completed` clashes with user keys. Obsidian Tasks ignores Dataview fields, so one syntax won't round-trip.
- Date-only (Obsidian) versus datetime with repeater (Logseq). Anything with time or `++`/`.+` semantics loses data when imported as a plain date.
- Invalid or relative dates are silently dropped by Obsidian Tasks. A note app should flag them.
- Local timezone handling is undocumented in Obsidian. Store dates as calendar-day strings, never as UTC instants, to avoid off-by-one errors.
- NBSP and variation selectors in emoji break parsing. Normalize input before matching.

## Ideas worth keeping
- Parse Obsidian Tasks emoji as the primary syntax, since it's the widest-used and documented. Store dates as `YYYY-MM-DD` strings.
- Read-only importers for Dataview `[key:: value]` and todo.txt `due:`/`t:`, and for Logseq SCHEDULED/DEADLINE. Keep the raw repeater string unparsed so it can be written back.
- Keep unknown tokens verbatim so round-trips do not lose data.
- Support 🆔/⛔ dependencies: IDs are cheap to store and map cleanly onto the current filePath + text identity problem.

## Open questions
- Are 📆, 🗓, and ⌛ real Tasks aliases? Confirm in the plugin source (`main.js` of obsidian-tasks-plugin) before relying on them.
- Logseq official syntax and repeater semantics: confirm from docs.logseq.com or the logseq/docs repo, which I could not reach.
- How does Obsidian Tasks compute the next recurrence date (`🔁 every` with due date)? Not documented on the pages I fetched.
- Does Todoist's own due-date model (date vs datetime, timezone) need to be the canonical model for the integration?
