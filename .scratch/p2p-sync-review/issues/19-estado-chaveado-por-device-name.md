# Issue 19: Estado de sync chaveado pelo device name que o peer controla

Status: ready-for-agent
Severity: correção
Source: COMPARISON.md (kimi Task 5 H5 b+c, confirmado e sobreviveu à refutação)

## What

`engine.rs:107` faz `state_map.entry(peer_name.clone()).or_default()`, e `peer_name`
é o valor que chega no `HelloAck` do peer (`server.rs:107-110`, `engine.rs:72-78`).
Renomear a máquina do peer, que é manutenção trivial num campo de texto livre
(`SyncSection.svelte:123-131`), zera a baseline inteira: o balde novo vem vazio, as
entradas antigas nunca mais são lidas e nunca são apagadas.

Para todo arquivo que divergiu, `local != remote` com `state = None`, então
`decision.rs:22-37` cai em `Conflict { write_copy: true }`, o caso que
`decision.rs:113-115` afirma. Numa pasta com 40 notas remotamente editadas: 40 cópias
de conflito, as 40 notas locais continuam **desatualizadas**, e o resumo
`downloaded: 0, conflicts: 40` sai como toast **verde** de sucesso
(`sync.service.ts:110-118`), porque `errors` e `skippedFolders` estão vazios.

Não se cura sozinho: `synced` só é gravado nos braços Download e UpToDate
(`engine.rs:209`, `:227`), e um arquivo cujo local difere do remoto nunca alcança
nenhum dos dois. Cada nova edição do peer produz mais uma cópia, até o usuário tornar
o local byte a byte idêntico ao remoto na mão. Arquivos idênticos nos dois lados no
momento do rename se recuperam sozinhos pelo braço UpToDate (`engine.rs:226-233`), o
que limita o estrago aos que divergiram. Custo secundário: cada rename duplica o
estado inteiro num balde que nada poda.

Segundo sintoma, mesma raiz e mesma correção: o nome do peer entra no **nome do
arquivo** da cópia (`decision.rs:43-62`) e `today` é recalculado por sessão
(`engine.rs:117`), então um rename produz uma segunda cópia com nome diferente para o
**mesmo** hash remoto. Verificado rodando a função:
`Notes/plan (conflict from kokobrain 2026-08-19).md` e depois
`Notes/plan (conflict from Studio 2026-08-20).md`, byte a byte iguais.

A listou isto em "Não coberto" como gap nunca avaliado; este issue é a avaliação.

## How

Chavear pela identidade de pareamento, que o usuário controla, em vez do nome que o
peer reporta. `hash_bytes` já está importado em `engine.rs:15` e `peer_name` continua
servindo para o nome da cópia (`engine.rs:242`) e para o log (`engine.rs:134`). Em
`src-tauri/src/sync/engine.rs:104-107`:

```rust
	let (mut chan, peer_name) = connect(target).await?;
	let mut summary = SyncSummary::default();
	let mut state_map = load_state(vault_path);
	// A chave do balde tem que ser identidade estável, não uma String que o peer
	// muda: renomear o peer apagaria a baseline de todos os arquivos.
	let peer_key = hash_bytes(target.pairing_key.as_bytes());
	let peer_state = state_map.entry(peer_key).or_default();
```

Teste que falta: `setup()` (`sync_e2e_test.rs:12-29`) fixa `device_name: "Studio"` na
linha 18 e todo teste multi-sessão reusa o mesmo `Pair`, então `peer_name` é constante
e o balde sempre acerta. Falta rodar um `run_sync`, parar o servidor, subir de novo
com `device_name: "Renamed"` no mesmo vault e psk, editar só um arquivo remoto e
afirmar `(downloaded, conflicts) == (1, 0)`.
