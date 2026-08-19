# Issue 03: Segunda cópia de conflito no mesmo dia sobrescreve a primeira

Status: ready-for-agent
Source: Perda de dados / Traversal e vazamento / Integração com o app / Qualidade dos testes - REPORT.md

## What

`conflict_copy_rel_path` (`decision.rs:43-62`) deriva o nome só de (rel_path, peer, data), e
`today` é calculado uma vez por sessão (`engine.rs:117`). Se o peer editar o mesmo arquivo
duas vezes no mesmo dia, o segundo `Conflict { write_copy: true }` gera a **mesma** String e
o `write_atomic` renomeia por cima, sem `dest.exists()` e sem checar `local`.

A perda que importa: o usuário faz exatamente o que a cópia de conflito existe para permitir,
abre e mescla os parágrafos dele nela, e a mescla é substituída pela versão remota nova. O
resumo diz `conflicts: 1`, indistinguível de uma cópia nova. Recuperável pelo file-history
se o merge passou pelo editor e estiver dentro dos 7 dias de retenção.

`docs/SYNC.md:89` promete o dedup só "for the same remote hash", então isto é lacuna do
desenho e não violação do contrato escrito.

## How

Discriminar o nome pela versão remota, uma linha em `src-tauri/src/sync/engine.rs:242`:

```rust
	let copy_rel = conflict_copy_rel_path(&meta.rel_path, peer_name, &format!("{today} {}", &meta.sha256[..8]));
```

Teste que falta: segunda divergência com hash remoto **diferente** no mesmo dia, com
asserção sobre o conteúdo da cópia anterior (o teste atual asserta contagem, que uma
sobrescrita silenciosa mantém em 1).
