# F verify: embed widgets resolve links with an O(tree) proxy walk in toDOM

Adversarial review of `F-deep-dive.md`. Code at `main` (99a4aed5), CodeMirror view 6.43.15, Svelte 5.57.2.
Verdict: **partially confirmed**. The root cause and fix 1 survive. The arithmetic behind "3 x 46 ms", the
"previous tab's scrollTop" amplifier mechanism, the stall-to-freeze reading, one count, and test (c) do not.

## Root cause: holds

VERIFIED (read):
- `src/lib/app/editor-host.ts:59-61`: `resolveWikilink(target, flattenFileTree(fsStore.fileTree).map(f => f.path))`
  on every call, with no memo.
- `widgets.ts:544-548,570`: `WikilinkImageEmbedWidget.toDOM` calls it synchronously. `widgets.ts:591-597,652`:
  `loadEmbedContent` calls it before its first `await`.
- `fs.store.svelte.ts:6,21,27`: deep `$state` tree. Svelte `proxy.js:170-203`: every `get` does `prop in target`
  plus `sources.get`/`get(s)`. A fresh proxy creates its sources lazily on the first walk.
- `wikilink-resolution.logic.ts:11-35`: pass 1 compares the extension-stripped basename with the full target.
  It never matches a target that has `/` **or an extension** (`foo.png` vs `foo`), so every image embed pays
  pass 1 in full plus part of pass 2.
- All dispatch sites in `MarkdownEditor.svelte` run inside `untrack` (`:206`, and the effects at about `:342-400`),
  so toDOM proxy reads do not register effect dependencies today.
- The fruit fly note has 14 embeds at offsets 575, 1079, 1797, 2614, 3420, 5435, ... (re-read).

Independent log check that does not depend on the bench: Radar has exactly **one** `![[` (offset 433) and no
tables, callouts, fences, md images or math in its first 5,000 chars. Yet its docReplace is 52/54/71 ms, against
p50 5 ms. One embed therefore costs about 45-65 ms of sync JS. The only per-embed sync work in `toDOM` is
`resolveLink`: `convertFileSrc` is a string op, and `img.src` is async. This is the strongest evidence for F.

## Numbers: corrections

1. **"3 embeds x 46 = 130 ms vs 142/156" is coincidence-prone.** CM draws widgets for `view.viewport`, not
   `visibleRanges`. `getViewport` (`@codemirror/view` dist `index.js:6496-6503`) adds about 500 px below the
   visible area when bias is 0. On the re-open (visible `364-2248`, at the top), the embeds at 2614 and probably
   3420 are inside the viewport, so 4-5 embeds were drawn, not 3. That gives about 30-39 ms per embed, against
   52-71 ms for Radar's single embed. The per-embed cost is 30-65 ms in WebKit (INFERRED range). The bench's
   46 ms falls inside it, but the 3-embed match is not evidence.
2. **"8 of the 10 docReplace events >= 50 ms"**: the log has **9** such events (lines 3451, 9567, 9693, 9784,
   9866, 9989, 10073, 10191, 10232). 8 are reading-list notes and 1 is `_gmail-inbox`. So it is 8 of 9.
3. **The stall reading is overstated.** `[HB] stall N` is a gap between ticks, so the block is at least N-250
   (baseline). The 462 ms stall (`49.900` to `50.362`) is mostly fruit fly, and the log gives the real block
   directly: `50.092` to about `50.356` (dispatch 143 ms, Svelte 21 ms, then about 100 ms to rAF1, which INFERRED
   is the CM measure frame). Then a second block from `50.362` to `50.529`, which `[NAV] click -> next paint 171ms`
   at `50.536` confirms. The deep dive missed that line, and it is the best evidence for the second wave.
   That makes about 430 ms in two tasks, so the 0.15-0.45 s claim survives on this basis, not on "462".
   The 356 ms stall on the second open (`51.249` to `51.605`) covers **Laya's** 61 ms docReplace as well
   as fruit fly's 156 ms, so it is not "per open".
4. Also missed: the second open is a **closeTab cascade** (`closeTab` at 51.276, 51.426, 51.612 and 51.776). Each
   close that activates a reading-list tab pays the embed cost again. Closing tabs is a trigger too.

## Amplifier: mechanism refuted, effect real

The deep dive says that the dispatch "draws the viewport at the previous tab's scrollTop". The log contradicts it.
Radar's rAF2 at `49.965` shows visibleRanges starting at 0, and nothing scrolled before fruit fly's dispatch at
`50.092`, yet fruit fly's rAF1 shows `1657-4535`. The same happens for Laya (`50.700`: `858-3888`) right after
fruit fly was at the top (`50.529`). Every fresh tab lands scrolled down for some other reason. The CM scroll
anchor is not it: at scrollOffset 0 the anchor maps to pos 0 with diff 0 (`index.js:6349-6360,8296-8310`). The
cause is unknown. Saved tabs at top show no second wave (`51.606`: rAF1 already at `364-2248`, and the
docReplace-to-rAF1 gap is 24 ms, against 121 ms on the first open). So the second wave is real but limited to
fresh tabs, and fix 2's design rests on an unverified cause.

