# Completeness critique of the view-editor sweep

## Ranked gaps (most severe first)

**C1. HIGH [edit-dialog, PRD premise]. The PRD makes the lossy filter round trip permanent, and nobody followed it to what it does to the file.**
- The rail runs the round-tripped filter, not the file's filter: `seedToolbarStateFromDefinition` re-parses the filters into groups (`src/lib/features/type-definitions/type-note-list.logic.ts:44-52`), and the lens runs those (`src/lib/features/rail-shell/lens.logic.ts:792-796`). I verified this.
- The collection editor does the same (`src/lib/features/collection/CollectionView.svelte:157-161`, `:258-259`). Verified.
- Severity correction to V02 #2: a no-op Save does not change what the rail or the editor show, because both already run the round trip. It changes three other things:
  - the file's meaning for inline blocks, which run the raw filter;
  - the file's meaning for agents and other readers;
  - the file's bytes.
- The real defect is that the rail and the editor do not honour the file. Known lossy cases, each cited by two validators:
  - `date('X')` becomes a plain string;
  - `'5'` becomes `5`;
  - `p != true` becomes `p == false`;
  - `{and: []}` becomes JSON text;
  - an empty `or` is dropped;
  - a top-level list stays truthy.
- PRD.md:13 ("Save writes every field as loaded") makes every dialog Save write these losses to disk.
- **To close:**
  - The owner picks one of two fixes. (a) A section the user did not touch writes nothing, so the raw filter bytes stay. (b) Fix `parseFilterToGroups` and `filterGroupsToFilter` so the round trip is an identity, proven by a test that round-trips every documented filter shape.
  - Either way, the rail should run the raw filter when no override exists.

**C2. HIGH [edit-dialog, owner decision on a wrong premise]. Comment loss is a choice, not a limit of the library.**
- V10 cited ADR 0029:74 ("yaml@2.9.1 with our options does not preserve them") to doubt the `parseDocument` route. I re-ran it: `parseDocument(src)`, then `setIn(['views',0,'name'])`, `set('_rail_view')` and `toString({lineWidth:0})`, keeps both the head comment and the inline comments.
- ADR 0029 describes the frontmatter serializer, which builds a new document key by key (`doc.set` per property). It does not describe editing the parsed document.
- PRD.md:21 accepts comment loss as if it were unavoidable.
- **To close:** ask the owner to re-decide. A spike rewrites `updateViewEditYaml` on the Document API. `src/lib/core/frontmatter/properties.logic.ts:257,408,573` already uses `parseDocument`.

**C3. HIGH [edit-dialog]. A hidden view has no way into the dialog, and the PRD's Behavior section would add a "hidden" switch.**
- `handleEditView` returns when no visible row exists (`src/lib/features/rail-shell/TypesNavigator.svelte:147-152`). Rows skip `_visible: false` (`lens.logic.ts:647`). Verified.
- A grep finds the dialog opened from only two places: Types "+" (`TypesNavigator.svelte:254`) and the Types row menu. The Files navigator's New view also creates through it (`FilesNavigator.svelte:403-404`).
- There is no palette command for New view or Edit view, and the collection editor and the rail list header have no entry either.
- Saving "hidden" from the new dialog therefore removes the dialog's only way back to that view.
- **To close:** the PRD needs an Edit view entry that works for hidden views, for example the Files navigator row menu, a palette command, or a button in the editor or the rail header. That entry must ship in the same Issue as the hidden switch.

