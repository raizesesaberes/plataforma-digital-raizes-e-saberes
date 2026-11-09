# Contratos atuais do backend: inspeção somente leitura

Registrado em 2026-11-09T16:40:15Z. As consultas ocorreram nesta sessão antes desse horário, sem snapshot transacional único. Projeto: `jaesjldrbjbdmzzggxzw` (produção). Nenhuma chamada RPC operacional, alteração remota, leitura de alunos, credenciais ou sessões.

## Evidência e reprodução

O arquivo JSON ao lado conserva metadata de 62 funções, 23 relações e schemas, assinaturas, hashes, privilégios, diferenças e consultas SQL reproduzíveis. As fontes locais da comparação são:
- `platform/supabase/review/package_metadata_readonly.sql`
- `platform/supabase/review/package_versions_readonly.sql`
- `platform/qa/fase3/manifests/04_after_pr1.json`

Esses scripts de inspeção foram lidos; as consultas enviadas eram exclusivamente SELECTs de catálogo/ledger. Não executar migrations ou RPCs mutantes para reproduzir esta inspeção.

## Pacote instalado, baseline antigo

As quatro versões 20261011060001/2/3/4 constam com nomes esperados. Ledger atual: **184 entradas**, das quais 180 fora desse pacote; última versão **20261109160557**. Hash do ledger sem as quatro versões: `f2c8636b5d35ad82f8213881e989ea9a`.

A expectativa histórica 149+4 está desatualizada. Isso não indica erro por si só: há migrations posteriores, incluindo escopo de mensagens, montagem institucional, integridade do diário e Missão. Não aplicar automaticamente o ledger antigo sobre produção nem usá-lo isoladamente para montar homologação.

Os corpos dos RPCs principais de envio/leitura de respostas, edição/leitura de revisões, identificação do aluno e teacher_create_assessment_assignment coincidem com o manifesto esperado. EXECUTE para anon=false e authenticated=true nesses RPCs. Dependências e algumas relações mudaram. A existência das versões não atesta, sozinha, todos os fluxos nem libera automaticamente flags de escrita.

### Diferenças encontradas

