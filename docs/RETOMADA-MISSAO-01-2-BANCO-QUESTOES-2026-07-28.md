# Retomada Missao 01.2 - Banco de Questoes

Data: 28/07/2026

## Resultado

B. IMPLEMENTADA, MAS NAO HOMOLOGADA POR AUSENCIA DE ACESSO AO SUPABASE.

## Evidencias locais

- `supabase-config.js` nao existe no diretorio da aplicacao.
- `supabase-config.js` tambem nao foi encontrado nas raizes de workspace disponiveis.
- Nao existem variaveis `SUPABASE_URL` ou `SUPABASE_ANON_KEY` no ambiente deste workspace.
- `banco-questoes.html` carrega `supabase-config.js` antes de `app-pages.js`, mas o arquivo real esta ausente.
- `supabase-config.example.js` existe e usa apenas URL publica e anon key publica.
- `.gitignore` ignora `supabase-config.js`, como esperado para configuracao local/ambiente.
- Busca por credenciais privilegiadas no frontend nao encontrou `service_role` em HTML/JS publico; ha apenas placeholder seguro em `.env.example`.

## Comandos executados

```bash
find "/Users/danielhenrique/Documents/plataforma digital raizes e saberes" -maxdepth 2 \( -name ".env" -o -name ".env.local" -o -name "supabase-config.*" \) -print
```

Resultado:

- apenas `supabase-config.example.js`.

```bash
node scripts/question-bank-remote-homologation.mjs verify
```

Resultado:

- `SUPABASE_URL e SUPABASE_ANON_KEY nao informados. Nao e possivel homologar o Supabase remoto neste workspace.`

```bash
node --check scripts/question-bank-remote-homologation.mjs
```

Resultado:

- OK.

```bash
node -e "const fs=require('fs'); const vm=require('vm'); new vm.Script(fs.readFileSync('app-pages.js','utf8')); console.log('app-pages.js syntax ok')"
```

Resultado:

- `app-pages.js syntax ok`.

## Itens nao homologados por falta de conexao

- conexao real com Supabase;
- ausencia do fallback local na interface conectada;
- carregamento remoto das quatro questoes;
- fontes, licencas, alternativas e metricas remotas;
- criacao da avaliacao `SIMULADO DE HOMOLOGACAO - 5o ANO`;
- salvamento, recarregamento e persistencia;
- remocao e reordenacao;
- duplicacao e arquivamento;
- logs de uso;
- autenticacao real;
- reconhecimento de perfis;
- testes diretos de RLS;
- bloqueio remoto de questoes nao publicadas;
- bloqueio remoto de alteracoes nao autorizadas.

## Dado necessario para concluir

Colocar `supabase-config.js` no diretorio da aplicacao ou fornecer `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente deste workspace. Para testar RLS por perfil, tambem sao necessarios JWTs reais de usuarios com `app_role` de administrador, professor, curador/revisor e visualizador/aplicador.
