# Homologacao Fase 05.1 - EDU-001

Data: 28/07/2026  
Missao: implantacao real e homologacao do lote EDU-001  
Status: parcialmente preparada; aplicacao remota bloqueada por ausencia de configuracao Supabase neste workspace.

## Configuracao Supabase encontrada

Nao foram encontrados:

- `.env`;
- `.env.local`;
- `supabase/config.toml`;
- `package.json` com cliente Supabase;
- variaveis `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF` ou `DATABASE_URL`;
- Supabase CLI;
- `psql`.

Uso existente detectado:

- `game-engine.js` consulta `window.supabase`, mas nao cria cliente nem define projeto.

## Configuracao segura preparada

Arquivos criados:

- `.env.example`;
- `supabase-config.example.js`.

Arquivo ignorado pelo Git:

- `supabase-config.js`.

Variaveis esperadas:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `SUPABASE_PROJECT_REF`;
- `SUPABASE_DB_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.

Observacao: somente `SUPABASE_URL` e `SUPABASE_ANON_KEY` podem chegar ao navegador. `SUPABASE_SERVICE_ROLE_KEY`, senha do banco e tokens administrativos devem ficar apenas no ambiente seguro de deploy/CI ou operador autorizado.

## Migration

Migration alvo:

- `supabase/migrations/202607280001_curation_pipeline.sql`

Resultado local:

- Arquivo presente.
- Migration idempotente.
- Tabelas, indices, constraints, funcao auxiliar e RLS definidos.

Resultado remoto:

- Nao executado, pois nao ha project ref, URL do banco, CLI ou credenciais de conexao no workspace.

## Seed EDU-001

Seed alvo:

- `data/curation_batches/2026-07-28-educacao-lote-001.seed.sql`

Resultado local:

- Seed idempotente preparado.
- Lote previsto: 1 registro `EDU-001`.
- Cursos previstos: 22 em `AGUARDANDO_REVISAO`.
- Cursos publicados pelo seed: 0.
- Itens descartados/adiados: 3.
- Alertas: 9.

Resultado remoto:

- Nao executado, pela mesma ausencia de configuracao Supabase.

## Central conectada ao banco real

Alteracao realizada:

- `curadoria.html` carrega `supabase-config.js`.
- `app-pages.js` consulta o Supabase real por REST quando `window.RAIZES_SUPABASE` esta configurado.
- A secao `curadoria.html#lotes` nao depende mais de arrays locais para homologacao real.

Estados implementados:

- carregamento;
- erro de conexao;
- ausencia de registros;
- falta de permissao/RLS;
- filtro de alertas;
- filtro de duplicidades;
- ficha completa;
- observacao do curador;
- aprovar;
- rejeitar;
- solicitar correcao;
- publicar exatamente um item selecionado;
- despublicar exatamente um item selecionado.

## Testes locais realizados

Comando:

```bash
/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check app-pages.js
```

Resultado:

- sintaxe OK.

Comando:

```bash
/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/curation-pipeline.mjs validate data/curation_batches/2026-07-28-educacao-lote-001.json
```

Resultado:

- 22 cursos importados;
- 3 itens descartados;
- 0 erros;
- 9 alertas.

## Testes RLS

Nao executados no banco remoto por falta de conexao.

Plano de teste quando o Supabase estiver configurado:

| Perfil | Resultado esperado |
| --- | --- |
| Visitante | Nao acessa registros internos de lotes; ve apenas cursos `PUBLICADO` no catalogo publico. |
| Usuario autenticado comum | Nao cria, edita, aprova, rejeita nem publica conteudos. |
| Curador | Visualiza e edita itens em revisao conforme politica `public.is_university_curator()`. |
| Administrador | Executa acoes editoriais autorizadas, incluindo publicacao controlada. |

## Publicacao controlada

Nao executada no remoto.

Procedimento quando o banco estiver configurado:

1. Abrir `curadoria.html#lotes`.
2. Filtrar `Todos os itens`.
3. Abrir a ficha de um curso com confianca alta.
4. Confirmar URL oficial, titulo, instituicao, gratuidade, carga horaria, certificado, categoria, centro e data de verificacao.
5. Selecionar exatamente um item.
6. Acionar `Aprovar selecionados`.
7. Selecionar o mesmo item aprovado.
8. Acionar `Publicar aprovado selecionado`.
9. Confirmar aparicao no catalogo publico, busca, instituicao, Centro de Conhecimento e pagina individual.
10. Acionar `Despublicar selecionado`.
11. Confirmar que saiu do catalogo publico e permaneceu na Central e nos logs.

## Rollback

Comando local validado:

```bash
/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/curation-pipeline.mjs rollback-sql EDU-001
```

Resultado:

- SQL de rollback gerado.
- Remove cursos vinculados ao lote apenas quando nao estiverem `PUBLICADO`.
- Remove relacoes do lote.
- Preserva usuarios.
- Preserva cursos publicados.

O rollback real deve ser executado primeiro em ambiente de teste ou transacao segura com backup.

## Nove alertas do lote

| Curso | Campo | Motivo | Severidade | Acao sugerida | Impede publicacao? |
| --- | --- | --- | --- | --- | --- |
| Alfabetizacao, Letramento e Tecnologias Digitais | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Gamificacao no Ensino Inclusivo de Surdos | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Gestao Escolar da Educacao Basica | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Psicologia da Educacao | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Desenho Didatico para o Ensino On-line | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Como Produzir Videoaulas | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Mediacao em EaD | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Metodologias Ativas na Educacao | Carga horaria | Nao confirmada no catalogo aberto | Media | Confirmar na ficha oficial | Sim |
| Cursos Mundi/IFSul | URL individual | Tres cursos usam URL do portal ate confirmacao da URL individual | Media | Substituir pela URL oficial individual | Sim |

## Duplicidade

Possivel duplicidade:

- `Estrategias de Metodologias Ativas` - EV.G;
- `Metodologias Ativas na Educacao` - ESKADA/UEMA.

Decisao recomendada:

- manter como cursos diferentes por serem fornecedores distintos;
- relacionar como cursos semelhantes;
- nao mesclar fichas;
- nao destacar ambos simultaneamente ate revisao editorial.

## Procedimento exato para concluir a Fase 05.1

1. Configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF` e `SUPABASE_DB_URL` no ambiente seguro.
2. Criar `supabase-config.js` no deploy a partir de `supabase-config.example.js`, apenas com URL e anon key publica.
3. Aplicar `supabase/migrations/202607280001_curation_pipeline.sql`.
4. Executar consultas de confirmacao das tabelas, indices, RLS e politicas.
5. Aplicar `data/curation_batches/2026-07-28-educacao-lote-001.seed.sql`.
6. Executar o seed uma segunda vez e confirmar que nao duplicou registros.
7. Abrir `curadoria.html#lotes` com usuario curador real.
8. Testar RLS com visitante, usuario comum, curador e administrador.
9. Homologar os nove alertas.
10. Aprovar e publicar somente um item de teste.
11. Confirmar aparicao publica.
12. Despublicar o item e confirmar retirada publica.
13. Testar rollback em ambiente seguro.
14. Restaurar EDU-001 pelo seed.

## Criterio de conclusao

Esta Fase 05.1 ainda nao deve ser considerada concluida em producao porque:

- os registros nao foram persistidos no Supabase remoto;
- as politicas RLS nao foram testadas contra perfis reais;
- o fluxo aprovacao/publicacao/despublicacao nao foi executado no banco real;
- o rollback nao foi validado em ambiente remoto seguro.