- functions: public.content_validate_entitlement(). Campos diferentes: acl.
- functions: public.institutional_touch_updated_at(). Campos diferentes: acl.
- functions: contract_operations_private.validate(p_config jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado 2359da9524bbe24358fb60f0acbd8ff8; observado 89265710aaee11a8295fe78cc592be4a.
- functions: public.has_question_bank_role(required_roles text[]). Campos diferentes: acl.
- functions: school_category_private.active_rules(p_context jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado 2d32f1f937196cac7184e5d498021e02; observado 37f799295155539cd966e60b6e1fc93a.
- functions: public.avalia_plus_fill_assessment_question_snapshot(). Campos diferentes: acl.
- functions: public.admin_preview_contract_operation(p_config jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado 8fd3fc7f840531785b12e56851b99ef2; observado c871ee00162801841bb742b167453e90.
- functions: school_category_private.legacy_resolver(p_context jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado bf45a14cbcb7ed66b08049c1ef7a5e0b; observado 22ffa2f36c5192ac7574c9f9f3131ea3.
- functions: public.communication_can_read(p_communication communications). Campos diferentes: body_md5, definition_md5. Corpo esperado 2657d0547e189192eb36044f5cfcf88c; observado 23f6416b2c49324a43610606d371bf8f.
- functions: school_category_private.communication_edit_allowed(p_id uuid). Campos diferentes: body_md5, definition_md5. Corpo esperado ecc5e64343a71238b6b62889c0baf34c; observado 956f228955ba3c1e85cf0233f8a96a0a.
- functions: public.avalia_plus_create_assessment_from_bank(p_payload jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado dd108be00647e4e653a4c1b7dda5f24e; observado a660dcbcea888cd517d6adfaef0c0e9e.
- functions: public.communication_list_reply_threads(p_communication_id uuid). Campos diferentes: body_md5, definition_md5. Corpo esperado 2a9e394bbffc7cabf2dac69c29cd5daf; observado 43867bf0faa0d1deab32bb1ab0e352e6.
- functions: public.content_resolve_question_details_for_user(p_context jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado fe26d0f36ab83603ed090c6f6b9983af; observado e86da4aa055552d6e01ab7e166214b1e.
- functions: school_category_private.authorized_items(p_context jsonb, p_item uuid). Campos diferentes: body_md5, definition_md5. Corpo esperado 849f5ffcee863c786252c3a75ae2a15d; observado 140a048bf446b793c26a47af7ca7bf0b.
- functions: school_category_private.communication_reply_allowed(p_delivery_id uuid). Campos diferentes: body_md5, definition_md5. Corpo esperado 8750e1eecfaa1099a807c43022338a53; observado cef95efed881e6687fd9f416a19ac509.
- functions: public.admin_confirm_contract_operation(p_review jsonb, p_request_id uuid). Campos diferentes: body_md5, definition_md5. Corpo esperado a2c468db78132a35fadaa0d7d3233357; observado 95664a41c5bbcae5e2c74c853e3b1885.
- functions: public.avalia_plus_assignment_is_open(p_assignment assessment_assignments). Campos diferentes: acl.
- functions: public.avalia_plus_replace_assessment_items(p_assessment_id uuid, p_payload jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado c5537e9ae3e9178c62df6ab779a3b211; observado e6d420454c9c6faa663a611e1b400b68.
- functions: public.avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text). Campos diferentes: body_md5, definition_md5. Corpo esperado d8cf915ff3d16e1e1d162370a7e46cb1; observado 754464c3b034057556097759341d677a.
- functions: public.avalia_plus_replace_question_alternatives(p_question_id uuid, p_alternatives jsonb). Campos diferentes: body_md5, definition_md5. Corpo esperado 551b00d995c74924c24e98a71dc52973; observado a5d69cd4de9914d3145a70f7904e895a.
- relations: public.communications. Campos diferentes: columns, triggers, constraints.
- relations: public.question_items. Campos diferentes: indexes.
- relations: public.question_media. Campos diferentes: indexes.
- relations: public.communication_deliveries. Campos diferentes: policies.
- relations: public.question_distractor_analyses. Campos diferentes: indexes.
- schemas: public. Campos diferentes: acl.

Diferenças de ACL textual sem diferença no objeto execute não provam expansão de acesso dos três papéis inspecionados. Mudanças de corpo também não são, por si, regressões. Por exemplo, as definições observadas de communication_reply_allowed, communication_edit_allowed e communication_list_reply_threads incluem guards de recipient_scope/message_scope_access posteriores ao manifesto.

## Diário: fonte atual e contrato

Fonte atual obtida: `pg_get_functiondef` no catálogo de produção, não o baseline local. A busca local por `attendance_diary_integrity`, `v_expected_version` e `NULL preserves existing links` não encontrou SQL atualizado em `platform/`. Não há caminho de migration local atual a indicar com segurança. A versão relacionada no ledger é **20261016231231 attendance_diary_integrity**. O JSON guarda contrato/hash e consulta exata para recuperar novamente a definição quando necessário; não inventa um dump integral.

- Upsert: hash de corpo `7289be1cd9416e52a8e6b8df9790f4e0`.
- Enviar `p_activity_links=null` preserva vínculos. Enviar `[]` limpa explicitamente. O default SQL é []: não omitir o campo se a intenção é preservar.
- Atualização efetiva exige `If-Match: "id|updated_at"`; divergência ou ausência gera SQLSTATE PT409.
- Operação idêntica retorna unchanged antes do teste de revisão.
- Create sem entrada existente não exige revisão. Mesmo sem entry_id, turma/data pode resolver entrada existente e exigir revisão.
- A lista inclui updated_at, plan_id, calendar_entry_id e activity_link_count, além de conteúdo, status e totais.
- Fechar diário **não valida If-Match**. A função faz lock e autorização, mas não compara revisão. Leitura prévia no cliente não fecha a janela de concorrência; não anunciar essa proteção.
- Preservar plan_id/calendar_entry_id na edição. O backend trata parâmetros como valores completos, não patch parcial.
- Há validação de auth.uid(), vínculo docente/turma ativos e autorização institucional; atualização de fechado/excluído é negada.

## Homologação fiel e segura

Não existe branch de desenvolvimento da produção. Os dois projetos RS-SCHOOL-TEMPLATE-V1-VALIDATION/VALIDATION-2 existem, mas não contêm os RPCs de contexto/biblioteca/Missão necessários e não são sandbox pronto do app. O frontend atual aponta para produção.

Roteiro recomendado, sujeito às autorizações próprias de cada ação:
1. Escolher explicitamente um ambiente isolado. Não reutilizar/sobrescrever os templates por inferência. Aprovar custos antes de criar uma branch/projeto pago e obter confirmação apropriada para acessos persistentes.
2. Inventariar e reconciliar schema/definições atuais, Edge Functions e configuração pública. Considerar mudanças posteriores ao pacote histórico; não importar dados operacionais, usuários, segredos ou tokens de produção.
3. Aplicar apenas estrutura revisada no ambiente escolhido, com RLS/ACLs e dependências atuais. Preparar dados e identidades estritamente fictícios para os três perfis, vínculos, escola/turma/licenças e conteúdo de teste.
4. Configurar login central e /app/ no mesmo domínio de homologação, apontando exclusivamente para backend isolado.
5. Executar testes de sessão/troca/logout/expiração e persistência com contas de teste autorizadas, incluindo negação entre escolas, revisões conflitantes, null versus [] nos vínculos e cancelamento após mudança de sessão.
6. Não habilitar todas as flags apenas pelo ledger. Validar cada fluxo contra os contratos atuais, registrar limitações e manter fechar diário bloqueado caso revisão otimista seja requisito.
7. Qualquer publicação/merge em produção deve ser decisão separada, com evidência e rollback. Esta inspeção não autorizou nem executou isso.

Documentação Supabase consultada: https://supabase.com/docs/guides/deployment/branching e https://supabase.com/docs/guides/deployment/branching/working-with-branches .
