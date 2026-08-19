# Issue 04: Snapshot de hashes locais fica velho e engole escrita concorrente

Status: ready-for-human
Severity: destrói dado (probabilidade baixa)
Source: Perda de dados / Qualidade dos testes - REPORT.md

## What

`local` é montado uma vez por pasta (`engine.rs:187-197`), antes de qualquer round trip, e
cada download custa um `GetFile` completo. Uma escrita local que caia nessa janela é julgada
pelo hash congelado: com `synced == local_antigo` o `decide` devolve `Download` em vez de
`Conflict`, e o `write_atomic` sobrescreve sem cópia. O `write_atomic` nunca relê nem
rehasheia o destino.

Caso afiado: `toggle_task_status_inner` (`commands/vault.rs:662-682`) escreve direto no disco,
sem buffer de editor e sem snapshot de file-history. Marcar uma tarefa no painel Tasks durante
um sync apaga o toggle sem rastro no resumo. Escritas do editor em geral se curam sozinhas.

Janela real: segundos, e exige que o mesmo arquivo tenha mudado no remoto nessa sessão.

## How

Rehashear o destino antes de sobrescrever. Menor recorte: passar o hash do snapshot para
`download_file` (`src-tauri/src/sync/engine.rs:285`) e checar logo antes do `write_atomic`
(`engine.rs:305`):

```rust
	// dest_rel == src_rel: é sobrescrita, não cópia de conflito.
	if dest_rel == src_rel {
		if let Ok(now) = std::fs::read(vault_root.join(dest_rel)) {
			if Some(hash_bytes(&now).as_str()) != expected_local {
				return Err(DownloadError::Recoverable("local changed during sync".into()));
			}
		}
	}
```

Decisão do dono: erro Recoverable (arquivo pulado, usuário reexecuta) ou desviar para a rota
de cópia de conflito. Teste que falta: escrita no vault cliente com `run_sync` em voo.
