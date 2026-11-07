# 04: Separate verbose renderer diagnostics from ordinary file logs

**What to build:** When explicitly approved for implementation, let a user collect ordinary frontend diagnostics, including mod events, without the verbose Live Preview, tab-switch and QueryJS trace families. Preserve those diagnostics for deliberate renderer investigations rather than deleting them.

**Blocked by:** None technically; independent of Issues 01-03.

**Status:** needs-triage

**Execution hold:** The owner approved recording this ticket but has not decided to change renderer logging now. Do not implement or promote it to ready-for-agent without an explicit owner decision. It does not block any other ticket in this feature.

## Proposed policy to confirm before implementation

The minimal proposal is to reuse the existing persisted livePreviewProfiling control, describe it as renderer diagnostics, and extend its file-output coverage to TAB_SWITCH and QJS-PROFILE. Keep LP timing thresholds and paired enter/exit behavior intact. This intentionally broadens the setting's meaning; it is not an already-existing requirement.

The alternative is a separate trace toggle while retaining the current profiling setting for measurements. If the owner chooses that alternative, specify its interaction with LP-TRACE, LP-PROFILE, TAB_SWITCH and QJS-PROFILE before marking the ticket ready. Do not leave that policy choice to an implementation agent.

## Acceptance criteria after approval

- [ ] Confirm and record the control policy above, then update the ticket status before implementation. No new category/profile framework or general logger rewrite is needed.
- [ ] Write failing tests using real settings, producer paths and the existing buffered writer, mocking external boundaries. With frontend file logging on and renderer diagnostics off, actual mod diagnostics reach the flushed file while LP-TRACE, LP-PROFILE, TAB_SWITCH and QJS-PROFILE do not, under the proposed reused-control policy.
- [ ] Enabling renderer diagnostics restores the existing trace content, paired enter/exit events and timing-threshold behavior. Disabling it takes effect without editor reconfiguration. If a separate toggle is chosen instead, rewrite this matrix explicitly to preserve the approved measurement semantics.
- [ ] Gate direct QueryJS profiling producers as well as tab-switch output. Filtering only ordinary debug calls is insufficient because some producers use the raw writer directly. Do not globally filter every raw log write.
- [ ] Preserve ordinary editor error reporting and non-profiling error logs, including paths deliberately enabled while profiling is off. Preserve Sentry routing, local writer batching/flush behavior and independent frontend/Tauri session controls.
- [ ] Keep existing console-only tab debugging available when console debug is enabled. Diagnostic layout reads and temporary scroll listeners run only when a relevant destination is enabled; quiet file logging alone must not incur those reads/listeners.
- [ ] Preserve historical TAB_SWITCH instrumentation and all scroll-restoration, exact-step and no-note-text assertions. Intentionally update existing emission-test setup to enable the approved renderer gate, and add the negative case. Do not delete assertions or remove trace steps to make the new tests pass.
- [ ] Cover frontend-only logging, console-only debugging, a Tauri-only file session, both file switches off, independent heartbeat behavior and the persisted renderer setting. A profiling control alone must not silently open a file session or enable heartbeat.
- [ ] Update Troubleshooting labels/help and user documentation to explain the approved policy. This is a lower-noise mode, not a mods-only log and not a guarantee that remaining logs contain no sensitive data.
- [ ] Verify rendered editor behavior is unchanged, including switching between saved and fresh tabs and rendering QueryJS blocks. Test diagnostic output separately from scroll correctness.

## Scope and constraints

This is the only ticket in this feature whose main implementation spans renderer code: the Markdown editor, Live Preview profiling, QueryJS profiling producers and Settings. Read the Live Preview correctness/performance rules before changing these paths.

Do not change actual decoration, scrolling, QueryJS execution or caching behavior. No Rust, IPC, dependency, watcher or indexing changes are planned. Do not remove diagnostics previously retained for scroll regression investigations.

The reported log-volume percentages were not revalidated. Source inspection established overlapping logging gates, not a measured performance improvement. Do not set a claimed percentage reduction or performance gain as a known outcome.

## Verification

After approval and implementation: `pnpm check` and `pnpm vitest run`, plus affected Settings, editor/Live Preview and mods E2E coverage through the repository's E2E wrapper. Native verification should compare ordinary logging with renderer diagnostics off/on; no native or performance result has been measured for this ticket yet.
