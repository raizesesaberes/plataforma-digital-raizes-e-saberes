# Diagnóstico dos três pageErrors

Causa reproduzida: servidor estático QA de `routing-browser.mjs` rejeitava qualquer segmento iniciado por ponto. O export Expo contém legitimamente o arquivo Feather em `assets/__workspace/.../mobile/node_modules/.pnpm/.../Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf`. O arquivo exportado existe e tem 55.596 bytes. O segmento `.pnpm` disparava o guard e devolvia404; o carregamento FontFace gerava `A network error occurred.` sem stack.

Uma ocorrência em cada entrada:

- `http://127.0.0.1:58138/` — App.tsx real, tela de login e ícones.
- `http://127.0.0.1:58138/?mode=shell&actor=1` — AppShell real professor, ícones.
- `http://127.0.0.1:58138/?mode=shell&actor=2` — AppShell real aluno, ícones.

A URL COMPLETA do recurso, erros e status antes da correção estão em `routing-network-before.json`. Não eram os503 de Auth nem falhas das RPCs de avaliação/comunicação.

## Correção e regressão

Apenas o host QA Expo passou a aceitar arquivos presentes no inventário do diretório EXPORTADO. Caminho continua limitado ao root exportado, extensões permitidas e arquivos regulares (sem seguir symlinks); nenhum acesso ao node_modules real é servido. O host web do checkout continua rejeitando dotfiles. Restrição de rede para loopback preservada; nenhum EROFS contornado. Nenhum arquivo de runtime, Auth, SQL ou configuração de produção foi modificado.

A rodada focada `node qa/fase3/integration-run.mjs --routing-only` exige três respostas200 de fonte e `pageErrors=[]`, além dos sete checks de navegação existentes. Resultado: **8 PASS, zero pageErrors**, registrado em `routing-results.json`. Não foi repetida a suíte total de contratos/FASE3.

## Outras falhas de rede, classificadas

| Recurso | Observação | Classificação |
|---|---|---|
| `http://127.0.0.1:58138/auth/v1/token?grant_type=password` | 503 no login Expo | Negativo esperado: Auth local não instalado; UI permanece desautenticada |
| `http://127.0.0.1:58139/auth/v1/token?grant_type=password` e `/auth/v1/logout` | 503 no web | Negativos esperados; login nega e logout limpa sessão local. Não valida revogação de sessão no Auth real |
| `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&display=swap` | ERR_FAILED em login/professor web | Bloqueio externo deliberado do Playwright, mantido. Não é a causa dos três pageErrors Expo |
| `http://127.0.0.1:58139/rest/v1/xp_records?...` e `/rest/v1/student_medals?...` | 403 em páginas do aluno | Negação REAL da fixture: has_table_privilege(authenticated, ..., SELECT)=false para ambas. Consultas de gamificação legada fora da fatia; nenhum grant/policy alterado. Não homologa esse módulo em produção |

URLs completas, fluxo/página, tipo de recurso, status e mensagens de console estão no JSON. Não se afirma ausência de respostas HTTP de erro, apenas ausência de erros NÃO TRATADOS de página após corrigir a fonte.

## Distribuição e handoff

Build estático novamente verificado:4277 arquivos. `dist-verification.json` confirma ausência de SQL, QA, tests, fixtures, supabase, scripts, mobile, backups e fontes TS/TSX/Python/Markdown. O handoff e suas referências operacionais estão rastreados no PR6 e fora do dist.

`MAC_HANDOFF.md` separa explicitamente aprovação da instalação SQL (pacote, ledger, ACLs, hashes, preflights e recuperação) de autorização do runtime/gates (backend comprovado, SHAs, login/sessões, smoke e rollout coordenado). Login bem-sucedido oficial e nativos permanecem pendentes; gates de produção continuam desligados.
