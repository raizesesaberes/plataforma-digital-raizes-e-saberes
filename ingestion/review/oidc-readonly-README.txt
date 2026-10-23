ENGENHARIA16 — SOMENTE PREPARACAO. Arquivos preparados em commit local; nada instalado no GitHub, nenhum workflow executado, nenhum token gerado, nenhuma regra remota aplicada.

ENTREGAVEIS
- enem-ingest.yml: futuro destino .github/workflows/enem-ingest.yml, job exclusivamente diagnostico.
- oidc-readonly.mjs: futuro destino ingestion/review/oidc-readonly.mjs. Reutiliza o verificador OIDC do commit28abd13, conferindo SHA256 do arquivo original antes de importa-lo. Nao e importador ou novo gateway.
- oidc-readonly-environment.rules.json e oidc-readonly-trusted-source.preview.json: especificacoes de revisao, NAO payloads executaveis da API. Contem campos PENDING que precisam de decisao humana e SHA futuro revisado.
- Validacao offline registrada nos entregaveis da Engenharia16; repetir sintaxe/guardas antes de qualquer publicacao.

DECISOES DE ESCOPO
Ambiente GitHub: enem-ingest. Vercel: Preview do projeto prj_zMBoQQzFm4iGMX1pnBRpl9HvcNyI, equipe team_DxW95pOlpbyKV4ZWtde17x47. Repositorio/owner IDs, branch e workflow_ref exatos nas regras.
Issuer https://token.actions.githubusercontent.com. Audience EXCLUSIVA DO TESTE: urn:rs:enem-oidc-readonly:jaesjldrbjbdmzzggxzw:preview.
Esta audience e diferente da audience canonica de ingestao urn:rs:enem-ingest:jaesjldrbjbdmzzggxzw. O banco impoe a audience canonica aos releases, portanto o JWT deste teste nao deve ser aceito como JWT de ingestao. Nao trocar audiences como atalho.
O teste chama verifyOIDC com trust local revisado para audience readonly; NAO consulta trust do Supabase e NAO aprova um release. Prova assinatura/identidade/tempo do emissor real e, separadamente, acesso externo Vercel; nao prova autorizacao de ingestao do endpoint.

COMPORTAMENTO DO WORKFLOW FUTURO
Somente evento push na branch service/enem-ingestion-worker; somente mudancas nos dois arquivos diagnosticos disparam o job. Nao usa pull_request, pull_request_target, schedule, workflow_dispatch ou workflow_run.
Permissoes globais vazias. Job: contents read e id-token write. Esta ultima permite emitir JWT numa FUTURA execucao autorizada; preparar os arquivos nao emite tokens.
Environment obrigatorio enem-ingest com revisao humana independente, self-review bloqueado, bypass de administradores desabilitado e branch selecionada literal (nao wildcard/protected-branches-only).
Primeiro passo exige ENEM_OIDC_READONLY_EXPECTED_SHA valido e identico a GITHUB_SHA e GITHUB_WORKFLOW_SHA, antes de qualquer pedido JWT. Variavel ausente ou placeholder falha. O SHA do workflow futuro NAO e automaticamente28abd13, porque instalar estes arquivos cria novo commit. Esse novo commit precisa de revisao propria.
Checkout e setup-node fixados por SHAs oficiais conferidos por leitura de tags publicas; persist-credentials false, sparse-checkout restrito; Node24; nenhum npm install, segredo, service_role, Vercel CLI, banco ou deploy no workflow.
Uma unica requisicao JWT, guardado em memoria. Sem imprimir token, claims completos, respostas, IDs jti, URLs de redirecionamento, comandos com token ou artefatos de autenticacao. Sem outputs de workflow para token e sem upload-artifact/cache.
Sonda HTTP: GET sem token como controle negativo; depois GET no MESMO endpoint fixo com x-vercel-trusted-oidc-idp-token. Sem Authorization da aplicacao, POST, corpo, manifesto, redirect-follow ou retentativa. Esperado405 da aplicacao apos protecao externa; no runtime aprovado, GET e recusado antes de criar pool.
Qualquer retorno inesperado falha com mensagem constante e para. Nao chamar submit-approved, dispatcher, acquire/process_item/progress/execute ou RPC alguma. Nao criar releases ou recibos.
Trusted Sources nao limita metodo HTTP/caminho dentro do projeto: sua barreira e projeto/ambiente/claims. A restricao GET e do diagnostico revisado; a audience distinta e a autenticacao da aplicacao continuam necessarias. Nao apresentar a regra Vercel como ACL de GET.

