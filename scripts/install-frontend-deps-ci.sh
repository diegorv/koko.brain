#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MODS_REPO_READ_TOKEN:-}" ]]; then
	echo '::error::Set MODS_REPO_READ_TOKEN to a read-only credential for diegorv/koko.brain-mods.' >&2
	exit 1
fi

# Process-local Git configuration keeps the private dependency credential out of
# URLs, disk and the host checkout's authentication used by release steps.
export GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=4
export GIT_CONFIG_KEY_0='credential.https://github.com/diegorv/koko.brain-mods.git.helper'
export GIT_CONFIG_VALUE_0=''
export GIT_CONFIG_KEY_1='credential.https://github.com/diegorv/koko.brain-mods.git.helper'
export GIT_CONFIG_VALUE_1="!f() { if [ \"\$1\" = get ]; then printf 'username=x-access-token\\npassword=%s\\n' \"\$MODS_REPO_READ_TOKEN\"; fi; }; f"
export GIT_CONFIG_KEY_2='credential.https://github.com/diegorv/koko.brain-mods.git.useHttpPath'
export GIT_CONFIG_VALUE_2=true
# The checkout action's repository token cannot authenticate this dependency.
export GIT_CONFIG_KEY_3='http.https://github.com/diegorv/koko.brain-mods.git.extraheader'
export GIT_CONFIG_VALUE_3=''

exec pnpm install --frozen-lockfile
