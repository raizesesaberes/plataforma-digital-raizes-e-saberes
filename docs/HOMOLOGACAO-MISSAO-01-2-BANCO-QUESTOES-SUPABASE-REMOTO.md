# Homologacao Missao 01.2 - Banco de Questoes no Supabase Remoto

Data: 28/07/2026

## Status

Homologacao remota ainda nao executada neste workspace por ausencia de configuracao Supabase real e de credenciais seguras. A plataforma foi preparada para nao mascarar ausencia de conexao em producao e recebeu um script operacional para aplicar/verificar migrations, seed e RLS quando os dados forem fornecidos.

## Inspecao do ambiente

Nao foram encontrados no workspace:

- `supabase-config.js`;
- `.env`;
- `.env.local`;
- `supabase/config.toml`;
- `package.json`;
- Supabase CLI;
- `psql`;
- variaveis `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `DATABASE_URL` ou tokens de perfil.

Configuracao existente confirmada:

- `supabase-config.example.js` define `window.RAIZES_SUPABASE`;
- `curadoria.html` ja usa `supabase-config.js`;
- `banco-questoes.html` agora tambem carrega `supabase-config.js`;
- `supabase-config.js` esta no `.gitignore`;
- nenhuma `service_role` foi colocada no frontend.

## Ajustes realizados nesta missao

- `app-pages.js`: fallback local agora funciona somente em desenvolvimento local ou quando `allowLocalFallback: true`; em producao sem Supabase, exibe erro explicito.
- `supabase-config.example.js`: documenta `allowLocalFallback: false`.
- `scripts/question-bank-remote-homologation.mjs`: script para aplicar SQL com `psql` e verificar tabelas, seed, RLS e fluxo de avaliacao via REST.

## Dados necessarios para concluir a ativacao real

Para aplicar SQL:

- `SUPABASE_DB_URL` ou `DATABASE_URL`, mantida somente em ambiente local/CI seguro.
- Cliente `psql` instalado, ou execucao manual dos SQLs no painel Supabase.

Para verificar REST/interface:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `supabase-config.js` no ambiente de deploy/local, com apenas URL e anon key publica.

Para testes RLS por perfil:

- `SUPABASE_ACCESS_TOKEN_ADMIN`;
- `SUPABASE_ACCESS_TOKEN_PROFESSOR`;
- `SUPABASE_ACCESS_TOKEN_CURATOR`;
- `SUPABASE_ACCESS_TOKEN_VIEWER`;
- opcionalmente `SUPABASE_ACCESS_TOKEN_APLICADOR`.

Esses tokens devem ser JWTs reais de usuarios do Supabase Auth com `app_role` ou mecanismo equivalente reconhecido pelas funcoes RLS.

## Como executar

Aplicar migrations e seed:

```bash
SUPABASE_DB_URL="postgres://..." \
SUPABASE_URL="https://PROJECT_REF.supabase.co" \
SUPABASE_ANON_KEY="..." \
node scripts/question-bank-remote-homologation.mjs apply
```

Verificar tabelas, seed, fluxo de avaliacao e RLS:

```bash
SUPABASE_URL="https://PROJECT_REF.supabase.co" \
SUPABASE_ANON_KEY="..." \
SUPABASE_ACCESS_TOKEN_ADMIN="..." \
SUPABASE_ACCESS_TOKEN_PROFESSOR="..." \
SUPABASE_ACCESS_TOKEN_CURATOR="..." \
SUPABASE_ACCESS_TOKEN_VIEWER="..." \
node scripts/question-bank-remote-homologation.mjs verify
```

Executar tudo:

```bash
SUPABASE_DB_URL="postgres://..." \
SUPABASE_URL="https://PROJECT_REF.supabase.co" \
SUPABASE_ANON_KEY="..." \
SUPABASE_ACCESS_TOKEN_ADMIN="..." \
SUPABASE_ACCESS_TOKEN_PROFESSOR="..." \
SUPABASE_ACCESS_TOKEN_CURATOR="..." \
SUPABASE_ACCESS_TOKEN_VIEWER="..." \
node scripts/question-bank-remote-homologation.mjs all
```

## SQL esperado

Ordem obrigatoria:

1. `supabase/migrations/202607280002_question_bank.sql`
2. `supabase/migrations/202607280003_question_bank_activation.sql`
3. `data/question_bank/2026-07-28-question-bank-demo.seed.sql`

## Evidencias que o script produz

Sem expor credenciais, o script imprime JSON com:

- host da URL Supabase;
- confirmacao de anon key fornecida;
- contagem de registros por tabela;
- codigos e status das quatro questoes demonstrativas;
- ID da avaliacao `SIMULADO DE HOMOLOGACAO - 5o ANO`;
- ordem inicial e ordem reordenada das questoes;
- resultados de tentativas RLS bloqueadas;
- confirmacao de que o frontend usa anon key, nao `service_role`.

## Resultado desta execucao local

Nao executado contra Supabase remoto porque faltam as credenciais acima.

Validacao local realizada:

- sintaxe de `app-pages.js`: OK;
- sintaxe de `scripts/question-bank-remote-homologation.mjs`: OK;
- `supabase-config.js` ausente e ignorado pelo Git, como esperado.

## Conclusao

A Missao 01.2 nao pode ser declarada homologada no Supabase remoto sem os dados de conexao. O workspace ficou pronto para a execucao segura: assim que URL, anon key, DB URL segura e tokens de perfis forem fornecidos no ambiente, o script aplica as migrations/seed e gera as evidencias objetivas exigidas.