**C4. HIGH [visualization, edit-dialog], new and confirmed. One pick in the Filter panel can lock the rail toolbar.**
- The picker offers every indexed key (`src/lib/features/collection/toolbar/filter.logic.ts:221-236`). The emitter writes the property name unquoted (`:41-46`).
- A key with a space breaks the parse (`Unexpected token after expression`, V03 M8 / V04). So does a non-ASCII key, per V03's tokenizer facts; I did not re-read the tokenizer for that.
- A date value is not escaped (`:71-78`), while `quoteString` escapes only string operands (`:549-552`). So a `'` in a date value also breaks it.
- The live toolbar saves at once (V03 M6). Any error status then hides Sort and Filter (`src/lib/features/rail-shell/RailNoteList.svelte:192`; comment at `:860` "Sort and Filter stay hidden"). The only way out is Open view.
- This settles V05 M1's open question: yes, the panel can write such a filter.
- The expression language has no indexing (V03), so a key with a space cannot be referenced at all except by `file.hasProperty`.
- **To close:**
  - Leave keys the expression language cannot reference out of the picker, or add a quoted-key syntax.
  - Escape date values.
  - The dialog preview must show `filterError` and block Save on it.

**C5. MEDIUM-HIGH [edit-dialog, PRD gap]. The name field has no "not set" state.**
- With no `_sidebar_label`, the label falls back to the file name (`src/lib/features/type-definitions/type-sidebar.logic.ts:337-340`, `lens.logic.ts:650`). Verified.
- The dialog uses that label (`TypesNavigator.svelte:150`, `ViewDialog.svelte:76`).
- Save always writes `_sidebar_label` and, under PRD.md:19's single-view rule, `views[0].name` (`yaml-parser.ts:314,318`).
- This breaks PRD.md:14 ("not set writes nothing").
- Correction to V01 #2: its New table example cannot be reached as written. New table writes `_visible: false` (`collection.service.ts:18-21`), so it has no Types row until Show in Views. The single-view rename remains real. Under PRD:19 the multi-view rename goes away.
- **To close:** a PRD rule that an absent `_sidebar_label` plus an unchanged name writes nothing. The label should also be read from the file, not from the index entry, which can lag.

**C6. MEDIUM [edit-dialog]. The dirty-tab case is not covered by the conflict risk the owner accepted.**
- A `.view` tab can be dirty. Source mode mounts `MarkdownEditor` on the tab content (`src/lib/app/EditorView.svelte:86-90`, `:122-134`). Autosave uses a 2 s debounce with a 10 s maximum (`src/lib/core/editor/editor.service.ts:227`).
- The dialog prefills from disk (`ViewDialog.svelte:83`). The rewrite starts from the dirty buffer (`type-definitions.service.ts:388`).
- PRD.md:13 accepts edits made while the dialog is open. Unsaved source-mode edits made before it opened are a different case, and with the new sections Save would overwrite every field.
- **To close:** prefill from the same base the write uses (the dirty buffer), or flush the tab before loading.
- Not verified: whether `waitForTabSave` (`:383`) flushes a pending debounce or only waits for a save already in flight.

**C7. MEDIUM [edit-dialog]. The live preview is not specified, and its cost is unmeasured.**
- `countViewNotes` reads the file from disk on every call (`view-lens.service.ts:33`), so the preview cannot reuse it as V06 suggests.
- A preview needs:
  - `executeQuery` on the draft definition;
  - the draft `_sort` injected into `ctx.entries`, because `viewRowSet` reads `_sort` from there (`lens.logic.ts:711,714`);
  - `filterError` shown;
  - a debounce.
- Nobody measured `viewRowSet` on a vault the size of the owner's.
- **To close:** time one preview run on the owner's vault, then write the preview contract into Issue 01.

**C8. MEDIUM [reference, docs]. Frontmatter dates reach the evaluator as strings, and the docs' formula example gives NaN.**
- This settles the open question in V02, V03 and V08.
- yaml's core schema reads `2026-01-05` as a string (run). `collection.logic.ts` builds a `Date` only for `file.ctime` and `file.mtime` (`:415-416`).
- The evaluator does date arithmetic only when the left side is a `Date` (`evaluator.ts:245-253`). Otherwise `toNumber` returns `Number('2026-01-05')`, which is NaN (`:624-629`).
- So `daysLeft: "date - today()"` (`help/documentation/12-collection.md:352`) gives NaN.
- The same docs block has a compound `&&` filter string (`:348`), which becomes a raw row (V05 G1).
- **To close:** fix the docs. The agent reference should say to wrap the property in `date()`, as in `date(due) - today()`, and to prefer `and:` lists.

