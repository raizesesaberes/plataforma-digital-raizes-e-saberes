# Integração local PR1 + PR2/3/4

Worktree: `/workspace/fase3-integration`; branch **local, não publicada** `review/fase3-integration-check`.

- PR1 contratos: `4a96e6cb6035eaaea86b9a87f0e5a71b8691f271`.
- PR2: `3af739a55ba913b9f7e3794ff20da725cf9e496f`.
- PR3: `f11ee276917e5a791b9153a4cbe2946349769493`.
- PR4: branch `review/fase3-notice-editing`, incluindo a correção de cartões/contadores `b29f3cf`.
- Merge local: `5a76f637480f9d135c047105c1bdba910bc521e4`. Nenhum conflito textual em app-pages.js. Sintaxe JS e build estático passam; 4276 arquivos. SQL/QA/operacional ficam fora de dist.

## Dependência de ordem comprovada

`node qa/fase3/integration-run.mjs --contracts-first` instala apenas no Docker sintético PR1 antes de PR2. Resultado **bloqueado corretamente**: `FASE3_REVIEW_BASE_CHANGED: active_rules`. Contratos substitui active_rules e school_contract, que o PR2 fixa pelo hash anterior. Não remover/burlar esse preflight.

`node qa/fase3/integration-run.mjs` instala, no Docker descartável, **PR2 → PR3 → PR4 → PR1**, com os artefatos existentes sem editar SQL. Resultado **29 PASS / 0 FAIL** na jornada sintética FASE3 após a composição. As sete pré-condições de funções do preflight de contratos conferem antes da proposta. O ledger de migrations de produção não existe nesta fixture mínima e **não foi homologado nem fabricado**. Todos os containers desta execução foram removidos.

A sequência acima é evidência de compatibilidade local, não autorização de aplicação. Se contratos já estiver aplicado quando a implantação FASE3 for preparada, PR2 exigirá nova revisão explícita de suas dependências/preflight; esta entrega não altera os hashes aceitos. Conferir ledger, estado real, ACLs/triggers e revisão de segurança no procedimento coordenado de produção. Não instalar fixtures, não aplicar diretório inteiro de SQL.

## SHA256 dos artefatos testados

| SQL | SHA256 |
|---|---|
| contract_operations.sql | `938d444f542cbd3d739044271fa0e1d43c93b6e40508ba292cb946cde772f415` |
| fase3_assessment_authorization.sql | `de28fdb1726d50c1fbb04b0ae96fcf148f3c391562316485911167883d179389` |
| fase3_communication_replies.sql | `23a45eb7ae85e8fb11b8605f983b07122028e63c508a8d1e6891b13a369028be` |
| fase3_notice_editing.sql | `9819264bd71a61d90f522040405193c211ebad9fab39880a2748b503409341c1` |

A bateria própria de administração/renovação/cancelamento de contratos continua sendo a evidência do PR1; não se afirma que os 29 casos FASE3 substituem aquela revisão. Nenhuma consulta ou mutação em produção, alteração de main ou deploy foi realizada.
