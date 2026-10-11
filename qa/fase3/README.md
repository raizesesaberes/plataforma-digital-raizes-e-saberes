# FASE3 — primeira fatia sintética, 2026-10-11

Base: `ee88cb9e80d454c64b6548f28e15f34f32fc48a2`. Branch: `review/fase3-synthetic-journeys`.
Não integrar nem publicar automaticamente: há dois bloqueios de autorização reproduzidos.

## Executar

```sh
node qa/fase3/run.mjs
```

Requer Node 24 (importa TypeScript nativamente) e Docker Linux. Usa imagens oficiais fixadas por digest, cria containers temporários sem portas publicadas e os remove ao terminar. Não recebe URL, token ou credencial de produção. Os tokens, usuários, escolas e conteúdo são fictícios. O schema `auth` é uma simulação local de claims; não testa o serviço Auth. `question_bank_role=professor` é uma pré-condição explícita das identidades fictícias, além de `platform_role=professor`. O perfil somente com `platform_role` não autorizou montagem no primeiro ensaio; não foram alteradas credenciais/claims reais.

Saída atual: **13 PASS, 2 FAIL**. O processo retorna código 1 intencionalmente enquanto as asserções de isolamento falharem. `results.json` é o resultado atual; `before.json` preserva o ensaio anterior à correção web/alinhamento do baseline. Testes positivos de bloqueio de edição e reprodução de PGRST201 não significam que esses recursos funcionem: validam o comportamento observado.

Todos os testes mutantes usam PostgreSQL/PostgREST locais. A web usa o método real `createAssessmentFromBank` extraído de `app-pages.js`; o mobile importa o serviço real `library.ts`. Não são testes de cliques em navegador nem de binários iOS/Android. Não houve homologação humana, envio a usuários reais, alterações Auth, importação homologada, mudanças de policies/ACL, push em main ou deploy.

## Correções pequenas e verificadas

1. Web: `questionBankDataService.remote.createAssessmentFromBank` serializava os campos da avaliação diretamente. A RPC tem assinatura `p_payload jsonb`: retorno observado HTTP 404 / SQLSTATE 42883. Encapsular em `{ p_payload: payload }` permite a montagem pela mesma RPC.
2. Mobile: `getTeacherAssessmentAssignments` usava `classes(nome)`, ambíguo entre duas FKs. PostgREST real reproduz HTTP 300 / PGRST201. Usar `classes!assessment_assignments_class_id_fkey(nome)` mantém o formato de resposta e retorna a turma correta.

O diff de runtime soma uma linha modificada em cada arquivo. Não foram incorporados contratos da FASE2, nem a branch histórica mobile. `620b8428112b332bc9e46f0126deb6ef8afe40bb` não é ancestral da base; há diferenças de UI/hooks nessa branch que precisam de integração separada.

## Resultados e limites

| Jornada | Estado | Evidência/limite |
| --- | --- | --- |
| Professor encontra questão autorizada | Validado na API sintética | Escola A recebe 1 questão pelo resolver; escola B sem entitlement recebe 0. |
| Montar → publicar turma → aluno recebe/inicia/responde/entrega → professor resultados | Validado na API sintética | 1 aluno, 1 questão objetiva, 100% após entrega; adaptador web real testado. Não valida todas as telas nem tipos de atividade. |
| Isolamento de avaliação com JWT de e-mail não vazio | Validado no cenário sintético | Escola B não lista/inicia/responde nem lê resultados da escola A. |
| Montagem respeita entitlement | **Defeito / bloqueio** | Professor B consegue montar a questão da escola A por ID via RPC mesmo quando o resolver retorna zero itens. |
| Identificação de aluno sem e-mail no JWT | **Defeito / bloqueio** | Aluno B é resolvido como aluno A por igualdade de strings vazias. |
| Aviso → destinatário → leitura → retorno ao professor | Validado na API sintética | Entrega apenas a A, leitura idempotente, contagem lido/não lido e bloqueio de leitura por B. |
| Retirada/republicação/exclusão lógica | Validado na API sintética | Caixa de entrada esvazia; republicação preserva ID sem duplicar entrega; exclusão remove da caixa. |
| Rascunho/vencido | Validado no cenário sintético | Não geram entrega. Não se executou teste de passagem de relógio. |
| Edição do texto | Ausente/bloqueado no fluxo inspecionado | PATCH retorna 403 (ACL); não foi localizada RPC de edição. Link web “Visualizar/Editar” somente filtra por título. Não ampliar UPDATE como atalho. |
| Resposta a comunicado / conversa | Ausente nas rotas inspecionadas | Não foi localizado fluxo de resposta; leitura não é resposta. Não confundir moderação/suporte com comunicação aluno/professor. |
| Mobile: consultas Avalia+ e envio/contagem de recados | Validado no serviço | Métodos reais exercitados contra PostgREST. |
| Mobile: professor publica avaliação e vê resultados | Ausente/incompleto | `onPublish` altera estado local; mapper fixa questions/assigned/completed=0 e students=[]. Nenhuma conclusão de paridade. |
| Mobile: aluno responde/entrega | Ausente no fluxo real inspecionado | Lista mostra “Aguardar orientação”; serviço não possui métodos de start/save/submit. Telas com estado local não comprovam persistência. |
| Atividades não Avalia+, família, navegador e apps nativos | Não validado nesta fatia | Próximas fatias; não declarar prontas. |