ORDEM FUTURA — NAO EXECUTADA
1. Confirmar repositorio/visibilidade/plano e suporte as protecoes. Escolher ID de pessoa/equipe revisora com acesso e diferente do iniciador. Se required reviewers, prevent self-review ou bloqueio de bypass nao estiverem disponiveis, parar; nao substituir por ambiente sem protecao.
2. Autorizar separadamente e criar ambiente protegido ANTES de instalar workflow. GitHub pode criar automaticamente um ambiente ausente sem regras; isso nao e aceitavel. Sem secrets de banco ou tokens no ambiente. A variavel publica de SHA so sera preenchida apos existir o commit futuro revisado.
3. Revisar/autorizar instalacao dos dois arquivos, preservando guardas Vercel da branch. Nao misturar com deployment da plataforma, ativacao runtime ou mudancas editoriais. Registrar SHA novo e hashes dos arquivos. A primeira execucao deve permanecer aguardando revisao ou falhar no SHA ausente, nunca obter token automaticamente.
4. Apos revisao do commit novo, preencher ENEM_OIDC_READONLY_EXPECTED_SHA com esse SHA e configurar Trusted Source raw claims com o MESMO sha/workflow_sha. Preview somente; issuer/repository/IDs/ref/environment/workflow_ref/audience/event/runner conforme JSON. Se UI/API nao aceitar alguma restricao exigida, parar antes de aplicar; nao omitir silenciosamente.
5. Revisar os valores salvos por leitura. Regra habilitada amplia acesso externo somente para a identidade delimitada; requer autorizacao humana especifica. Preservar Standard Protection e as outras regras existentes; nao criar bypass secret nem habilitar Production/Development.
6. Autorizar UMA execucao do diagnostico e aprovar o job no ambiente. Se necessario usar rerun do evento push revisado (nao workflow_dispatch, recusado pelo verificador). Nao conceder aprovacao presumida. Confirmar o evento/SHA na tela de aprovacao.
7. Exigir assinatura/scope PASS e GET405; conter qualquer resultado inesperado sem repetir automaticamente. Auditoria separada confirma releases/runs/leases/receipts ainda0, NOLOGIN e Preview inativo. Nao liberar ingestao apos esse teste.

LIMITACOES/DEPENDENCIAS
Revisor e SHA futuro pendentes; nao inventados. O schema JSON e especificacao humana, nao foi enviado a GitHub/Vercel.
O Preview fixado e https://enem-ingestion-worker-hj3ok2d8b-raizesesaberes.vercel.app/api/ingest, deployment dpl_G7c93gVj7v2yxrfZuPz6MGwq2gtu. Se mudar deployment/URL, exigir nova revisao; nao usar wildcard ou dominio Production.
Um job que referencia ambiente pode gerar registros de deployment/status NO GITHUB como mecanismo de aprovacao; nao e deployment Vercel nem release Supabase. Nada disso ocorreu nesta missao.
Sem execucao real de OIDC, acesso de maquina ou PostgreSQL; os testes atuais foram somente offline. NOLOGIN, configuracao de banco e catalogo de releases nao foram alterados.

FONTES OFICIAIS
https://docs.github.com/en/actions/reference/security/oidc
https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources
