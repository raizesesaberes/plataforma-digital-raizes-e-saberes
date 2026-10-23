ENGENHARIA20 — diagnostico isolado, preparacao local somente.
Documento vigente: oidc-readonly-single-account-INSTALL.txt.
Politica vigente: oidc-readonly-single-account.policy.json.
Ambiente exclusivo enem-oidc-readonly; enem-ingest reservado sem autoaprovacao.
Workflow: .github/workflows/enem-oidc-readonly.yml; somente push da branch canonica com paths diagnosticos, gate humano e SHA esperado antes do JWT.
GET somente; sem banco, publicacao, releases ou recibos.
Teste offline: node --test ingestion/review/oidc-readonly.test.mjs
Nao instalar, executar ou configurar regras remotas sem autorizacao separada.
Propostas anteriores continuam acessiveis no historico; nao aplicar instrucoes antigas da Engenharia19.
