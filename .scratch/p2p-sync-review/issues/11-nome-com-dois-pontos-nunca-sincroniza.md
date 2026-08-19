# Issue 11: Arquivo com `:` no nome é anunciado e depois recusado para sempre

Status: ready-for-human
Severity: correção
Source: Traversal e vazamento - REPORT.md

## What

`build_manifest` chama `validate_rel_path` só no argumento `folder` (`manifest.rs:44`); cada
entrada percorrida sai sem validação. No cliente, `engine.rs:201` roda `validate_rel_path`, que
falha em `rel.contains(':')` (`manifest.rs:18`), e `engine.rs:202` empurra
"rejected remote path: ...", a mesma String que uma traversal real produz. O arquivo nunca
sincroniza, para sempre, e cada run reporta um ataque que não existe;
`sync.service.ts:110-113` vira um warning recorrente que soterra um alerta legítimo.

O gatilho é trivial: o app não sanitiza nome de arquivo em lugar nenhum
(`fs.service.ts:210-220` interpola o nome digitado direto no path), então uma nota renomeada
para "Meeting: Q3 review" já basta. APFS aceita `:` via POSIX.

## How

Duas partes:

1. Mecânico: não anunciar o que nunca será aceito, em `src-tauri/src/sync/manifest.rs:79`:

```rust
	if validate_rel_path(&rel_path).is_err() {
		continue;
	}
	files.push(FileMeta { rel_path, size: meta.len(), sha256: hash_file(&path)? });
```

2. Decisão do dono: `:` deve mesmo ser proibido em vault que não é Windows? A regra existe por
   drive letter e ADS; num vault macOS ela silenciosamente exclui do sync um nome de arquivo
   legítimo. Se a resposta for "permitir", a mudança é em `validate_rel_path` e vale também
   distinguir a mensagem de erro de path recusado por forma da de path malicioso.
