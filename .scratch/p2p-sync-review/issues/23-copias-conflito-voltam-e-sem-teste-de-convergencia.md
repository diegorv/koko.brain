# Issue 23: Cópias de conflito voltam pelo sync e não há teste de convergência A para B

Status: ready-for-agent
Severity: menor (test-gap mais documentação)
Source: COMPARISON.md (kimi Task 6 H3 + Task 8, confirmado e estreitado na refutação)

## What

Uma cópia de conflito é um arquivo comum dentro da pasta assinada
(`engine.rs:240-243`), com um nome que nenhuma camada do sync reconhece
(`decision.rs:43-61`). `build_manifest` (`manifest.rs:43-84`) só pula entradas com
ponto e symlinks, e `validate_rel_path` (`manifest.rs:14-27`) aceita o nome. No setup
de mão dupla que `docs/SYNC.md:26` descreve, o peer a puxa no sync seguinte via
`decision.rs:23-25` (sem arquivo local, logo Download).

Trace com `Notes/n.md` em `base` dos dois lados, A editando para `a1` e B para `b1`
no mesmo dia:

1. A sincroniza: `Conflict { write_copy: true }`, A grava
   `Notes/n (conflict from B 2026-08-19).md` com `b1`.
2. B sincroniza: o manifest de A lista os dois arquivos. Para `n.md`, B grava
   `Notes/n (conflict from A 2026-08-19).md`. Para a cópia de A, B não tem arquivo
   local, então baixa uma duplicata byte a byte do **próprio texto**, com um nome que
   diz "conflict from B".
3. A sincroniza de novo e baixa a cópia "conflict from A", com o próprio texto de A.

Estado final: os dois vaults com 3 arquivos onde havia 1, sendo duas cópias auto
nomeadas que são ruído puro e entram em busca, backlinks, tags e grafo nas duas
máquinas. Apagar uma só de um lado não resolve, porque o outro ainda a tem e
`decision.rs:23-25` a traz de volta.

Estreitamentos aceitos na refutação: isto **converge** (a partir do terceiro sync
tudo bate por hash e vira UpToDate, não há composição infinita nem cópia de cópia), o
custo é lixo mais poluição de índice e **não** perda de dados, e o `n.md` nunca
convergir é o desenho (`docs/SYNC.md:14`, `:20`), não sintoma. O que sobra de defeito
real é que `docs/SYNC.md` é silencioso sobre o round trip e que nada disso tem teste.

Nenhum teste do repositório chama `run_sync` com `pair.server_vault`: `setup()`
(`sync_e2e_test.rs:12-29`) constrói exatamente um `RunningServer` e um vault cliente,
então `run_sync` só roda numa direção e a cópia não tem como voltar. Toda a classe
"o que o peer vê depois que eu escrevi uma cópia de conflito" é inalcançável.

## How

Um teste e uma linha de doc. Em `src-tauri/tests/sync_e2e_test.rs`:

```rust
#[tokio::test]
async fn conflict_copies_travel_back_to_the_peer() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/n.md", "base");
	let vault = pair.client_vault.path().to_str().unwrap();
	let subs = vec!["Notes".to_string()];
	run_sync(vault, &pair.target, &subs).await.unwrap();
	write(&pair.server_vault, "Notes/n.md", "remote edit");
	write(&pair.client_vault, "Notes/n.md", "local edit");
	run_sync(vault, &pair.target, &subs).await.unwrap();
	let copies: Vec<_> = std::fs::read_dir(pair.client_vault.path().join("Notes"))
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
		.filter(|n| n.contains("conflict from"))
		.collect();
	assert_eq!(copies.len(), 1);
}
```

A versão completa sobe um segundo listener sobre o vault cliente e afirma o estado
final dos dois lados; o esqueleto acima é o menor passo que abre a direção que falta.

E, depois de `docs/SYNC.md:89`:

```markdown
A conflict copy is an ordinary file in the subscribed folder, so the peer pulls it
back on its next sync, including the copy of its own losing version. One copy per
divergence event ends up on BOTH machines, and because deletions are never
propagated, removing one means deleting it on both machines before either syncs again.
```

Por que os testes atuais não pegam: `both_changed_keeps_local_and_writes_one_conflict_copy`
(`sync_e2e_test.rs:86-117`) afirma `copies.len() == 1` e `copies2 == 1`, mas as duas
contagens saem de `pair.client_vault` (`:98`, `:112`) e o lado servidor nunca puxa.
`deletions_do_not_propagate_and_local_only_files_survive` (`:120-133`) cobre só a
direção do delete remoto.
