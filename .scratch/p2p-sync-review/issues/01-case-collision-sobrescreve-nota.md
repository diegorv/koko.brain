# Issue 01: Colisão de caixa ou normalização sobrescreve a nota local

Status: ready-for-human
Severity: destrói dado
Source: Perda de dados / Traversal e vazamento / Qualidade dos testes - REPORT.md

## What

Em volume case-insensitive (APFS default do macOS, NTFS) uma nota local cujo nome difere
do remoto só por caixa ou por forma unicode é invisível para o `decide()`: o mapa `local`
é um `HashMap<String, String>` comparado byte a byte, enquanto o `rename` final é resolvido
pelo kernel. O arquivo é classificado como "não existe local", cai em `Action::Download` e
tem o conteúdo substituído pelo do peer, sem cópia de conflito, sem erro, com o resumo
dizendo `downloaded: 1, conflicts: 0`.

Repete para sempre: `peer_state` fica chaveado pela caixa remota enquanto `build_manifest`
continua devolvendo a caixa do disco, então toda sync futura re-baixa e re-destrói o que o
usuário escreveu desde então. Reproduzido nesta máquina (APFS): `mv -f tmp Notes/recipe.md`
sobre `Notes/Recipe.md` deixa um único `Recipe.md` com o conteúdo remoto.

Este é o achado que impede ligar a feature.

## How

Mitigação mecânica, em `src-tauri/src/sync/engine.rs:205`, antes do `decide`:

```rust
	let local_hash = local.get(&meta.rel_path).map(String::as_str);
	// O HashMap compara bytes; o FS pode ser case/normalization insensitive.
	if local_hash.is_none() && vault_root.join(&meta.rel_path).exists() {
		summary.errors.push(format!("name collision, skipped: {}", meta.rel_path));
		continue;
	}
```

Troca destruição silenciosa por erro visível. A correção completa (chavear `local` por nome
canônico, ou canonicalizar o `rel_path` remoto antes do lookup) é decisão do dono, porque
muda o comportamento em volume case-sensitive.

Teste que falta: dois vaults com `Notes/Recipe.md` e `Notes/recipe.md` de conteúdos
diferentes, asserção de que o arquivo local sobrevive.
