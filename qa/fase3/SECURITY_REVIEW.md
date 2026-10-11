# Revisão independente — FASE3

## Estado

SQL somente local: `supabase/review/fase3_assessment_authorization.sql`. Não aplicado em produção. Dois defeitos confirmados por reprodução sintética e comparação readonly das definições/ACLs reais. Não foram consultados registros de alunos/usuários. `production-parity.json` registra 12 funções; o runner compara assinatura, hash do corpo, security-definer, search_path, ACL exata e EXECUTE anon/authenticated antes de aplicar a proposta (`local-parity.json`: PASS).

## Mudanças propostas

- `avalia_current_student_id`: somente vínculo direto `students.user_id=auth.uid()`; retorna null se nenhum ou mais de um aluno ativo estiver ligado. Remove equivalência por e-mail vazio e colisões de e-mail. Identidades legadas somente por e-mail precisarão de reconciliação institucional separada; não foi executada nem proposta criação de contas/senhas/claims.
- `avalia_student_can_access_assignment`: exige o aluno resolvido pelo vínculo direto, mantém matrícula, escola, turma, status e janela de disponibilidade e retorna false para parâmetros nulos. ACL pública existente preservada.
- Guard privado em `assessment_questions`: usa autorização canônica para professor, com aprovação/publicação e licença editorial. Cobre montagem, substituição e outras rotas que escrevam nessa tabela. Uma avaliação do builder sem school_id recebe a escola verificada pelo contexto; o cliente não escolhe por rótulo.
- Guard privado em `assessment_assignments`: revalida todas as questões ao publicar/republicar ou trocar contexto e impede publicação de avaliação vinculada a outra escola. Assim, perder a licença entre montar e publicar também bloqueia a operação.
- Autoria editorial global por papéis privilegiados não docentes mantém o comportamento de montagem existente. Publicação em escola sempre passa pelo guard. Escolas legadas usam o resolver canônico paginado; escolas com categorias usam o mesmo `authorized_items` privado do catálogo. Os testes de concessão/suspensão desta rodada usam categorias dinâmicas; não constituem cobertura de todas as configurações legadas/editoriais.
- Funções auxiliares no schema privado existente, com `search_path=''` e EXECUTE revogado de public/anon/authenticated/service_role. Nenhuma policy, grant de tabela ou acesso persistente da aplicação foi ampliado. Antes de instalar a proposta, SQL compara as 12 dependências observadas (corpo, assinatura, ACL, configuração e privilégios). Isso não atesta paridade do esquema completo. O arquivo é deliberadamente de aplicação única.

## Evidências

```sh
node qa/fase3/run.mjs --baseline # 14 PASS, 9 FAIL: bugs reproduzidos
node qa/fase3/run.mjs            # 25 PASS, 0 FAIL: correção local e regressões pós-revisão
```

`results-baseline.json` e `results.json` registram os casos. Incluem:

- JWT com e-mail ausente, vazio, divergente e subject nulo; perfil sem aluno; vínculo duplicado; IDs nulos.
- Escola/turma erradas, questão inexistente/nula e rollback atômico da montagem negada.
- Contrato vencido/suspenso, entitlement vencido/suspenso, licença editorial sem publicação, item não aprovado.
- Concessão válida para B permite montagem; revogação volta a negar. Mesmo com concessão, B não pode publicar avaliação vinculada a A.
- Professor autorizado descobre → monta → publica; aluno recebe/inicia/responde/entrega; professor recebe 100% no resultado. Outra escola não lista/inicia/responde/lê resultados.
- Aviso publicado/entregue/lido, retorno de leitura, retirada/republicação sem duplicata, exclusão lógica, vencido/rascunho e adaptadores reais web/mobile.

O baseline versionado ainda tem uma função de início de tentativa desatualizada. O runner usa a definição já existente em produção (`observed-start-attempt.sql`), somente como fixture local. Não reaplicar essa fixture em produção.

## Integração

Branch isolada sobre ee88cb9; não contém FASE2. Duas linhas de runtime anteriores corrigem p_payload na web e FK explícita no mobile. SQL de revisão não entra no build/dist e nenhum mecanismo o aplica automaticamente. Não mergear/deployar como conclusão da FASE3 sem revisar SQL e planejar as lacunas funcionais descritas no README.

## Correção após revisão independente

O guard anterior validava substituições no contexto agregado de anos do professor. Uma avaliação criada sem turma podia ser atribuída ao 5º ano e depois receber questões exclusivas do 4º ano. Agora qualquer atribuição existente torna os itens imutáveis: INSERT, UPDATE (inclusive pontos/posição/snapshot) e DELETE são recusados, inclusive após encerramento. Para mudar os itens, criar outra avaliação. Nenhum dado histórico é reescrito pela proposta.

Publicação e escrita de itens bloqueiam a mesma linha de `assessments`, serializando a disputa. Regressão HTTP sintética: professor com duas turmas/anos, ambas categorias autorizadas na escola; troca de itens funciona antes da atribuição e é negada depois; snapshot original e resultado já entregue permanecem iguais. Quatro disputas concorrentes de publicação/substituição exigem exatamente uma operação bem-sucedida, sem publicação de conteúdo do ano errado.

Limite deliberado: `teacher_authorize_assessment_reapplication` altera máximo de tentativas/application_status e não passa pelo guard de publicação. Esta proposta preserva avaliações atribuídas; **não implementa autorização contínua de catálogo nas reaplicações ou no acesso do aluno**. A revisão e decisão de produto sobre essa semântica permanecem necessárias. A prova de paridade cobre as funções enumeradas, não todo o esquema/ACL/RLS/triggers.

### Compatibilidade da exclusão de rascunho

A revisão incremental reproduziu `DELETE /assessments?id=eq.<draft>` pelo proprietário com HTTP403 `ASSESSMENT_NOT_FOUND`: na cascata FK o pai já não estava visível ao guard dos itens. Corrigido com guard BEFORE DELETE no pai que rejeita avaliações atribuídas **antes** de qualquer cascata, permitindo depois a remoção de itens de um rascunho cujo pai foi excluído. Teste real via REST: rascunho com questão retorna HTTP200 e remove a questão; avaliação atribuída retorna HTTP403 e mantém questão, atribuição e resultado entregue. Não foi removida proteção de mutações diretas dos itens atribuídos.
