# Banco Completo — proposta de catálogo, não instalada

Novo produto: **Raízes e Saberes — Banco Completo**, código `RS_BANCO_COMPLETO`, status ACTIVE para aparecer no seletor administrativo. ACTIVE no catálogo não é entitlement. Não alterar o produto legado `RS_HOMOLOGACAO_FUNDAMENTAL`.

## Escopo exato

Um produto novo; um módulo novo `UNIVERSIDADE_CAPACITACAO` com tipo TRAINING; sete associações de módulos ao produto novo. IDs gerados pelo banco, nunca copiados de fixtures. Se já existirem com origem/configuração exatas, repetição é no-op; colisões interrompem a transação. Se o produto já estiver em uso por contrato, entitlement, coleção ou módulo de plataforma, parar para revisão. Não cria grants, contratos, alvos, vínculos de rede, usuários, conteúdo ou ativa escolas. Não muda enums, RPCs, ACLs, RLS ou resolver.

| Necessidade | Módulo | Tipo canônico | Identificação atual |
|---|---|---|---|
| Questões | BANCO_QUESTOES | QUESTION | Questões |
| Livros e páginas | BIBLIOTECA_LIVROS | BOOK / BOOK_PAGE | Livros / Páginas |
| Vídeos | VIDEOS | VIDEO | Vídeos |
| Jogos | JOGOS_INTERACOES | GAME | Jogos |
| Experiências digitais | JOGOS_INTERACOES | INTERACTION | Experiências, separadas de GAME na UI |
| Atividades / imprimíveis | ATIVIDADES | ACTIVITY / PRINTABLE | Atividades / Imprimíveis |
| Conteúdos gerais / avaliações | AVALIACOES_PROVAS | ASSESSMENT_TEMPLATE | Rótulo atual do formulário; limitado a modelos de avaliação |
| Capacitação | UNIVERSIDADE_CAPACITACAO (novo) | TRAINING | Universidade / capacitação, autorização separada |

**Limite semântico a revisar:** não existe enum GENERAL. O rótulo atual “Conteúdos gerais / avaliações” não torna ASSESSMENT_TEMPLATE apropriado a qualquer arquivo. Materiais pedagógicos gerais podem ser classificados como ACTIVITY na futura ingestão, preservando sua identidade/subtipo nos metadados, mas não terão autorização separada de outras ACTIVITY apenas por esse subtipo. Não criamos módulo duplicado ACTIVITY/INTERACTION para aparentar isolamento que o resolver não garante. Se for exigida categoria geral independente, requer desenho separado; este pacote não a inventa.

A taxonomia existente tem 16 categorias escolares (EI2–EI5, 1º–9º anos, EM1–EM3) e uma institucional. Sete módulos oferecem nove tipos escolares ×16 =144 opções e uma TRAINING =145. Selecionar todas as categorias escolares não inclui TRAINING. A autorização institucional e sua categoria precisam de seleção explícita na futura revisão contratual.

## Impacto e testes

O produto antigo permanece byte a byte igual, inclusive associações. Acrescentar módulos diretamente nele NÃO seria só catálogo: o resolver legado considera habilitado módulo sem override. O produto separado evita esse efeito e nasce com zero direitos.

Comando sintético: `node qa/fase3/integration-run.mjs --catalog-only`. Docker descartável, mesmas bases revisadas, sem endpoint de produção. `verification.log`: zero alterações em contratos/entitlements/overrides/eventos/escolas/perfis/conteúdo; paridade dos dois resolvers; definições/ACLs/RLS/policies preservadas; produto novo sem direitos; replay idempotente incluindo timestamps; colisões e módulo inativo rejeitados. Chromium renderiza o componente real usando catálogo real do banco sintético, sem rede:145 categorias visíveis,144 selecionadas pelo atalho escolar,TRAINING separada.

## Preflight e execução Mac após revisão

Este pacote ainda não é migration instalada/versionada: CLI oficial indisponível neste executor, sem contorno de EROFS. Fonte exata `supabase/review/banco_completo_catalog.sql`; leitura `banco_completo_catalog_preflight.sql`; SHA256 em `SHA256SUMS`. Nenhuma alteração de produção foi executada.

1. Usar checkout isolado e CLI oficial autenticada, conferindo versão/help e projeto `jaesjldrbjbdmzzggxzw`. Guardar evidências permanentemente fora de dist e sem credenciais, por exemplo subpasta `catalogo-banco-completo` do diretório de instalação controlada do Mac.
2. Executar preflight READ ONLY e registrar ledger atual, catálogo/associações, direitos existentes e triggers. Baseline observada:153 migrations; um produto legado com dois contract_products e dois entitlements ativos; seis módulos ativos, só QUESTION associado ao legado; produto novo e TRAINING ausentes. Triggers observados apenas touch_updated_at BEFORE UPDATE em products/content_modules; nenhum trigger de associação. Drift exige revisão, não override.
3. Gerar migration com `supabase migration new banco_completo_catalog` em diretório isolado. Registrar versão oficial gerada; copiar a fonte SQL sem alterações de bytes, conferir SHA256. Não inventar versão ou inserir ledger manualmente. Revisar o par versão/hash e mecanismo remoto suportado ANTES de aplicar. Não incluir outras migrations pendentes.
4. Aplicar uma única vez pelo mecanismo oficial aprovado; ler recibo/ledger e repetir preflight. Esperado: produto novo + módulo TRAINING + sete associações; zero contratos/entitlements do novo produto; legado/direitos anteriores intactos. Nenhum comando de grant, contrato ou ativação acompanha o pacote.
5. Falha: parar; guardar estado real por leitura. Transação é atômica. Não fazer rollback destrutivo quando houver referência posterior; recuperação forward específica, sem repair ou desativação de guards.
6. Catálogo alterado invalida a prévia contratual já aberta (fingerprint inclui catálogo). Não confirmar aquela prévia nem atualizar sem guardar/capturar o rascunho. Depois da implantação e com usuário pronto, recarregar, escolher Banco Completo e gerar nova revisão integral. Não salvar primeiro o contrato parcial de questões.

A aprovação deste catálogo não cria os contratos das cinco escolas nem importa conteúdo. Gates FASE3 continuam OFF; PR7 de UX continua draft separado.
