# Revisão local P1 + P2 do provisionamento Auth

Branch: `review/auth-access-rpc-validation`.
Base original/HEAD: `bf27b8c4c69de4a128a4ae725482fb25da4cf5cf`.
Pai: `01ab6ec1ecd361efd8a9d5ec0981000bd0b3d302`.
Não há novo commit, publicação ou aplicação remota.

O commit base foi reconstruído exatamente a partir do patch revisado. Os três
arquivos coincidem em tamanho, SHA256 e blob Git com os hashes transmitidos do
ZIP `libfile_fc609df59cd081918992113f33de106b`, versão 0. O ZIP não foi lido neste
executor. As duas migrations originais e o app mobile permanecem intactos.

## P2

O handler exige `ok: true`, três booleanos e três identificadores UUID/null.
Flags de e-mail e vínculo coincidem com a presença dos IDs; a flag de órfão
coincide com Auth do alvo existente e distinto do vinculado. UUIDs precisam de
36 caracteres e são comparados sem distinção de caixa. Auth vinculado sem
metadata, vinculado igual ao alvo e vinculado coexistindo com outro órfão são
respostas válidas. Campos adicionais da RPC são aceitos; perfil/membership não
se tornam novos bloqueios. Resposta incompatível, erro ou Promise rejeitada
bloqueiam antes de `createUser`, mantendo prioridades existentes.

## Nova migration P1

`20261009152555_admin_auth_access_claims_compatibility.sql` foi gerada com
`supabase migration new`, CLI oficial 2.81.3 com checksum verificado.
Ela exige a existência da RPC e ACL compatível antes de substituir sua definição.
`CREATE OR REPLACE` preserva owner e ACL. Não adiciona grants ou bypass por
`current_user`. Conserva SECURITY DEFINER e usa search_path `pg_catalog, pg_temp`;
todas as tabelas consultadas já têm schema explícito.

O trecho de validação institucional, consultas e construção da resposta é
idêntico ao da segunda migration original. Apenas a leitura/validação das
claims e search_path mudaram na função:

- JSON moderno presente deve ser objeto com role string exatamente service_role.
- JSON malformado, null, array, scalar, role ausente/inválida ou conflito com
  legado negam acesso. JSON inválido nunca cai no fallback.
- Fallback legado somente com configuração JSON ausente ou vazia (GUC resetada
  entre transações). Whitespace não conta como ausência.
- Claim legada simultânea não vazia deve coincidir com a role JSON.

## Execução isolada e resultados

```sh
node --test tests/auth-access/duplicate-response.test.mjs
python3 tests/auth-access/claims-compatibility.py
python3 tests/auth-access/claims-http.py
```

Node 24 usa somente módulos nativos. O harness lê o index.ts real, remove apenas
o import conhecido do SDK, apaga tipos e chama o handler capturado por Deno.serve.
Clientes/env/rede são substituídos por fixtures. Não lê .env, não importa SDK e
proíbe rede. Stripping de tipos não é typecheck.

**P2: 74/74 PASS.** 60 respostas inválidas, dois erros RPC, três caminhos livres,
sete conflitos, prioridade de aluno vinculado e campos extras reais. Os casos
livres param deliberadamente em mock de createUser com 502 sintético; não
homologam persistência, envio de senha, compensação ou concorrência.

**SQL: 10 cenários originais + 30 corrigidos + 3 pré-condições PASS.** Claims
JSON/legadas/ausentes/vazias/malformadas/contraditórias e tipos inválidos são
cobertos; anon/authenticated e owner sem claim não passam. Orfão infinity mantém
prioridade e banimento. Base ausente, ACL aberta a anon e grant técnico ausente
fazem a migration falhar sem vazamento de alterações. Owner, ACL e SECURITY
DEFINER são preservados, search_path seguro é verificado.

**HTTP real local: PASS.** PostgREST 16.4 + PostgreSQL 17.11, rede Docker interna,
sem portas publicadas, DB tmpfs e JWT sintético. O probe HTTP confirma
json_role=service_role, legacy_role=null e effective_role=service_role.
RPC original retorna 403/42501/SERVICE_ROLE_REQUIRED; SQL legado passa na mesma
função. Após P1, HTTP retorna 200 com resposta exatamente igual à original livre.
Anon permanece 401/42501 e authenticated 403/42501 por permissão negada.
Vínculo + órfão infinity retorna 200 com flags de conflito corretas, sem mutação.
Snapshots confirmam que a migration altera apenas a definição esperada, sem
mudar owner/ACL/dados; chamadas HTTP não alteram definição, ACL ou fixtures.
Containers, volumes e rede são removidos ao final. Não há Supabase remoto.

Runners Docker exigem imagens oficiais já presentes, sem download automático:

- PostgreSQL: `postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`
- PostgREST: `postgrest/postgrest@sha256:d155c6718ed9a9f990d159a2ab7c0a3f16944dbb6d0a0344557421042acfe0df`

## Typecheck e limites

Deno check falhou com os mesmos 56 diagnósticos na base original e no P2 final.
Comparação por conteúdo completo, trecho, arquivo, coluna e linha mapeada: zero
novos/removidos. Nenhum erro no validador/try-catch novo; o fail(adminClient,...)
retém erro herdado. SDK 2.57.4; imagem Deno
`denoland/deno@sha256:8ce780168429c4bf5962652e6cbea3fd45254ae902069e90585fb33f74c56968`.
O TypeScript P2 não mudou na etapa P1 (mesmo blob), portanto o resultado continua
válido sem repetir typecheck. Não há aprovação global de tipos.

Histórico de falhas recuperadas: cache npm sem diretório e DNS no instalador CLI
(resolvidos com download oficial/checksum); corrida de inicialização PostgreSQL
(corrigida no runner); expectativa HTTP anon 403 corrigida para 401; CA Deno
corrigida usando bundle do ambiente, sem desabilitar TLS.

Antes da publicação controlada: revisão da nova migration, conferência autorizada
de definição/ACL/owner/versões no alvo e aprovação separada para aplicar migration
e publicar a Edge Function. O alvo e a criação real continuam não testados.
Não chamar a Edge Function para uma prova sem escrita: erros podem gravar auditoria.
Uma prova remota futura, autorizada, pode chamar somente a RPC revisada com alvo
sintético inexistente e confirmar TARGET_NOT_FOUND após autenticação.
Monte Verde, AUTH_B, contrato/entitlement T3 e três questões deliberadas não foram
consultados ou alterados. Concorrência/compensação herdadas permanecem fora do escopo.
