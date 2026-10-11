# Checkpoints de metadados do pacote — revisão, NÃO autorização

`index.json` fixa SHA256 de cada fonte SQL, consulta readonly e snapshot. Cinco manifests completos e independentes, limitados às dependências/funções e14 relações relevantes à proposta (não ao banco inteiro):

| Checkpoint | Momento | Funções / tabelas | Ledger exigido separadamente |
|---|---|---|---|
| 00_before | Antes PR2 | 27 / 10 | Original149, quatro versões ausentes |
| 01_after_pr2 | Após PR2 / antes PR3 | 29 / 10 | Original149 +60001 =150 |
| 02_after_pr3 | Após PR3 / antes PR4 | 33 / 11 | Original149 +60001/2 =151 |
| 03_after_pr4 | Após PR4 / antes PR1 | 37 / 13 | Original149 +60001/2/3 =152 |
| 04_after_pr1 | Pós-instalação | 46 / 14 | Original149 +60001/2/3/4 =153 |

São metadados obtidos no Postgres17 sintético, sem dados pessoais ou ledger fabricado. O checkpoint inicial precisa ser confrontado por leitura com o ambiente alvo: não atesta o estado atual de produção. Divergência exige revisão específica, nunca atualização automática dos hashes para fazê-la passar.

## Cobertura

- Funções: assinatura, MD5 corpo/definição, proprietário, SECURITY DEFINER, GUC/search_path, ACL e EXECUTE efetivo para anon/authenticated/service_role. Inclui funções privadas de contratos, não apenas as15 proteções FASE3.
- Tabelas: RLS/forceRLS, ACL, privilégios efetivos por papel, colunas/tipos/defaults/not-null/ACL de coluna, policies (papéis, USING/WITH CHECK, comando), constraints, índices e triggers.
- Schemas: proprietário/ACL e USAGE/CREATE efetivos. Tabelas novas de respostas, versões, recibos e alvos contratuais têm RLS=true, policies vazias e privilégios diretos=false para os três papéis, no snapshot final.
- Não valida usuários/contratos reais, volumes, performance/locks em produção, configuração da API, funções/tabelas fora do escopo, Auth ou ledger remoto. Esses limites permanecem no procedimento coordenado.

## Capturar e comparar, somente leitura

`supabase/review/package_metadata_readonly.sql` retorna UM objeto JSON apenas de catálogos, dentro de transação READ ONLY finalizada em ROLLBACK. Executá-la apenas na conexão/ambiente aprovado e salvar o valor JSON em arquivo local restrito, sem credenciais. Comparador offline:

```
node qa/fase3/verify-release-stage.mjs 03_after_pr4 /caminho/local/metadados.json
```

O comparador valida SHA dos artefatos e igualdade estrutural, inclusive objetos faltantes/extras dentro do escopo. Não se conecta a nenhum banco, não escreve ledger e falha com o nome dos objetos divergentes. Se tudo coincide, ainda é obrigatório conferir ledger e preflight interno do próximo SQL. Não executar a próxima etapa se qualquer checkpoint falhar.

`supabase/review/package_versions_readonly.sql` lista as quatro versões propostas e retorna ABSENT_NOT_RESERVED, PRESENT_NAME_MATCH_REQUIRES_METADATA_CHECK ou CONFLICT_STOP; também verifica original149/count/max/hash, nomes exatos, prefixo sem lacunas e total. Nunca considerar só count ou nome como prova do conteúdo aplicado. Versões60001–60004 não estão reservadas por uma SELECT: a reserva é apenas proposta documental, depende de coordenação e releitura imediatamente antes de cada etapa para detectar concorrência.

O preflight d5c4... anterior continua inalterado. O pacote completo requer esta verificação adicional de tabelas/ACL em cada etapa; não se deve reduzir o gate de instalação ao preflight antigo de funções.

## Evidência local

`node qa/fase3/integration-run.mjs --manifests-only` recria somente o banco descartável, aplica as quatro propostas com os guards originais e captura os cinco estados. Não cria ledger, não inicia PostgREST e não repete as suítes de jornadas. Os cinco snapshots passaram no comparador. Controles negativos em cópias JSON locais (RLS=false e SELECT autenticado indevido) foram rejeitados. Nenhuma ACL real foi alterada nesses controles.

## Mecanismo oficial e autorização

No Mac, usar CLI oficial já prevista no handoff: conferir `supabase --version` e `--help`; criar arquivos com `supabase migration new`, e ensaiar aplicação com `supabase migration up --local` em laboratório isolado. O comando aplica migrations pendentes: o diretório de release deve ter somente a próxima etapa aprovada pendente antes de cada checkpoint, nunca a sequência inteira sem pausas. Ver [referência oficial migration new](https://supabase.com/docs/reference/cli/supabase-migration-new) e [migration up](https://supabase.com/docs/reference/cli/supabase-migration-up).

Se a CLI gerar timestamps diferentes dos propostos, reservar/revisar os NOVOS pares e regenerar/aprovar o pacote de hashes/preflight ANTES de instalar. Não renomear furtivamente, inserir ledger à mão ou usar repair. A variante ligada ao projeto remoto só pode ser escolhida pelo operador após autorização ESPECÍFICA; este checkpoint não fornece essa autorização. As consultas readonly podem ser executadas pelo cliente PostgreSQL oficial com conexão somente leitura; se a CLI instalada expuser uma consulta SQL, confirmar seus argumentos via help. Não instalar alternativas nem contornar EROFS neste executor.

**SQL instalado já torna RPCs invocáveis conforme ACL, mesmo com gates UI OFF.** Revisão de autorização de backend e escopo administrativo precede instalação. Liberação do runtime/gates é decisão separada, com login/refresh real, smoke por papel, versão de cliente e rollout coordenado. Auth/refresh oficiais, nativos e homologação humana continuam pendências de ambiente/humanas.
