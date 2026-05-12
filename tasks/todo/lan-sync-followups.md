# LAN Sync — Follow-ups documentados (futuras iterações)

Itens conscientemente fora do escopo do MVP, decididos durante o planejamento de LAN Sync P2P.

## Tasks

- [ ] Não sobrescrever buffer aberto no editor: se editorStore tem o path como tab com mudanças não salvas, inbound update vira conflict file mesmo se LWW diz que remoto ganha
- [ ] Limites de tamanho (DoS guard): max_file_size (default 100 MB) e max_share_size_total por share; rejeitar mensagens acima do limite
- [ ] Per-share pause toggle: pausar sync de uma share específica sem deletar configuração
- [ ] Bandwidth throttle: rate-limit configurável (KB/s) para não saturar a LAN
- [ ] Audit log retention configurável: hoje retention de auth_events é fixa em 30d; permitir usuário ajustar
- [ ] Backup/recovery da identidade Ed25519: similar ao recovery key de encrypted-notes; permitir restaurar identidade em outra máquina
- [ ] Schema migration framework para state.sqlite: padronizar migrations em vez de código manual
- [ ] Stats de bytes sent/received por share por peer no UI
- [ ] 3+ peers numa share: já permitido pelo modelo, mas precisa testar conflito a 3 mãos
- [ ] Recovery automático de state.sqlite corrompido: detectar corrupção + recriar do zero forçando full resync

## Notes

Estes itens são importantes mas não bloqueiam o MVP. Após a entrega do MVP (tasks/todo/lan-sync.md), priorizar conforme uso real do feature.
