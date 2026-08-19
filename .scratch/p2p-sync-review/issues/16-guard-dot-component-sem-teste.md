# Issue 16: O guard de componente dot no serve path não tem teste

Status: ready-for-agent
Source: Qualidade dos testes - REPORT.md

## What

`unshared_and_traversal_paths_are_refused` (`sync_server_test.rs:105-121`) tem quatro sondas, e
todas são recusadas por outros guards: `GetManifest{"Secret"}` por `server.rs:129`,
`GetFile{"secret.md"}` e `GetFile{"/etc/passwd"}` por `server.rs:161`, e
`GetFile{"Notes/../secret.md"}` pelo canonicalize de `server.rs:193`. Deletar
`server.rs:174-176` deixa a suíte inteira verde.

Sem esse guard, um peer pareado que peça `GetFile{"Projects/repo/.git/config"}` casa a pasta
exposta, canonicaliza dentro do `folder_root` e recebe os bytes. Raio limitado: a raiz do
vault nunca pode ser exposta, então `.kokobrain` e `.obsidian` não são alcançáveis, só dot
entries dentro de uma subpasta exposta, pedidos por quem já tem a pairing key.

O skip de arquivo oculto que **é** testado (`manifest.rs:113-127`) prova só que eles não são
anunciados; `GetFile` é caminho independente.

## How

Um teste, não mudança de produção. Em `src-tauri/tests/sync_server_test.rs:14-33`, criar
`Notes/.env` no `spawn_test_server` e afirmar que `GetFile{"Notes/.env"}` devolve
`Msg::Error`. O gêmeo do lado cliente (`engine.rs:201`) tem o mesmo buraco: o e2e só manda
"Notes/../evil.md", nunca um path com componente dot.
