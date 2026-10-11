# Compatibilidade das proteções existentes — FASE3

Base revisada: PR6 `6840d3378829caa45e46175981aab2318e2de9e5`. A autorização de instalação foi recebida, mas nenhuma escrita de produção foi realizada. CLI versionada continua indisponível; execução posterior coordenada no Mac permanece necessária.

## Causa e reconstrução

O fixture reproduzia uma migration antiga de adaptações do repositório e omitia as migrations reais `20261009192558/question_access_boundaries` e `20261009195512/assessment_snapshot_student_boundary`. A divergência não era um defeito das proteções em produção.

`boundary-ledger-source.json` preserva as duas migrations consultadas somente por leitura. `boundary-production-functions.json` preserva definições completas, proprietário, GUC, ACL e hash de 16 funções atuais; `boundary-production-stage0.json` preserva o catálogo ampliado, sem dados de usuários. Dependências de autorização incluem `is_platform_admin`, `current_platform_role`, `has_question_bank_role`, helpers `question_bank_*` e o resolver canônico já conferido pelo preflight.

O replay é exclusivo de Docker descartável: `observed-boundary-fixture.sql` recompõe as barreiras; `observed-boundary-alignment.sql` fixa as definições atuais e remove somente estruturas legadas que o antigo fixture acrescentava e que não existem no catálogo real. Inclui oito colunas opcionais de adaptação e dois triggers antigos substituídos pelo trigger canônico. Os guards das quatro propostas NÃO foram alterados. O precondition histórico editorial, incompatível com a antiga base local, continua preservado na fonte; o fixture reconstrói o estado atual, não simula aquele upgrade histórico.

A consulta de metadados foi ampliada para cobrir dependências e nove relações adicionais. O comparador exige igualdade exata; não normaliza nem ignora ACLs, políticas ou triggers. Checkpoint00 coincide com a captura real: 43 funções/19 relações; checkpoint04 contém 62/23. Controles negativos rejeitam RLS desativado, SELECT indevido e remoção da policy restritiva.

## Interação dos guards

Em `assessment_questions`, INSERT executa `fase3_assessment_question_guard`, `trg_avalia_plus_assessment_question_snapshot`, `trg_question_access_boundary`, nessa ordem nominal; todos habilitados (`O`). UPDATE dispara os correspondentes às colunas alteradas. DELETE dispara o novo guard, não os dois triggers de INSERT/UPDATE. A ordem e os efeitos transacionais seguem a [documentação PostgreSQL17](https://www.postgresql.org/docs/17/trigger-definition.html).

O guard FASE3 bloqueia edição/exclusão de conteúdo já atribuído e valida licença/contexto; o trigger existente continua verificando o acesso canônico à questão. A policy `assessment_raw_snapshot_staff_boundary` continua RESTRICTIVE: não concede acesso novo. O aluno usa a RPC de entrega; não lê o snapshot bruto com gabarito. Histórico editorial continua sujeito à barreira de autoria/edição.

Testes dirigidos verificam exclusão em cascata de rascunho sem atribuição, bloqueio da exclusão de avaliação atribuída e alterações de pontos/questão, preservação byte a byte do snapshot e resultado anterior, concorrência publicação/substituição, isolamento entre escolas, resposta/entrega/resultados e contrato operacional grant/revogação. Novo caso verifica leitura bruta vazia para aluno e professor de outra escola, leitura autorizada pelo professor proprietário, histórico editorial inacessível a usuários sem autoria, payload estudantil sem gabarito e writer interno negado.

## Limites de liberação

Os quatro SQLs de instalação e `combined_preflight_20261011060000.sql` permanecem byte a byte iguais aos aprovados. Só fixture, testes, consulta readonly e manifests/evidências mudaram. A captura e o ensaio não reservam versões nem alteram ledger. A instalação no Mac exige revisão destes checkpoints corrigidos e releitura de produção imediatamente antes da etapa inicial; aplicar uma etapa oficial versionada por vez. Não usar repair, ledger manual ou override.

Login/refresh real, gates, contratos/grants reais, usuários, publicação nativa e homologação humana permanecem fora deste ensaio. Nenhum gate foi ativado.

Evidência final: `boundary-integration-verification.log`, 31 jornadas PASS, cinco suítes de contratos PASS e bridge operacional PASS. `manifests/capture.log` comprova paridade inicial e preservação final; `manifests/comparator-checks.json` registra verificações positivas/negativas.
