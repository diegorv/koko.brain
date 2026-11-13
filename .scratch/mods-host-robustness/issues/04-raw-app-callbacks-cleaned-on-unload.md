# 04: Raw `ctx.app` callbacks cannot outlive their mod

**What to build:** Callbacks a mod hands to raw app members (store subscriptions, the 1:1 picker's `onSelect`, rail or command registry entries added without `ctx.register`) are dropped when the mod unloads, or the contract states plainly that the mod must register their cleanup. Today `unloadMod` runs only the mod's own disposers and closes its dialogs (`mod-app.service.ts`, `mods-host.service.ts`), so a stale callback can run after unload and toast "Mod is unloaded" from a mod that is off.

**Blocked by:** none

**Status:** needs-triage

No current mod subscribes to app stores or uses the 1:1 picker callback (mods Issue 26 removes `openOneOnOnePicker` from the mod-core types). Source: mods review finding H14.

- [ ] Either the host wraps callback-taking raw members so unload drops them, with a test that a callback given before unload never runs after it, or the `RawApp` docs state the cleanup rule next to each such member.