**C9. MEDIUM [PRD process]. PRD.md:19 overturns a recorded decision, and the PRD has no task to update it.**
- ADR 0027:40 says Edit view renames the view and rewrites `_rail_view`.
- Help 25:177 and 25:487 say the same.
- The tests at `yaml-parser.test.ts:988` and `:1093` (V10) also assume it.
- **To close:** add the ADR 0027 amendment and the help changes to the acceptance criteria of the Issue that changes the rename rule.

**C10. MEDIUM [severity contradiction]. A stale `_rail_view` after a tab rename was rated anywhere from High to low-medium.**
- V07 and V09 rate it High, V01 and V05 Medium, V10 low-medium.
- The rename case is documented and accepted, with a row mark (ADR 0027:40, help 25:487). Deleting the tab is not documented.
- I rate it Medium. The PRD's `_rail_view` selector makes it cheap to keep in sync inside `renameView` and `removeView` (`yaml-parser.ts:364-407`, verified to leave `_rail_view` alone).

**C11. MEDIUM [visualization], confirmed, outside the PRD. Bars in the linear calendar are misplaced.**
- Positions are divided by `daysInMonth` (`CollectionLinearCalendarView.svelte:65-71`), but the track spans 31 columns (`:189`, `:194`).
- Seven months out of twelve are affected. In February, day 28 lands about 2.9 cells to the right of its column.
- Not seen on screen. V08 rated it High; it belongs in a separate Issue.

**C12. LOW-MEDIUM [reference]. An agent has no way to validate a `.view` without the app.**
- `scripts/` has no `.view` checker, and `docs/agents/view-files.md` does not exist yet (ls).
- Feedback takes 3 to 12 s, and filter failures are silent (an unknown method gives 0 rows; a list matches everything).
- **To close:** a small script around `parseCollectionYaml` and `validateExpression`, plus a method-name check, named in the reference.

## Not covered by any report
- **Undo.** No undo for view writes: a grep for `undo` in `type-definitions/` and `rail-shell/` finds nothing. Whether a dialog save enters the open tab's CodeMirror history (`syncExternalContentToEditor(..., 'none')`) is not verified.
- **iOS PoC.** How the `feature/ios-poc` branch handles `.view` files was not checked.
- **Dialog layout.** Four sections plus a preview at `sm:max-w-lg` (`ViewDialog.svelte:169`). Enter submits from the name field only (`:159-163`), and nobody specified Enter for the new fields.
- **Vault switch while the dialog is open.** `vault-changed` exists (`type-definitions.service.ts:286-289`), but the dialog's path for it was not traced.
- **Quick Switcher and hidden views.** The docs say it finds them by file name (help 25:418); the code was not checked.

## Contradictions resolved
- **Comments.** They survive the `parseDocument` route (run, see C2). ADR 0029 is about another code path.
- **Line folding.** The default width folds at 80 columns, and the folded value parses back the same (run). It is cosmetic.
- **Duplicate keys.** The TS parse throws `Map keys must be unique` (run). This confirms V01 and replaces V02's "plausible".
- **`title_color`.** It is an alias of `_title_color` (V01 corrects A02).
- **Edit view on a hidden view.** It cannot be reached (A03 refuted, confirmed above).

## Still unverified
- How the rail parses the JSON text `{"or":[]}`.
- What a click on a `link()` cell anchor does at runtime.
- Whether an error boundary catches a non-string `dateProperty`.
- How `scripts/fix-feat-ratio.mjs` counts the hotspot fixes.
- Whether the Rust tag path strips `#`.
- Whether `waitForTabSave` flushes a pending debounce.