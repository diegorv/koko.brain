# Issue 13: ManifestPage paginado por contagem e não por bytes

Status: ready-for-agent
Source: Cripto e protocolo - REPORT.md

## What

`MANIFEST_PAGE_LEN = 200` (`protocol.rs:22-23`) com um comentário afirmando que isso limita
bytes. Não limita. Medido com rmp-serde 1.3.1: 200 entradas com rel_path de 234 bytes dão
65430 bytes (passa), com 235 bytes dão 65630 (estoura `MAX_PLAINTEXT_LEN` = 65519).

No estouro, `noise.rs:48-51` devolve erro, o `?` de `server.rs:142` sai do `serve_connection`,
`server.rs:76-79` só loga e o stream cai; o cliente pega UnexpectedEof e dá `break` no loop de
pastas, então as pastas seguintes somem do sync sem entrada em `skipped_folders`.

Pré-condição extrema: 200 arquivos consecutivos na ordenação, na mesma pasta, com path médio
acima de 234 bytes. Só plausível com CJK (~78 caracteres de path).

## How

Menor: baixar a constante e limitar o comprimento do path. Em
`src-tauri/src/sync/protocol.rs:23`:

```rust
	pub const MANIFEST_PAGE_LEN: usize = 100;
```

mais um teto de comprimento em `validate_rel_path` (`manifest.rs:14`). A versão correta é
paginar por bytes acumulados no `server.rs:139-143`, encerrando a página quando o encode
passar de `MAX_PLAINTEXT_LEN`.

Teste que falta: o maior vault de teste tem 4 arquivos com paths de ~16 bytes, então
`files.chunks(200)` sempre dá uma página e o caminho multi-página nunca roda.
