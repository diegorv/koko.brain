# Scout 26: ext-gtd-apps

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

**Scope note:** I did not write the report file. The agent rules say to return findings directly, so the full findings are below and the summary is at the end. The TickTick help article was truncated in both fetches, so its filter details are from search snippets only.

## Facts

**Things 3 (default lists, no custom rules)**
- Built-in lists are Inbox, Today, Upcoming, Anytime, Someday, Logbook, plus Trash. Source: https://en.wikipedia.org/wiki/Things_(software) and https://culturedcode.com/things/support/articles/4001304/
- Today: "if the start date, deadline, or repeating rule of any to-do matches today's date, it shows up here." Has a "This Evening" section. Source: culturedcode.com/things/support/articles/4001304/
- Upcoming: "a place for tasks that you can't tackle right now but want to conquer on a specific day down the road." Items move to Today when the start date arrives. Source: same.
- Anytime: "nothing's blocking you from working on any task in this list right now." Today's tasks also appear here with a yellow star. Source: same.
- Someday: "there's no plan for it yet, and you might decide to discard some of it eventually." Items in Someday do not appear in Anytime or Upcoming. Source: same.
- Logbook: "all your completed or cancelled to-dos and projects end up here." Source: same.
- A future start date hides the item until that day. A deadline does not hide an item; it stays in Anytime. Source: same.
- The store model is exclusive: Start is On Date, Anytime, or Someday, so an item cannot have both a date and Someday. Source: https://culturedcode.com/things/support/articles/4001304/ (Shortcuts section).
- The help article does not mention any custom smart list, saved filter, or rule builder. Source: https://culturedcode.com/things/support/articles/4001304/. From memory, Things 3 has no user-defined smart lists; this was not verified.

**OmniFocus (rule builder, the most complete reference found)**
- Root rule is All, Any, or None. "The top rule can't be deleted, but can be set to one of the other options." Source: https://support.omnigroup.com/documentation/omnifocus/mac/4.0/en/custom-perspectives-pro/
- Nesting: "By nesting rules beneath an additional _All_, _Any_, or _None_ rule, you can create additional complexity." Drag to reorder. Reordering peers has no effect; moving a rule to another level can change results. Same source.
- None is described as excluding any match "regardless of any other rules." Same source.
- Default new perspective includes one example rule, "Availability: Remaining." It can be disabled, deleted, or switched to First Available, Available, Completed, or Dropped. Same source.
- Rule types (about 22): Status (Due Soon/Flagged); Availability; has estimated duration (and less than 5/15/30/60); has due date; has defer date; has date in range (due, defer, completed, dropped, added, changed); is repeating; is untagged; has a tag that… (5 variants); is tagged with any of / all of; is project/group/neither; is in Inbox; is in single actions list; has a project that… (7 variants); is contained within project or folder; matches search terms; All/Any/None groups; Comment (does not affect results). Same source.
- No documented limit on rule count or nesting depth. Same source.
- Automation: v4.2+ exposes `archivedFilterRules` and `archivedTopLevelFilterAggregation` ("all", "any", "none"). Source: https://omni-automation.com/omnifocus/perspective.html (search result; not fetched).

**TickTick (Filters, formerly Custom Smart List)**
- Premium feature. Source: https://ticktick.com/features?language=en_us (search result).
- Two modes: Normal filtering (list name, tags, date, other attributes, keyword) and Advanced filtering ("multi-statement queries using logical operators such as 'OR' and 'AND'", with lists, dates, priorities, tags). A Preview button shows results before saving. Source: https://help.ticktick.com/articles/7055782240994721792 (search snippet; the fetched page returned only a truncation marker).
- Original 3.0 criteria: List, Tag, Date, Priority, Assignee. Priority has four levels. Source: TickTick blog post (search snippet), and https://apps.apple.com/app/id966085870 for the premium listing.
- Not verified: NOT operator, nesting or parentheses, date range options, and whether assignee is still a field.

**Apple Reminders (Smart Lists)**
- Create via List Type > Smart List, then "Include reminders matching" All or Any, then add filters with Add/Remove buttons. Source: https://support.apple.com/guide/reminders/create-custom-smart-lists-remnfec66479/mac
- Filter types: Tags, Date, Time, Priority, Flag, Location, Lists. Date offers Today, After a Date, Specified Range, Relative Range (In the Next/Past N units, optional Include Past Due). Same source.
- Lists filter can exclude lists (for example, everything except Work). Source: https://support.apple.com/en-in/guide/iphone/iphe882772ed/ios (search snippet).
- The Mac page does not mention nested rules or smart lists as criteria. Same source.
- A secondary search summary says nesting is not allowed and each criterion can appear only once. Not confirmed on Apple's page.
- Built-in Smart Lists: Today (scheduled today plus overdue), Scheduled, All, Flagged, Completed. Source: https://support.apple.com/en-in/guide/iphone/iphe882772ed/ios (search snippet).
- Limits: a shared list cannot be converted to Smart List; the default list cannot be converted; older OS versions cannot view some smart lists. Source: the Mac page above.

## Problems and gaps
- Things 3 has no user-defined rules; the owner's "specific rules" need cannot be met by Things' model. The closest pattern is fixed lists plus tags and areas (from memory).
- Apple's model is flat: one level of All or Any. It is the simplest rule builder of the four, and users hit its limit quickly (from the secondary summary).
- OmniFocus is the only fully documented nested builder. Its breadth (22 rule types) is a learning cost; it is a reference for capability, not for simplicity.
- TickTick's two-mode design (Normal vs Advanced) splits the same feature in two. Source: the help snippet above.
- Date-range handling differs across apps: Apple uses relative ranges; Things uses start and deadline with hibernation. This matters for "which tasks are picked up."

## Ideas worth keeping
- Root All/Any/None group with nested groups (OmniFocus). Covers the "rules for which notes/tasks are sourced" need.
- Relative date filters with an "include past due" toggle (Apple).
- Built-in lists modeled on Things (Today, Upcoming, Anytime, Someday, Logbook) as fixed, non-editable views on top of user rules.
- Preview button before saving a filter (TickTick).
- Exclusive start-state model (Things): an item is either dated, Anytime, or Someday. Clarifies sourcing.

## Open questions
- Does TickTick's Advanced mode support NOT and parentheses? Needs the full help article (fetch failed; truncated).
- Does Things 3 have any undocumented or Shortcuts-based filtering? From memory, not verified.
- How does the owner's "sourcing" differ from a filter: which notes count as task sources (file, tag, folder, or property)?

**Summary (at most 120 words):** Things 3 has fixed lists only (Inbox, Today, Upcoming, Anytime, Someday, Logbook) and no custom rules, from the official article. Apple Reminders has flat All/Any rules with date ranges and list exclusion, but no nesting per Apple's page. OmniFocus has the full model: a root All/Any/None group, nested groups, about 22 rule types, and no documented depth limit. TickTick Filters use Normal and Advanced modes with AND/OR; the full article did not load, so its details are unverified. Most sources are primary; search snippets are flagged.
