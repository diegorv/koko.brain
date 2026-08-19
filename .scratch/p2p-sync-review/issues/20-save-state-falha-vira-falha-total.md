# Issue 20: Falha de save_state vira falha total do sync depois do vault já estar gravado

Status: ready-for-agent
Severity: correção
Source: COMPARISON.md (kimi Task 5 H6, confirmado e sobreviveu à refutação)

## What

`engine.rs:130` é `save_state(vault_path, &state_map)?`, o único `?` depois das
escritas. Todo arquivo baixado já foi renomeado para o lugar por `write_atomic`
(`engine.rs:305` -> `:317-327`) e teve `synced = seen_remote` gravado em memória
(`engine.rs:209-215`) antes disso. Se o `save_state` falhar (disco cheio,
`.kokobrain/` sem permissão, volume externo desmontado), `run_sync` devolve `Err`,
`sync.service.ts:100` rejeita, as linhas 107 e 108 nunca rodam e o `catch` toasta
`Sync failed`. O usuário vê falha vermelha e o painel mostrando a sessão anterior,
enquanto dezenas de arquivos foram de fato gravados.

O efeito durável vem no sync seguinte. `load_state` não tem entrada para o path,
então `decide(local = r1, remote = r2, state = None)` desce toda a `decision.rs` até
`Conflict { write_copy: true }`. O engine mantém o r1 obsoleto em disco, escreve uma
cópia de conflito e grava **só** `seen_remote` (`engine.rs:249`): `synced` fica `None`
para sempre. O arquivo fica preso em r1 e toda revisão remota futura vira mais uma
cópia de conflito, para um arquivo que o usuário nunca editou.

Limite honesto: se o remoto não mudar antes do sync seguinte, `local == remote` e
`decision.rs:27-28` devolve UpToDate, então o caso comum se cura em silêncio. O
defeito só morde arquivos que o peer voltar a tocar.

## How

Parar de tratar falha de bookkeeping como falha de sessão: os arquivos estão mesmo em
disco, então o certo é reportar como issue e devolver o resumo verdadeiro. Substituir
`src-tauri/src/sync/engine.rs:130` por:

```rust
	if let Err(e) = save_state(vault_path, &state_map) {
		summary.errors.push(format!("sync state not saved: {e}"));
	}
```

O usuário passa a ver `Sync finished with 1 issue(s)` com as contagens reais
(`sync.service.ts:110-113`) em vez de um `Sync failed` seco, e pode tentar de novo
antes do peer mexer no arquivo. Fazer o próprio estado sobreviver à falha (temp mais
rename como o `write_atomic`, ou saves incrementais por pasta) é mudança de desenho,
não correção mínima.

Teste que falta: `fresh_pull_downloads_everything_and_second_pull_skips`
(`sync_e2e_test.rs:49`) roda em tempdir gravável, então o `?` nunca é tomado, e os
testes de `state.rs` cobrem load ausente, round-trip e load corrompido, nunca um save
que falha. Pior, `syncNow clears syncing and rethrows on failure`
(`sync.service.test.ts:128-133`) **codifica a leitura errada**: afirma que
`lastSummary` continua null, isto é, que um `Err` de `sync_now` significa que nada
aconteceu, e continuaria passando exatamente para a falha pós-escrita.
