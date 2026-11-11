# 01: Live check of the Todoist API behaviors the sync relies on

**What to build:** The two-way sync (`.scratch/todoist-bisync/research/design.md`) depends on API behaviors the v1 docs do not state. The owner runs the runbook below with their own token against a throwaway project and records the answers in `.scratch/todoist-bisync/research/live-check.md` (a file that outlives this ticket), so tickets 07 to 10 build on facts. Nothing in the app changes.

**Blocked by:** none

**Status:** resolved

- [x] `research/live-check.md` records, per runbook step, the relevant JSON and a one-line answer.
- [x] Incremental sync after complete / delete / edit / close-recurring (step 5): for each item, whether it arrives and with which `checked`, `is_deleted`, `completed_at`, `due`.
- [x] Reopen (step 6): what incremental sync shows.
- [x] Full sync after completion (step 5b): T1 absent or present.
- [x] Recurring due update (step 7): `is_recurring` after a date-only update, and after `{date, string, lang}` with the original string.
- [x] Unknown label on add (step 2): created or not.
- [x] Replay of one `item_add` (step 8): second task created or not; `temp_id_mapping` present on the replay or not.
- [x] Where an answer contradicts `design.md`, `design.md` and the affected tickets (07-10) are edited in the same commit, listed in its message.

## Runbook

Set the token, define the helpers, then run the steps in order in one shell. Ids are captured into variables automatically. Bodies are form-encoded (`--data-urlencode`), as the v1 docs require for `/sync`.

```sh
T='<token from the vault .kokobrain/settings.json, todoist.apiToken>'
A=https://api.todoist.com/api/v1/sync
s() { curl -s "$A" -H "Authorization: Bearer $T" "$@"; }
tok() { python3 -c 'import json,sys; print(json.load(sys.stdin)["sync_token"])'; }
show() { python3 -c 'import json,sys
d=json.load(sys.stdin); ids=sys.argv[1:]
for i in d.get("items",[]):
    if not ids or i["id"] in ids:
        print(json.dumps({k:i.get(k) for k in ("id","content","checked","is_deleted","completed_at","due","labels")}))
print("sync_token:", d.get("sync_token"), "| sync_status:", d.get("sync_status"), "| temp_id_mapping:", d.get("temp_id_mapping"))' "$@"; }

# 1. Baseline token.
TOKEN0=$(s --data-urlencode sync_token='*' --data-urlencode resource_types='["items"]' | tok)

# 2. Test project + four tasks (T3 uses a new label, T4 is recurring). Captures P1 T1 T2 T3 T4.
eval "$(s --data-urlencode commands="[
 {\"type\":\"project_add\",\"temp_id\":\"p1\",\"uuid\":\"$(uuidgen)\",\"args\":{\"name\":\"kokobrain-sync-test\"}},
 {\"type\":\"item_add\",\"temp_id\":\"t1\",\"uuid\":\"$(uuidgen)\",\"args\":{\"content\":\"to complete\",\"project_id\":\"p1\"}},
 {\"type\":\"item_add\",\"temp_id\":\"t2\",\"uuid\":\"$(uuidgen)\",\"args\":{\"content\":\"to delete\",\"project_id\":\"p1\"}},
 {\"type\":\"item_add\",\"temp_id\":\"t3\",\"uuid\":\"$(uuidgen)\",\"args\":{\"content\":\"to edit\",\"project_id\":\"p1\",\"labels\":[\"kb-new-label-test\"]}},
 {\"type\":\"item_add\",\"temp_id\":\"t4\",\"uuid\":\"$(uuidgen)\",\"args\":{\"content\":\"weekly test\",\"project_id\":\"p1\",\"due\":{\"string\":\"every week starting 16 Nov 2026\"}}}
]" | python3 -c 'import json,sys; m=json.load(sys.stdin)["temp_id_mapping"]; print(" ".join(f"{k.upper()}={v}" for k,v in m.items()))')"
echo "P1=$P1 T1=$T1 T2=$T2 T3=$T3 T4=$T4"   # all five must be set
# Check in the Todoist UI whether the label kb-new-label-test now exists.

# 3. Token after creation.
TOKEN1=$(s --data-urlencode sync_token="$TOKEN0" --data-urlencode resource_types='["items"]' | tok)

# 4. Complete T1, delete T2, edit T3, close the recurring T4.
s --data-urlencode commands="[
 {\"type\":\"item_close\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T1\"}},
 {\"type\":\"item_delete\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T2\"}},
 {\"type\":\"item_update\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T3\",\"content\":\"edited\"}},
 {\"type\":\"item_close\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T4\"}}
]" | show

# 5. Incremental: what arrives for T1..T4?
s --data-urlencode sync_token="$TOKEN1" --data-urlencode resource_types='["items"]' | show "$T1" "$T2" "$T3" "$T4"
# Keep the printed sync_token:
TOKEN2='<sync_token printed above>'
# 5b. Full sync: is the completed T1 listed?
s --data-urlencode sync_token='*' --data-urlencode resource_types='["items"]' | show "$T1"

# 6. Reopen T1, then incremental.
s --data-urlencode commands="[{\"type\":\"item_uncomplete\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T1\"}}]" | show
s --data-urlencode sync_token="$TOKEN2" --data-urlencode resource_types='["items"]' | show "$T1"

# 7. Recurring due update: date only, read back; then date + the original string, read back.
s --data-urlencode commands="[{\"type\":\"item_update\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T4\",\"due\":{\"date\":\"2026-11-30\"}}}]" | show
s --data-urlencode sync_token='*' --data-urlencode resource_types='["items"]' | show "$T4"
s --data-urlencode commands="[{\"type\":\"item_update\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$T4\",\"due\":{\"date\":\"2026-11-30\",\"string\":\"every week starting 16 Nov 2026\",\"lang\":\"en\"}}}]" | show
s --data-urlencode sync_token='*' --data-urlencode resource_types='["items"]' | show "$T4"

# 8. Replay one item_add with a fixed uuid and temp_id.
U=$(uuidgen)
C="[{\"type\":\"item_add\",\"temp_id\":\"r1\",\"uuid\":\"$U\",\"args\":{\"content\":\"replay\",\"project_id\":\"$P1\"}}]"
s --data-urlencode commands="$C" | show
s --data-urlencode commands="$C" | show
s --data-urlencode sync_token='*' --data-urlencode resource_types='["items"]' | python3 -c 'import json,sys; print(sum(1 for i in json.load(sys.stdin)["items"] if i["content"]=="replay"), "replay task(s)")'

# 9. Clean up.
s --data-urlencode commands="[{\"type\":\"project_delete\",\"uuid\":\"$(uuidgen)\",\"args\":{\"id\":\"$P1\"}}]" | show
# Delete the kb-new-label-test label in the Todoist UI if it was created.
```

## Notes

- The installed SDK is `@doist/todoist-sdk` 16.x; its typed command map has no `item_close`, so the runbook (and the engine) use raw JSON commands.
- Creates and deletes test data only in the throwaway project.
