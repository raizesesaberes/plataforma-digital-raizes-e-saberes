# Homologacao Missao 01.1 - Banco de Questoes

Data: 28/07/2026

## Status

Ativacao real preparada no codigo da plataforma. A confirmacao remota completa depende de aplicar as migrations no projeto Supabase e configurar `supabase-config.js` com `SUPABASE_URL` e `SUPABASE_ANON_KEY` publica.

## Ambiente Supabase

Configuracao reutilizada:

- `window.RAIZES_SUPABASE.url`;
- `window.RAIZES_SUPABASE.anonKey`;
- `window.RAIZES_SUPABASE.accessToken` opcional;
- `localStorage["raizes:supabase-access-token"]` opcional.

Nao foi criada segunda configuracao Supabase e nenhuma `service_role` foi exposta no frontend.

## Arquivos

- `banco-questoes.html`: carrega `supabase-config.js`.
- `app-pages.js`: camada `questionBankDataService` e ativacao persistente da tela.
- `master-pack.css`: acabamento responsivo dos controles de avaliacoes salvas.
- `supabase/migrations/202607280003_question_bank_activation.sql`: ajustes de perfis, RLS, campos de avaliacao e indices.
- `data/question_bank/2026-07-28-question-bank-demo.seed.sql`: seed idempotente das quatro questoes autorais.

## Camada de dados

Funcoes implementadas:

- listar questoes;
- buscar questao por ID/codigo;
- listar alternativas;
- listar fontes;
- listar licencas;
- listar avaliacoes;
- buscar avaliacao por ID;
- criar avaliacao;
- atualizar avaliacao;
- arquivar avaliacao;
- duplicar avaliacao;
- adicionar questao;
- remover questao;
- reordenar questoes;
- registrar uso;
- consultar historico de curadoria.

## Persistencia do construtor

O construtor salva:

- titulo;
- componente curricular;
- ano escolar;
- turma;
- orientacoes;
- data de aplicacao;
- capa;
- questoes adicionadas;
- ordem;
- pontuacao inicial;
- status de rascunho.

## Regras de acesso

A migration complementar atualiza a funcao de perfil para aceitar papeis em portugues e ingles:

- administrador nacional / admin;
- gestor / gestor da rede;
- curador / curator;
- revisor pedagogico / revisor;
- professor;
- aplicador;
- visualizador.

As politicas RLS impedem que a protecao dependa apenas de esconder botoes na interface.

## Validacoes locais

Comando executado:

```bash
/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node -e "const fs=require('fs'); const vm=require('vm'); new vm.Script(fs.readFileSync('app-pages.js','utf8')); console.log('syntax ok'); process.exit(0);"
```

Resultado:

- `syntax ok`.

## Limitacao

Nao foi possivel confirmar se `202607280002_question_bank.sql` ja foi executada no Supabase remoto porque este workspace nao possui `supabase-config.js` com valores reais, Supabase CLI, `DATABASE_URL` ou token administrativo seguro.

## Passos manuais para homologacao remota

1. Aplicar `supabase/migrations/202607280002_question_bank.sql`.
2. Aplicar `supabase/migrations/202607280003_question_bank_activation.sql`.
3. Executar `data/question_bank/2026-07-28-question-bank-demo.seed.sql`.
4. Criar `supabase-config.js` no ambiente de deploy com URL e anon key publica.
5. Autenticar com usuario cujo JWT contenha `app_role` adequado.
6. Abrir `banco-questoes.html` e validar leitura, filtros, detalhe, salvar rascunho, adicionar/remover/reordenar questoes, duplicar e arquivar avaliacao.
