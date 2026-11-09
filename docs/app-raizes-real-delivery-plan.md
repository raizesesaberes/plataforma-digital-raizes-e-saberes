# App Raízes: mesma conta e mesmas informações

## Objetivo confirmado

O App web é uma interface móvel da plataforma existente, não uma demonstração nem um produto com cadastro separado. O endereço final previsto é `/app/` no mesmo domínio da plataforma. Essa origem comum permite usar a sessão já estabelecida sem copiar tokens entre domínios. O backend final continua sendo o Supabase de produção existente. A rota ainda não foi publicada ou homologada como entrega.

O projeto Vercel do App pode hospedar o teste protegido. Um hostname de teste diferente não herda o armazenamento de sessão do domínio de produção: o login central e o App precisam existir juntos nesse hostname de teste. Nenhuma transferência de sessão pela URL é permitida.

## Mínimo de integração do acesso

1. Manter o Auth e os vínculos atuais. A consulta agregada de 9 de novembro confirmou perfis ativos compatíveis para os 20 cadastros de aluno já vinculados. Isso não comprova login, licenças, dados ou funcionamento de cada aluno.
2. Adicionar, após revisão e aprovação, somente a consulta do próprio perfil que falta no destino final: `app_get_self_profile()`. Ela filtra pelo UID autenticado, sem SELECT amplo de tabelas nem identificação por email. Ainda não instalada em produção.
3. Não copiar o pacote VALIDATION inteiro para produção. As funções de contexto já existentes em produção, inclusive a correção de identificação aplicada, precisam ser preservadas. O pacote de homologação cria contratos ausentes no template; não é uma migration de promoção do App.
4. Conferir Auth → perfil próprio → vínculo institucional → conteúdo permitido antes de exibir qualquer dado. Testar troca de conta, expiração, acesso revogado, escola/turma errada e retorno ao login.

## Dados compartilhados: diferenças verificadas

- Missão, Colorir e Imprimíveis reutilizam o runtime institucional. Colorir livre permanece temporário; desenho de missão tem persistência própria. Não anunciar salvamento em conta para Colorir livre.
- A Biblioteca oficial da plataforma monta `library-edition-boot.mjs`, com `library_list_editions` e `library-edition-read-access`. O App anterior só chamava `student_get_library_books` e `student-library-read-access`. A integração das edições oficiais está sendo acrescentada; os materiais legados não devem ser substituídos por categorias por inferência.
- `Meus Conteúdos` é outra área. Seu resolver legado suporta questões, não uma lista genérica de livros. Não usar `content_resolve_for_user(BOOK)` como substituto universal.
- O leitor oficial web atual não salva posição de leitura. O leitor mobile legado grava progresso. Reutilizar o leitor oficial não cria automaticamente sincronização de progresso.
- Agenda e notificações possuem recortes de período/quantidade; abrir a notificação hosted ainda não marca leitura. Isso deve ser informado e testado, não tratado como equivalência completa.
- Rotas docentes antigas usavam nomes para selecionar alunos/turmas e uma data visual fixa na chamada. São substituídas em cópia isolada por componentes próprios com IDs e data explícita. O contrato atual de frequência já aceita `expected_updated_at` por registro; usar a definição atual, não o baseline antigo.
- Envio de comunicação não possui chave idempotente no contrato atual. Uma resposta perdida não autoriza retry automático nem confirmação de sucesso.
- A rota legada de acessibilidade fundamental ainda continha conteúdo demonstrativo. Deve ficar fora da entrada hosted até ter comportamento efetivo.

## Homologação sem produto paralelo

As quatro contas e duas escolas fictícias propostas existem somente para testar regras de acesso, inclusive negar dados entre escolas. Não substituem, migram ou duplicam alunos reais. Criação e instalação no primeiro VALIDATION continuam aguardando autorização específica. Não usar o segundo template nem a conta Auth já existente como conta de teste por inferência.

O pacote preparado de sessão e catálogo prova apenas essa fatia. A homologação completa também exige os contratos atuais de edições, assets, Missão, comunicação e operações docentes, sem copiar dados ou segredos reais. Cada recurso precisa de leitura autorizada e, quando aplicável, gravação → releitura → consulta na plataforma, com testes de erro/repetição/concorrência.

## Liberação

- Nenhum App foi publicado por esta frente, e ainda não há link de acesso real validado.
- Revalidar backend, frontend e manifesto do mesmo candidato antes de liberar qualquer endereço de teste.
- Manter flags não homologadas desligadas, sem simular sucesso. Falha de rede/permissão não pode virar lista vazia bem-sucedida.
- Concluir Safari/iPhone e Chrome Android, inclusive retomada, navegação, impressão, pintura por toque e rede interrompida.
- Somente depois coordenar a publicação no domínio existente. Não é necessário contratar nova infraestrutura fixa, mas consumo continua sujeito aos limites dos planos atuais.

Fontes: `mobile/src/services/webSession.ts`, `login.js`, `library-edition-client.mjs`, `library-edition-reader.mjs`, `app-pages.js`, `docs/app-raizes-validation-ready.md` e metadados de funções consultados somente leitura em 9 de novembro de 2026. Nenhum resultado com conta real foi produzido nesta etapa.

## Conferência final local desta etapa

- 82 testes App, 20 testes Missão, TypeScript, histórico e `git diff --check` passaram. Revisão independente revalidou correções de matrícula histórica, guarda global docente e BFCache sem encontrar novo bloqueador de código.
- Export de 42 arquivos e build estático de 5.558 arquivos concluídos após reconectar o iMac. Os 45 hashes dos arquivos App e dos três adaptadores de Biblioteca foram conferidos contra dist, sem divergência.
- Configuração compilada foi preparada exclusivamente para VALIDATION. A configuração fonte de produção, o manifesto baseline, package.json e app.json permaneceram inalterados.
- Os testes de Biblioteca em Chrome local incluíram 10 checks de BFCache simulado, 7 de lifecycle, 9 do leitor e 13 da busca. Não são testes de Auth real ou de Safari físico.
- O smoke visual da interface App integrada não ocorreu nesta rodada: Chrome indisponível no controle, inventário sem navegador e tentativa de abertura expirou. Servidor loopback de QA encerrado; nenhuma conta ou API real foi usada. Retomar a rodada quando Chrome estiver aberto no iMac.
- Nenhum push, deploy do App, instalação em VALIDATION ou conta fictícia criada. A consulta segura do perfil continua sendo dependência pendente no backend final. Ainda não existe endereço de acesso real homologado.