## Fixes

**Fix 1 (memo on tree identity): valid, quick win, safe.**
- Equivalence VERIFIED: `buildResolutionCache` is first-wins in the same order as pass 1, and
  `resolveWikilinkCached` makes the same basename fallback (`wikilink-resolution.logic.ts:41-67`).
- Identity invalidation VERIFIED. Every writer assigns a new root: `fs.service.ts:93`, `fs.watcher.ts:184`
  (`[...fileTree]` plus immutable `patchSubtree` `:88-114`), `path-change.service.ts:163` (immutable
  `removeNodeByPath` `fs.logic.ts:336-355`), `app-lifecycle.service.ts:367`, `reset()`. `attachFileCounts`
  (`fs.logic.ts:178-190`) writes only `fileCount`. A grep for in-place `children`/`path`/`name` writes found
  only `tags.logic.ts:75` (unrelated). A memo keyed on the identity of the thing it reads is never staler than
  reading it directly. Renames do not update the tree here today either.
- Not an invariant break: no `applyNoteChange`, `vaultIndexVersion` or queryjs policy involvement.
- Must also update the contract comment `core/markdown-editor/editor-host.ts:29-31`, which says `resolveLink`
  "scans the file tree... O(N)" (CLAUDE.md §8: update comments the change makes wrong).
- Minor: the module-level `lastTree` keeps the previous vault's 42,925-node proxy plus a 42k-entry Map alive
  after `teardownVault` until the next resolve. A `WeakMap<tree, cache>` avoids this.
- Do not build it as an ADR-0034 `$derived` over the proxy walk (INFERRED). Read outside an effect, an unowned
  derived re-checks every dependency on each read, about 170k sources here, which brings back O(N) per call.
  The plain identity check is the right shape.
- Same pattern, same gain: `listLinkCandidates` (`editor-host.ts:64`) flattens the proxy once per completion
  call. It can share the memoised flat list.
- **Test (c) as written would not fail first.** If counting is done in a `get` trap on a JS Proxy passed to
  `setFileTree`, the counts stay near the node count before the fix too: Svelte caches each property in
  `sources` after the first read (`proxy.js:179-200`) and does not call the target's `get` again. A `has` trap
  would count reads, because `prop in target` runs every time (`:180`). The more robust option is a node whose
  `path` is an accessor getter with a counter: an accessor has no `writable`, so Svelte never caches it
  (`:183`) and `Reflect.get` calls the getter on every read (`:203`). Tests (a) and (b) are sound regression tests.

**Fix 2 (draw the right viewport once): plausible, but its gain is unproven.** The premise about the
previous tab's scrollTop is refuted (above). Adding `scrollIntoView(0)` to the dispatch would make
`getViewport` honour it (`index.js:6505-6508`), but whatever scrolls fresh tabs down could still act after
the dispatch. After fix 1, the leftover wave is layout only. Find the scroll cause first. Keep it medium
effort and low priority.

**Fix 3 ($state.raw / shared flat list): valid as stated.** The risk is real: `attachFileCounts` mutates old
node objects in place, and with raw state, components keyed on those same objects would not see the
`fileCount` change. It is large and overlaps B and C.

**Fix 4 (exact path): valid, and broader than stated.** Resolution ignores extensions for **every** embed with
an extension, not only path-style ones: `![[foo.png]]` can resolve to `foo.md` if that comes first, because
`getNoteName` strips the extension (`:4-8,24-29`). An exact match needs a second map (vault-relative path to
absolute path), because `buildResolutionCache` keys on the extension-stripped name. This needs the owner's decision.

## Missed risks / triggers (INFERRED)

- Moving the cursor off an embed line rebuilds the widget. `revealPredicate` hides it while the line is touched,
  then a new widget with no DOM to reuse calls `toDOM`. Arrowing through Laya (28 embeds) costs about 46 ms
  per embed line left. That is a common editing trigger the deep dive does not list.
- Every external-content `replaceDoc` (`MarkdownEditor.svelte` content-sync effect, about `:342-366`: Properties
  edits, watcher reload) on an open embed note redraws its visible embeds.
- Tab closes that activate an embed note (see the cascade above).

## Not verified

- No WebKit profile. The per-embed cost in JSC is inferred from the log (30-65 ms). The bench is V8.
- Why fresh tabs land scrolled down. The 278/318 folder count was not re-run.
- Notes read: fruit fly, Radar, Laya and SAM (exact paths from the log), to check embed offsets and other widgets only.
