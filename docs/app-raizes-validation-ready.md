# App Raízes: preparação de homologação

Estado em 9 de novembro de 2026: implementação local revisada; nenhum deploy do App ou instalação no VALIDATION foi realizado.

## Recursos existentes

- Destino proposto: RS-SCHOOL-TEMPLATE-V1-VALIDATION (`fpzvkyoxsnhxalibdqpm`), preservando sua conta Auth, documentos e Edge. Não usar o segundo template nem produção para fixtures.
- Projeto frontend existente: Vercel `app-raizes-e-saberes`. O preview deverá manter a proteção atual e servir login e `/app/` na mesma origem.
- A chave publishable ativa já existente foi reutilizada localmente; nenhuma chave, conta, instância ou assinatura foi criada.
- A configuração original de produção continua intacta. O pós-build `prepare-app-validation.mjs` valida o destino, recusa ambiente production e altera somente a configuração compilada em dist.

## Código e verificações

- Login do App confirma Auth, identidade e perfil próprio antes de guardar a sessão. Email e código institucional continuam suportados no código. O papel salvo é o verificado pelo servidor; o JWT não é reescrito.
- Retornos externos, esquemas e codificações perigosas são recusados. O retorno do App é `/app/`, sem transportar tokens ou estado pela URL.
- Ajuste Colorir `4e91990` incorporado localmente, preservando os jogos e removendo a galeria duplicada do hub antigo.
- 60 testes App, 20 unitários Missão, suíte de histórico e build de 5.558 arquivos passaram. O pacote contém 42 arquivos do App.
- Revisão SQL independente `INDEP-APP-VALIDATION-20261109-R1`: 8 grupos sintéticos passaram; 19 verificações do pacote foram reexecutadas independentemente. Login: 12 testes na revisão final.

## Etapa de banco preparada, ainda não executada

1. Sessão: três funções novas, filtradas pelo UID autenticado.
2. Catálogo: cinco funções novas, uma tabela de disponibilidade e três colunas opcionais em books.

Nenhuma função, constraint ou permissão de tabela existente é substituída. O pacote verifica ausência de colisões, fingerprint dos objetos preservados, permissões e contagens antes/depois. Cada fase é transacional. A desativação preparada revoga somente as novas APIs, mantendo esquema e quaisquer dados posteriores. Não é uma desinstalação física.

## Aprovação e testes pendentes

- Aprovação específica para instalar o pacote restrito e criar quatro contas fictícias no VALIDATION: Infantil A, Fundamental A, Professora A e Fundamental B, com duas escolas de teste e livros sintéticos. Preservar a conta Auth existente. Credenciais somente em fluxo seguro, sem chat ou repositório.
- Email está habilitado com confirmação exigida; anonymous está desligado. Não alterar essas configurações. A criação administrativa confirmada não deve enviar mensagens para endereços fictícios.
- Real Auth/PostgREST, sessão nos três perfis, negativas entre escolas e conteúdo autorizado precisam ser exercitados após a preparação.
- O VALIDATION não possui a Edge de login institucional. Preservar o suporte no código não comprova esse fluxo real no ambiente de teste.
- Catálogo desta etapa é somente metadados: sem PDF, páginas assinadas, Storage, progresso/XP, Missão ou rotinas docentes completas. Não anunciar paridade completa.
- Safari/iPhone e Chrome Android físicos, retomada, orientação, impressão, rede interrompida e fluxos de gravação continuam pendentes.

Não promover o pacote atual para produção: a nova dependência `app_get_self_profile()` ainda precisa ser instalada e homologada no destino adequado. Os projetos usam a estrutura contratada; consumo permanece sujeito aos limites dos planos existentes.
