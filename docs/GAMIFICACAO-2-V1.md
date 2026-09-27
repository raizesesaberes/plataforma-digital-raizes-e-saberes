# Gamificacao 2.0 V1

## Estado

`GAMIFICACAO_2_V1=FROZEN`

A camada evolui o motor existente de `XP` e `medals/student_medals`, sem criar um segundo sistema de conquistas.

## Estrutura

- `student_gamification_profiles`: perfil de XP, nivel, moedas e avatar.
- `gamification_transactions`: ledger server-side de XP/moedas.
- `gamification_reward_rules`: regras idempotentes por evento canonico.
- `gamification_store_items`: catalogo digital sem dinheiro real.
- `student_gamification_inventory`: inventario do aluno.
- `gamification_paths` e `gamification_path_steps`: trilhas com Atividades, Biblioteca, Avalia+ e Recomposicao.
- `student_gamification_path_progress`: progresso por aluno/trilha/etapa.
- `gamification_settings`: opt-out institucional de ranking, loja, carteira e trilhas.
- `gamification_audit_events`: auditoria.

## Contratos

- `gamification_award_event(...)`: concede XP/moedas/medalhas com idempotencia.
- `student_get_gamification_profile(...)`: retorna perfil, extrato, medalhas, inventario e trilhas autorizadas.
- `student_purchase_store_item(...)`: compra transacional com saldo validado no banco.
- `student_update_avatar_config(...)`: atualiza avatar somente com itens adquiridos.
- `teacher_get_gamification_ranking(...)`: ranking por turma/escola respeitando opt-out.
- `teacher_create_gamification_path(...)`: cria trilha gamificada.
- `gamification_mark_path_step_complete(...)`: conclui etapa e concede recompensa idempotente.

## Seguranca

- Saldo e recompensa sao calculados server-side.
- Compra nao usa dinheiro real.
- Rankings podem ser desativados por escola.
- RLS protege aluno, turma e escola.
- `medals/student_medals` permanecem protegidas contra policy ampla.

## Mobilizacao

`AVATAR_ASSETS=MOBILIACAO`

Os assets definitivos de avatar, loja e temas serao cadastrados posteriormente, sem alterar a arquitetura.
