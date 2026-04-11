# Bump Tauri plugins (2.x patch/minor)

Atualizar plugins do Tauri dentro da linha 2.x. Core (`tauri 2.10.3`, `tauri-build 2.5.6`, `@tauri-apps/api 2.10.1`, `@tauri-apps/cli 2.10.1`) já está na última estável — nada a fazer lá. Plano completo em `~/.claude/plans/flickering-scribbling-ripple.md`.

Bumps:
- tauri-plugin-fs 2.4.5 → 2.5.0 (minor)
- tauri-plugin-dialog 2.6.0 → 2.7.0 (minor)
- tauri-plugin-http 2.5.7 → 2.5.8 (patch)
- tauri-plugin-updater 2.10.0 → 2.10.1 (patch)
- tauri-plugin-deep-link 2.4.7 → 2.4.8 (patch)

Sem breaking changes documentadas. Ranges de `Cargo.toml`/`package.json` já cobrem os bumps — apenas lockfiles mudam.

## Tasks

- [x] Task 1: Rodar `cargo update -p` restrito aos plugins e `pnpm update` dos `@tauri-apps/plugin-*`; rodar `cargo test`, `pnpm check`, `pnpm vitest run`; commit único `chore(deps)`.

## Notes

- Um único commit conforme recomendação do plano.
- Validação manual de updater/watcher fica para antes do release, não bloqueia o commit.
- Capabilities de `dialog` (`allow-ask`/`allow-confirm`) agora são alias de `allow-message` — checar se o schema ainda valida.
