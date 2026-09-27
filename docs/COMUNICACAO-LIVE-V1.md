# Comunicacao Avancada + Aulas ao Vivo V1

## Estado

`COMUNICACAO_LIVE_V1=FROZEN`

O motor canonico `communications -> communication_deliveries` foi preservado e evoluido. Nao foi criado segundo motor de mensagens ou notificacoes.

## Comunicacao

- Novos publicos: `group`, `grade` e `staff`, mantendo `student`, `class` e `school`.
- Anexos privados em `communication_attachments`.
- Links, midias e metadados avancados no comunicado.
- Confirmacao de leitura continua em `communication_deliveries.read_at`.
- Denuncias/moderacao em `communication_moderation_reports`.
- Permissoes institucionais em `communication_permission_settings`.
- Aluno para aluno permanece bloqueado por padrao.

## Aulas Ao Vivo

- `live_sessions`: sessao, host, publico, horario, status e provider desacoplado.
- `live_session_participants`: participantes, presenca e estado de entrada.
- `live_session_events`: auditoria.
- `live_provider_settings`: status do provedor sem armazenar segredo.

## Provider

`LIVE_PROVIDER=EMPTY_REAL`

Nenhum provedor de videoconferencia foi contratado/configurado nesta fase. A arquitetura aceita integracao futura server-side.

## Seguranca

- Sem segredo de provider no frontend/schema exposto.
- Anexos privados/restritos.
- Join de aula exige participante autorizado.
- RLS e RPCs mantem escopo por escola/turma/aluno.
