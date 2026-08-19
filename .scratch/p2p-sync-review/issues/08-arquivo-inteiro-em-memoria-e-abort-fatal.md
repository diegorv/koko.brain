# Issue 08: Arquivo grande consome memória sem limite e aborta o resto do sync

Status: ready-for-agent
Source: Concorrência, lifecycle e DoS - REPORT.md

## What

Não há limite de tamanho no servidor: `hash_file` (`manifest.rs:35-38`) já faz `std::fs::read`
do arquivo inteiro durante o **manifest**, e `server.rs:196` lê de novo para servir. O cliente
acumula tudo em um `Vec` (`engine.rs:292-299`).

Passando de `MAX_FILE_LEN` (1 GiB), `engine.rs:296` devolve `DownloadError::Fatal`,
`sync_folder` retorna false (`:221-224`) e `run_sync` dá `break` no loop de pastas
(`:123-127`): todo arquivo ordenado depois dele e toda pasta assinada seguinte nunca
sincronizam, de forma determinística (`manifest.rs:82` ordena), em toda tentativa futura. O
usuário só vê "Sync finished with 1 issue(s)".

Isso contradiz `docs/SYNC.md:120` ("sync continues with remaining files"). O crash por
falha de alocação não se sustenta em desktop 64 bits; o que se vê é pico de RSS.

## How

Não deixar um arquivo grande matar a sessão. Em `src-tauri/src/sync/engine.rs:199`, antes de
chamar `download_file`:

```rust
	if meta.size as usize > MAX_FILE_LEN {
		summary.errors.push(format!("{}: file too large, skipped", meta.rel_path));
		continue;
	}
```

Streaming direto para o arquivo temporário nos dois lados resolve o consumo de memória, mas é
reescrita, não correção mínima. Teste que falta: erro Fatal deixando pastas seguintes sem
sincronizar.
