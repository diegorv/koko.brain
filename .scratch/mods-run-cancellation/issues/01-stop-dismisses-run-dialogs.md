# 01: Stop dismisses the dialogs a run opened

**What to build:** Pressing **Stop** on a mod run also dismisses any pick, prompt, confirm or alert that run is still waiting on, resolving it as cancelled (`null` / `false`). Today the run shows **Cancelled** but its dialog stays on screen and holds the shared dialog queue, so every other mod's dialogs wait behind it. If the user answers it, the mod's code goes on after Stop. Mods compensate by checking `run.signal.aborted` after every await; one missed check means writes after Stop.

This changes documented behaviour. The mods documentation says `ctx.ui` is shared by the mod, that the host does not guess the owning run, and that "Stopping a run does not close its mod's shared dialogs". Triage should decide whether dialogs opened inside an action belong to that run, how a dialog opened from outside any action (timer, listener) is treated, and whether `ctx.ui` needs a per-run form, such as `run.ui` or a `signal` option, instead of guessing.

**Blocked by:** none

**Status:** needs-triage

Source: review of the mods repository (`kokobrain-mods-src`, `.scratch/mods-review/report.md`, finding H2; ticket 19 there).

- [ ] Stop while an action's prompt is pending closes the prompt and resolves it as cancelled; the action's next step sees the cancelled answer.
- [ ] Dialogs of another run of the same mod, and dialogs opened outside any action, are unaffected.
- [ ] The dialog queue continues with the next mod's dialog right after Stop.
- [ ] Mod documentation and the contract in `@kokobrain/mod-core` describe the new guarantee; the "does not close its mod's shared dialogs" sentence is updated.
- [ ] The test fake in `@kokobrain/mod-core/testing` settles pending dialogs on `run.stop()`, so mod tests can rely on it (follow-up in the mods repository).

## Comments
