# Issue 18: Manifest sem limite total de entradas derruba o cliente

Status: ready-for-agent
Severity: trava
Source: COMPARISON.md (kimi Task 5 H1, confirmado e sobreviveu à refutação)

## What

O laço de `ManifestPage` em `sync_folder` (`engine.rs:161-169`) faz
`remote_files.extend(files)` sem teto de entradas, e o `RECV_TIMEOUT` de 30 s é
aplicado a **cada** `recv` individual (`engine.rs:52-54`), então um peer que
continua mandando páginas com `done: false` nunca o dispara. As únicas saídas do
laço são `done: true`, `Msg::Error`, variante inesperada ou erro de transporte.

Medido com rmp-serde 1.3.1, o encoder de `protocol.rs:68`: uma entrada degenerada
`FileMeta { rel_path: "", size: 0, sha256: "" }` custa 25 bytes no fio, cabem 2619
por página de 65519 bytes, e `size_of::<FileMeta>()` é 56 bytes no cliente. Isso dá
2,24x de amplificação: ~7,1 GB de tráfego colocam ~16 GiB num único `Vec`, cerca de
65 s em gigabit. O app entra em swap e é morto pelo SO enquanto o botão diz
"Syncing...". `validate_rel_path` (`engine.rs:201`) só roda **depois** que o vetor
inteiro já foi montado, então entrada lixo custa memória cheia antes de ser rejeitada.

A variante degenerada é mais barata para o atacante: uma página **vazia**
(`files: []`, `done: false`) a cada 29 s não consome memória nenhuma e trava
`sync_now` para sempre, matando o botão pelo resto da vida do processo.

`MAX_FILE_LEN` (`engine.rs:23`, aplicado em `:296`) não cobre isto. `protocol.rs:93`
e `noise.rs:49-51` limitam um frame, não o agregado: não existe nenhum limite
agregado no cliente.

Achado 13 de A cobre **dimensionamento** de página, não crescimento total; achado 09
cobre o timeout ser curto demais para a primeira página, a falha oposta.

## How

Um contador e uma constante em `src-tauri/src/sync/engine.rs:161-169`. O `.max(1)`
faz página vazia consumir orçamento, o que também mata a variante do gotejamento:

```rust
	/// Teto de entradas de manifest por pasta; um peer bem comportado nunca chega perto.
	const MAX_MANIFEST_ENTRIES: usize = 200_000;

	let mut budget: usize = 0;
	loop {
		match recv(chan).await {
			Ok(Msg::ManifestPage { files, done }) => {
				budget += files.len().max(1);
				if budget > MAX_MANIFEST_ENTRIES {
					summary.errors.push(format!("{folder}: manifest too large"));
					return false;
				}
				remote_files.extend(files);
				if done {
					break;
				}
			}
```

Um deadline de parede para a fase inteira de manifest fecharia também o gotejamento
de 29 s, mas o contador é a mudança mínima que tampa o buraco de memória.

Teste que falta: `corrupted_transfer_writes_nothing` (`sync_e2e_test.rs:147`) e
`malicious_manifest_path_is_rejected_and_session_survives` (`:199`) montam peers
hostis à mão, mas os dois mandam exatamente uma página com `done: true`
(`:172-176` e `:227-236`), então o ramo multi-página nunca roda. Falta um peer falso
que mande `done: false` duas vezes e uma asserção de teto sobre `remote_files.len()`.
