# Abertura em 2 cenas

Ordem oficial da primeira tela da build:

1. `9k6XOiV-UlozZTSyeEDEX_video_0.mp4` - Cena 01
2. `qUZnfWGxlAMfmh-TvB4YS_video_0.mp4` - Cena 03

Comportamento:

- A abertura reproduz a Cena 01 e depois a Cena 03.
- Ao terminar a Cena 03, a build mantem os ultimos 2 segundos da Cena 03 em loop.
- O botao visual fica dentro do proprio video final.
- A plataforma adiciona apenas um hotspot/click invisivel sobre o botao do video.
- Ao clicar, inicia a Sequencia 02 pos-introducao.

Sequencia 02:

- Video: `wScAhtsi_Gxw8Wmmi1uH1_video_0.mp4`.
- Texto de comando: `TOQUE NA CAIXA PARA FAZER UMA DESCOBERTA!`.
- O texto fica proximo da Bia e nao deve cobrir a caixa.
- Ao terminar o video, a build mantem os ultimos 2 segundos em loop.
- A plataforma adiciona apenas um hotspot/click invisivel sobre a caixa.
- Apos o clique, a Sequencia 03 sera elaborada.

Sequencia 03:

- Disparada apos a crianca clicar na caixa na Sequencia 02.
- Cena 03.1: `BCo6YvvLU2PmMfND_b_4v_video_0.mp4`.
- Cena 03.2: `bls5a3oOCNusVPiGJIfrO_video_0.mp4`.
- Cena 03.3: `URhMToaei3JpQG1PD3oas_video_0.mp4`.
- As cenas rodam em sequencia.
- Ao terminar a Cena 03.3, a build mantem os ultimos 2 segundos em loop ate a proxima etapa ser definida.

Sequencia 04 - acerto do algodao:

- Disparada apos a crianca clicar no card correto `ALGODAO`.
- Cena 04.1: `Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4`.
- Cena 04.2: `1jy891KtSNoTXHJMDoRci_video_0.mp4`.
- Cena 04.3: `c9UROclf_gw-tw2PCeKzM_video_0.mp4`.
- Ao terminar a Cena 04.3, a build mantem os ultimos 2 segundos em loop.
- A composicao final mostra o card do `ALGODAO` no interior do efeito circular de estrelas.
- Texto final: `PARABENS, VOCE ACERTOU!`.
- Botao final: `PROXIMA DESCOBERTA`.
- Ao clicar em `PROXIMA DESCOBERTA`, a build repete a Sequencia 02 pos-introducao.
- A crianca volta a ver o comando para tocar na caixa antes da proxima atividade.
- Depois do novo toque na caixa, os cards devem ser trocados pela proxima atividade cadastrada.

Rodada 02 - pena:

- Pergunta/dica: `É LEVE E FLUTUA`.
- Cards: `FLOR`, `PENA`, `ESPONJA`.
- Resposta correta: `PENA`.
- Ao acertar, a mesma sequencia de cenas de acerto e reutilizada.
- A composicao final troca apenas o card central para `PENA`.
- Texto final: `VOCE ACERTOU!`.
- Botao final: `PROXIMA DESCOBERTA`.

Rodada 03 - estrela:

- Pergunta/dica: `BRILHA COMO UMA CONQUISTA`.
- Cards: `ESTRELA`, `FOLHA`, `FLOR`.
- Resposta correta: `ESTRELA`.
- Ao acertar, a mesma sequencia de cenas de acerto e reutilizada.
- A composicao final troca apenas o card central para `ESTRELA`.
- Texto final: `VOCE ACERTOU!`.
- Botao final: `PROXIMA DESCOBERTA`.
- Ao clicar em `PROXIMA DESCOBERTA` apos a Rodada 03, a build deve entrar na sequencia final.

Sequencia Final - vitoria:

- Disparada apos a crianca clicar em `PROXIMA DESCOBERTA` ao final da Rodada 03.
- Video 01: `Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4`.
- Video 02: `c8lMyZ7f2_S1UDihV5kuc_video_0.mp4`.
- Video 03: `ByCgmsdpl5z7iWWTx13Bj_video_0.mp4`.
- Bia comemorando usa o arquivo presente na build: `tiLYRN3ywobzQneuyTtB3_video_0.mp4`.
- Ao terminar o Video 03, a build mantem os ultimos 2 segundos em loop.
- Texto final: `PARABENS PELA CONQUISTA, CLIQUE NA MEDALHA PRA VER SUA PONTUACAO.`
- A plataforma adiciona um hotspot/click invisivel sobre a medalha.
- Ao clicar na medalha, a build segue para a Cena 04 de pontuacao.

Cena 04 - pontuacao:

- Disparada apos a crianca clicar na medalha da sequencia final.
- Video de fundo: `D_gYXzwTrkNrZ8icCmXPu_video_0.mp4`.
- Quadro central: `painel_pontuacao_premium.png`.
- O quadro deve aparecer no centro da cena, sem botoes HTML visiveis por cima.
- A plataforma adiciona apenas hotspots/clicks invisiveis sobre os botoes ja desenhados na imagem.
- XP conta de `+0` ate `+120`.
- Durante a contagem, estrelas sao espalhadas na regiao de pontuacao.
- Ao final da contagem, o valor fica cravado como `+120` no local da imagem.
- O tempo conta de `00:00` ate `01:45` quando possivel.
- Hotspot `JOGAR NOVAMENTE`: reinicia o jogo.
- Hotspot `TENTAR NOVAMENTE`: reinicia o jogo.
- Hotspot `CONTINUAR`: volta ao site.
- Hotspot `VOLTAR AO SITE`: volta ao site.

Observacao:

- `wScAhtsi_Gxw8Wmmi1uH1_video_0.mp4` foi recebido como Cena 02, mas saiu da abertura por decisao editorial.
