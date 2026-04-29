# Audit tests for PROVÁVEL findings

Adiciona testes de regressão para os 3 achados PROVÁVEL da auditoria de Rust em `src-tauri/`. Cada teste documenta a hipótese; #12 é determinístico, #11 e #9 são flaky por natureza (race condition sem fault-injection no código de produção) e ficam marcados `#[ignore]`.

Plano de auditoria completo: `~/.claude/plans/atue-como-um-auditor-witty-minsky.md`.

## Tasks

- [x] Task 1: Adicionar teste para finding #12 (chunks_exact silent truncation) em `src-tauri/tests/db_semantic_repo_test.rs`. DETERMINÍSTICO. Roda no CI sem `#[ignore]`.
- [x] Task 2: Adicionar teste para finding #11 (update_entry retroactive race) em `src-tauri/tests/vault_index_test.rs`. NÃO-DETERMINÍSTICO. Marcado `#[ignore]`.
- [x] Task 3: Adicionar teste para finding #9 (toggle_task FS race) em `src-tauri/tests/vault_task_test.rs`. NÃO-DETERMINÍSTICO. Marcado `#[ignore]`. **Confirmou o bug: 22/200 iterações perderam edição externa.**

## Notas

- Stack alterada: apenas Rust (`src-tauri/`). Comando de teste: `cargo test --manifest-path src-tauri/Cargo.toml`.
- Conforme CLAUDE.md: 1 commit por task, formato detalhado (Context/Problem/Solution/Behavior/Files), commit imediato após cada task passar.
- Os testes não corrigem nenhum bug — apenas documentam a hipótese e servem de regressão futura quando os fixes forem feitos.
- Findings CONFIRMADO da auditoria (#1, #2, #3, #4, #5, #6, #7) NÃO são endereçados aqui — esse é trabalho de fix, não de teste.
