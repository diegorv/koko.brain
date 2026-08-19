# Issue 09: Timeout de 30 s medido contra hashing síncrono da pasta inteira

Status: ready-for-human
Severity: correção (borda)
Source: Concorrência, lifecycle e DoS - REPORT.md

## What

`server.rs:133` roda `build_manifest` inteiro antes de mandar a primeira página, lendo e
SHA-256 cada arquivo sequencialmente (`manifest.rs:35-38`), enquanto o cliente espera em
`engine.rs:163` com `RECV_TIMEOUT` de 30 s. Estourando, o erro vira Fatal, `run_sync` dá
`break` e a sessão acaba com `downloaded = 0`, idêntica em toda retentativa: sem progresso
parcial e sem granularidade por arquivo.

O espelho também morde: no caminho de volta o cliente hasheia a cópia dele
(`engine.rs:187-197`) enquanto o servidor espera em `server.rs:117`, que devolve `Ok(())` e
derruba o socket depois de 30 s ociosos.

Gatilhos reais: vault em mount de rede ou NAS, disco externo mecânico, ou dezenas de GB numa
pasta exposta. SHA-256 local roda a ~2,2 GB/s, então vault em SSD local não chega perto.

Secundário: `build_manifest` roda no worker tokio sem `spawn_blocking`, bloqueando uma thread
do runtime por toda a duração.

## How

Duas partes, a segunda é decisão de política:

1. Mecânico, `src-tauri/src/sync/server.rs:133`:

```rust
	let files = tokio::task::spawn_blocking(move || build_manifest(&root, &folder)).await;
```

2. Deadline. Ou um `RECV_TIMEOUT` maior/dedicado para a espera do primeiro `ManifestPage`
   (`engine.rs:163`) e para o recv do servidor (`server.rs:117`), ou uma mensagem de progresso
   que reinicie o relógio. O dono escolhe.
