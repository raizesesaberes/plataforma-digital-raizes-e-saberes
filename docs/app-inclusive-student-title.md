# Título inclusivo do App Raízes

Correção mínima sobre 89d114f, em 10/11/2026.

- O título do ambiente genérico do estudante agora é “Da Educação Infantil ao Ensino Médio”. A home usa o título centralizado em appProfiles, acima da saudação.
- Os rótulos EDUCAÇÃO INFANTIL e AMBIENTE DA PROFESSORA permanecem específicos. Não houve alteração de roles, segmentos, vínculo, seleção automática, autenticação, licenças ou layout.
- AppShell continua passando o título para AppHeader. O componente AppHeader atualmente não renderiza subtitle, portanto não se adicionou esse elemento aos submódulos.
- Beta real somente leitura preservado. Backend, menu global, login global, configuração e permissões não foram alterados.

## Verificação

129 testes App (incluindo dois testes novos de render com dependências sintéticas), 20 Missão, histórico, TypeScript e 32 negativos/regressões independentes passaram. Export com --read-beta, manifesto e build estático passaram.

Chrome local: a home sintética mostrou o título completo em 320 e 390 px. Texto medido em 259,0625 × 12 px; scrollWidth igual à largura nas duas telas, sem overflow. Os perfis sintéticos Infantil e docente conservaram seus rótulos próprios e navegação. Console sem warnings/errors. Não foram usados dados nem credenciais reais. Submódulo Perfil continuou sem subtítulo, conforme layout existente.

Artefato runtime: 5.559 arquivos; frente à produção 89d114f, 5.557 idênticos, apenas app/index.html e substituição do bundle. app-pages.js, login.js, login.html, supabase-config.js, build-mode.json e platform-runtime.js idênticos. Nenhum teste, fixture ou relatório entra no runtime.

Esta correção não demonstra homologação completa, isolamento entre escolas/contas nem dispositivos físicos; não amplia as funções do beta.
