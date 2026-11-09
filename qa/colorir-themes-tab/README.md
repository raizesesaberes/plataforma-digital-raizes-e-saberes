# Colorir e Descobrir: aba própria e temas

Base: 132da48959b5dd9614f11afbcac704747ff1596f.

## Escopo

- Entrada própria do aluno Infantil, com a composição de oito temas já aprovada.
- Tema → desenhos autorizados → pintura → retorno ao mesmo tema.
- Identidade de tema separada da identidade do desenho; permite várias atividades por tema sem trocar a navegação.
- Nenhum desenho novo, alteração de licença, cadastro ou gravação de missão.
- Jogar e Descobrir conserva o renderizador e a apresentação legacy existentes.
- A antiga rota escolar/admin de Colorir continua disponível para os papéis já autorizados.

## Contrato

`mountMission({mode: 'discovery', discoveryLayout: 'themes', root, rpc, sessionIdentity, discoveryAllowed})`

A apresentação usa somente revisões retornadas por `mission_print_catalog_v1`. A abertura revalida a revisão com `mission_print_open_v1`. Troca de identidade, perda de licença/matrícula e alteração de snapshot fecham a atividade. Pintura livre não cria missões, XP nem artwork remoto.

`themeId` é opcional nos novos snapshots. Os oito nomes de tema atuais continuam compatíveis, sem modificar seus hashes. Novas atividades precisam de revisão, arte e hash válidos. Conteúdos novos e novas mecânicas, inclusive contagem além da atividade número 3 atual, dependem de implementação editorial própria.

## Verificação local

- 19 testes de unidade/contratos.
- Suite institucional em Chrome, larguras 1440 e 390, dados e RPCs sintéticos, motores reais.
- Fluxos de professora, planos privados/publicação, persistência de missão, conflito, expiração, troca de conta e licença.
- Temas 0/1/8, duas atividades no mesmo tema, segunda identidade distinta com hash e arte válidos, Ganhar vida, volta ao tema, histórico Back/Forward, cancelamento e toques repetidos.
- Getter e inicializador reais da nova aba, contexto Infantil atrasado, Fundamental sem acesso ao catálogo, perfil EI explícito e links desktop/mobile sem duplicação.
- Isolamento dos motores Studio/Colorir, ACK e falha de salvamento, rejeição de conteúdo adulterado e nenhuma escrita em localStorage.
- Build estático de 5516 arquivos conferidos por SHA-256. Fixtures e evidências de teste ficam fora do build.
- Revisão de código independente e inspeção visual das capturas desktop/mobile.

Limite: testes de navegador não usaram conta autenticada de produção. Não houve alterações de banco nesta entrega.
