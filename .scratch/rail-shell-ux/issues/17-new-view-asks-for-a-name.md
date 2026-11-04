# 17: New view asks for a name and creates the view under that name

**What to build:** The `+` next to Views in the Types navigator opens a "New view" dialog instead of writing `Untitled.view` at once. The user types a name and presses Enter or Create. A `.view` file named after the typed name is created at the vault root, with that name as its label (`_sidebar_label`) and as its table view's name, no filters and the default `_sort: title`. The new view becomes the note list's lens and its row is highlighted. Cancel or Escape writes nothing. If creation fails, the dialog stays open, keeps the typed name and shows the reason inline; it cannot be closed while a create is in flight.

Prefactor first, in its own commit: the view-creation service takes the name, builds the YAML from a pure builder using the YAML serializer (today it pastes the title into a template string, which is safe only because the title is always `Untitled N`: a typed `#tag`, `123`, `true` or `- x` would write a broken `.view`), and rejects on failure instead of returning null (today a failed create is silent):

```ts
createView(name: string): Promise<string> // resolves to the new path; rejects with no vault, or when the folder cannot be read or the file cannot be created
```

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus the rail-shell E2E spec via `bash scripts/e2e.sh`.

- [ ] Pure builder: the YAML for a name parses back through the collection parser with the name intact as label and as the first view's name, for names YAML would otherwise retype or cut: `#tag`, `123`, `1e3`, `0x1F`, `true`, `yes`, `null`, `~`, `NaN`, `inf`, `[x]`, `- x`, a name with `'` and `"`, and a 200-character name (not folded across lines) (logic test, real parser)
- [ ] The label also resolves through the navigator's label helper from an entry whose frontmatter is the builder's parsed top level (logic test; the E2E cannot prove it, see Notes)
- [ ] Name check runs on the trimmed name: blank, a leading `.` (including `" .x"`), control characters and forbidden filename characters each give a message; a name an existing view row already shows, compared trimmed and case-insensitive, gives "A view with this name already exists"; a valid name gives none; leading and trailing spaces never reach the filename or the label (logic test)
- [ ] Service: creates `<name>.view` at the vault root with the builder's content; dedupes the filename against siblings (`<name> 1.view`) while keeping the typed label; asks for a prompt index refresh so the label lands without the burst throttle; rejects with no vault, when the root cannot be read and when the file cannot be created, and selects nothing then (service test, plugin-fs and the Tauri boundary mocked, real stores). The existing "does nothing when vault path is not set" test is replaced by the rejection case, not deleted
- [ ] Dialog: the name field has focus on open; Create is disabled while the name is blank or invalid, and the message shows once the user has typed; Enter on a valid name submits; Cancel, Create, Escape, an outside click and the close button do nothing while saving; a rejected create keeps the dialog open with the reason in a `role="alert"` element and the typed name kept; reopening starts blank (component test)
- [ ] Navigator: `+` opens the dialog; a successful create picks the new view (lens set, row highlighted, `aria-current`); a failed one picks nothing; the existing New view tests are rewritten to the dialog flow, not deleted; the view-open-in-editor row behaviour still passes (component test, real stores and real row builder)
- [ ] E2E happy path in the rail-shell spec: open Types, click `+`, type a name, Create; a row with that name appears and is current; the saved `.view` at the vault root holds `_sidebar_label: <name>`
- [ ] Help: the Types and Relationships page describes the dialog in both places that say New view creates an `Untitled.view` (the Views bullet and "Creating a View")

## Notes

- **Owner decisions (2026-11-04):** filename is the name as typed, deduped the way notes are (`Name 1.view`), no slug; file goes to the vault root, as today; a name an existing view already shows is refused; no `_order` is written, so the new view sorts by name among the default order; no success toast (as New type); failures show inline with the dialog kept open.
- **Reference:** modelled on Tolaria's Create View dialog (name + filters, inline save error, icon and color set later from the row menu). The design and its adversarial review were written to `/tmp/view-dialog-scout/10-design.md` and `11-review.md` (not in the repo).
- **Dialog shell:** follow the New type name dialog (bindable `open`, validation derived from the value, Enter on the input submits) with the event form's submit model (`saving` flag, inline `role="alert"`, the error rethrown so the dialog stays open). Mount it next to the New type dialog in the Types navigator.
- **No `<form>` wrapper.** Issue 18 puts the filter panel in this dialog; its dropdown triggers contain a typeless `<button>`, which inside a form submits on a mouse click. Submit via Enter on the name input and an `onclick` on Create.
- **E2E mock gap:** the E2E vault-index mock indexes only `.md` files with `---` frontmatter, so in E2E a `.view` row always shows its filename. With the filename equal to the name this still matches; the label itself is proven in unit tests. Extending the mock is out of scope.
- **Known, out of scope:** an unfiltered view lists every note and every `.view` file, the new view included (filed as Issue 01). A name containing ` #word` or `[[x]]` gives the `.view` a tag or an outgoing link, because Rust extracts both from the raw content; accepted.
- **Not handled (rare race):** delete `Foo.view` in Finder, then create "Foo" in the dialog: the view parse cache can serve the deleted file's filters for one refresh. A one-line cache clear after create would fix it; left for the owner.
- **Leftover kept:** `createView` also sets a type-definitions selection of kind `view` that nothing reads; its existing test asserts it. Leave it.
- **Size:** M.

## Comments
