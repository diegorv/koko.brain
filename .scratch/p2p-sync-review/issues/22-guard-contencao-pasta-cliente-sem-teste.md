# Issue 22: O guard de contenção de pasta no cliente não tem teste

Status: ready-for-agent
Severity: test-gap
Source: COMPARISON.md (kimi Task 2 / Task 8, confirmado e sobreviveu à refutação)

## What

`engine.rs:200-201` é o único ponto que exige que uma entrada de manifest esteja
dentro da pasta assinada:

```rust
	let inside = meta.rel_path.starts_with(&format!("{folder}/"));
	if validate_rel_path(&meta.rel_path).is_err() || !inside {
```

A metade `!inside` **não tem nenhum teste**. Um peer pareado hostil (a chave é
simétrica, então é um peer cuja chave vazou ou cuja máquina foi tomada) responde
`GetManifest{folder: "Notes"}` com `FileMeta { rel_path: "Private/secrets.md", .. }`,
um path relativo perfeitamente válido que passa em `validate_rel_path`.

Sem esse guard a consequência não é sujeira numa pasta não assinada, é pior: `local`
é montado só a partir da pasta assinada (`engine.rs:187-189`), então um path de fora
não tem entrada ali, `local_hash` é `None`, `decision.rs:23-25` devolve `Download`
**incondicionalmente**, e o `write_atomic` (`engine.rs:317-327`) renomeia bytes do
peer por cima de `<vault>/<qualquer rel_path válido>`. O peer sobrescreve qualquer
arquivo do vault que ele saiba nomear.

Deletar a condição `!inside` hoje deixa a suíte inteira verde. Mesma família do
achado 16: um guard cuja remoção não quebra nada.

## How

Uma entrada a mais no manifest falso e uma asserção, no teste que já existe. Em
`src-tauri/tests/sync_e2e_test.rs:224-232`, acrescentar à lista de `files`:

```rust
		FileMeta { rel_path: "Private/secrets.md".into(), size: 4, sha256: hash_bytes(b"evil") },
```

e nas asserções de `:256-272`:

```rust
	assert!(!pair.client_vault.path().join("Private/secrets.md").exists());
```

Por que o teste atual não pega: `malicious_manifest_path_is_rejected_and_session_survives`
(`sync_e2e_test.rs:199`) parece ser o teste de contenção e chega a afirmar em `:265`
que `evil.md` não existe no alvo do escape e em `:268-272` que `Notes/` só tem
`a.md`. As duas asserções são satisfeitas **só** pela metade `validate_rel_path`,
porque `"Notes/../evil.md"` começa com `"Notes/"` e portanto nunca alcança o ramo
`!inside`; o `..` reprova na regra de componente com ponto de `manifest.rs:21-25`.
`unshared_and_traversal_paths_are_refused` (`sync_server_test.rs:106`) é o espelho do
lado servidor e exercita `server.rs:161`, não `engine.rs:200`. Nenhum teste constrói
uma entrada de manifest fora da pasta pedida.
