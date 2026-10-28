# Issue 01: Decidir o transporte do P2P sync: manter Noise ou migrar para rsync sobre ssh

Status: needs-info

## What

A branch `p2p-sync` tem duas direções incompatíveis e nenhuma foi escolhida:

- **A. Manter o transporte atual** (Noise `XXpsk3` + listener próprio, `src-tauri/src/sync/`)
  e corrigir os achados de `.scratch/p2p-sync-review/` (17 issues, 4 destroem dado: 01, 02, 03, 04).
- **B. Seguir `.scratch/p2p-sync/plan-2026-08-25.md`**: `rsync` sobre `ssh`, staging fora do
  vault e merge decidido no disco no momento da escrita. Remove protocolo, framing, listener e a
  dependência `snow`. Os achados 01, 02 e 04 da review caem por construção e o achado de
  segurança abaixo deixa de existir, porque o app não sobe listener.

Requisito fixo (confirmado pelo usuário em 2026-10-28): o sync é **sempre LOCAL (LAN) e sem broadcasting**.
Por isso iroh foi descartado: preset padrão usa relays/DNS da n0, descoberta local é mDNS,
QUIC é reconhecível no fio, e `iroh-blobs` ainda é 0.x.

## Perguntas em aberto

1. **O anúncio `_ssh._tcp` no Bonjour é aceitável?** Ligar o Remote Login do macOS (pré-requisito
   do caminho B) faz a máquina anunciar ssh via mDNS. O app não anuncia nada, mas o SO sim.
   Se "sem broadcasting" for absoluto, B está fora e fica A.
2. **Se ficar A:** onde guardar `exposeEnabled` e `pairingKey`? Hoje ficam no `settings.json`
   do vault, então abrir um vault de terceiros sobe o listener sozinho e serve as pastas na LAN
   (achado do security review automático no push de 2026-10-28). Opções: config do app fora do
   vault, ou confirmação explícita na primeira vez por vault. Também rejeitar pasta exposta que
   seja symlink (`server.rs`: `canonicalize(vault_root.join(folder))` deve começar com
   `canonicalize(vault_root)`).

## Recomendação registrada

B, se a resposta da pergunta 1 for "aceitável". Menos código e o orçamento vai todo para a única
camada que escreve no vault.

## Comments