## Bloqueios para revisão específica

**B1 — identificação por e-mail vazio.** `avalia_current_student_id` e `avalia_student_can_access_assignment` usam `coalesce(email,'') = coalesce(jwt.email,'')`. Uma claim ausente coincide com registros sem e-mail. O teste negativo usa as mesmas identidades fictícias dos testes positivos e remove apenas a claim de e-mail. A definição em produção contém a mesma lógica. Não houve exploração com alunos reais. Próxima correção deve priorizar vínculo `user_id=auth.uid()` e revisar a necessidade de fallback legado, exigir e-mail não vazio caso mantido e testar colisões. Não foi alterada identificação/Auth nesta frente, conforme a restrição recebida.

**B2 — montagem contorna o resolver.** `avalia_plus_create_assessment_from_bank` verifica papel e aprovação/publicação da questão, mas não o entitlement da escola. O teste B tem zero conteúdo autorizado e a mesma questão é aceita por ID (HTTP 200). Revisar montagem, substituição de itens e aplicação em conjunto para evitar um caminho alternativo; autorização deve ser server-side, não apenas no catálogo. Não adicionamos grants, policies ou novas rotas privilegiadas. Exige revisão específica antes de produção.

Os dois testes permanecem vermelhos para impedir que a FASE3 seja declarada verde com esses defeitos.

## Divergência de baseline e consultas readonly

O baseline versionado tenta inserir `assessment_attempts.time_limit_minutes`, coluna inexistente. A função **já está corrigida em produção**, sem essa coluna no INSERT. A fixture `observed-start-attempt.sql` copia exclusivamente essa definição obtida por leitura; não é migration e não deve ser aplicada em produção. Sem ela, a reconstrução local para no início da tentativa (42703), não por falha atual comprovada de produção.

Foram consultados apenas metadados: colunas, assinatura, definição/hash de funções e privilégio UPDATE de communications. Não se leu nenhuma linha de usuário/aluno. Os hashes `md5(prosrc)` coincidiram entre o banco sintético e produção para:

- `avalia_current_student_id`: `99d05b069c9e0fd4ea608d40643cf1a3`
- `avalia_student_can_access_assignment`: `32295b90fb740ac5399c40cbfd71e33a`
- `avalia_plus_create_assessment_from_bank`: `dd108be00647e4e653a4c1b7dda5f24e`

Função de início observada em produção: `4f11c798067d92f253b929fea32f6004`. UPDATE de communications para authenticated: false. Isso confirma definições, não homologação de runtime de produção. O changelog Supabase não pôde ser lido (403 no executor); não houve contorno do proxy.

Validações adicionais: `node --check app-pages.js`, `git diff --check`, build estático com **4274 arquivos**. SQL/testes/relatórios ficam fora de `dist`. Não foi executado typecheck completo do Expo (mudança mobile é somente string de consulta).
