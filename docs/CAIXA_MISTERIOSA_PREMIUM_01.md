# Caixa Misteriosa Premium 01

## Capitulo 01 - Tela Inicial

Build criada em `caixa-misteriosa-premium-01.html`.

## Camadas

1. Background PNG: `background_sala_descobertas_master.png`
2. Video Ambiente: `D_gYXzwTrkNrZ8icCmXPu_video_0.mp4`
3. Magic Ambience: `wklNA0P4IIjwrJ5E_ewud_video_0.mp4`
4. Logo: `logo_caixa_misteriosa.png`
5. Caixa: `magic_box_master.png`
6. Video Idle: `6bb33AISm260APF4RUNlQ_video_0.mp4`
7. Bia: `bia_borboleta_master.png` + `Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4`
8. Balao: texto HTML `VAMOS BRINCAR DE DESCOBRIR?`
9. Botao: `btn_comecar_premium.png`

## Clique em Comecar

Ao clicar em Comecar, a build executa `1jy891KtSNoTXHJMDoRci_video_0.mp4` antes de liberar a tela da caixa.

## Capitulo 02 - Entrada da Experiencia

Fluxo implementado:

1. Clique em Comecar executa Magic Touch FX.
2. Botao desaparece.
3. Logo sobe e faz fade.
4. `1jy891KtSNoTXHJMDoRci_video_0.mp4` roda em tela cheia.
5. Depois do fade, entram background, video ambiente e Magic Ambience.
6. Entram caixa e video idle.
7. Entra Bia idle.
8. Bia fala com `HZNe_8LcOOKR37DtdvjC__video_0.mp4`.
9. Balao mostra `TOQUE NA CAIXA PARA FAZER UMA DESCOBERTA!`.
10. Somente entao o clique na caixa e liberado.

## Capitulo 03 - Toque na Caixa

Sequencia implementada no toque:

```text
bls5a3oOCNusVPiGJIfrO_video_0.mp4
↓
ByCgmsdpl5z7iWWTx13Bj_video_0.mp4
↓
c8lMyZ7f2_S1UDihV5kuc_video_0.mp4
↓
c9UROclf_gw-tw2PCeKzM_video_0.mp4
```

Os cards nao aparecem antes da abertura. Depois da abertura, Bia orienta com `URhMToaei3JpQG1PD3oas_video_0.mp4`, aparece o painel da dica e o botao `OUVIR DICA`; depois entram os tres cards com fade, scale e respiracao leve.

## Capitulo 04 - Escolha

Resposta correspondente:

```text
Card sobe
↓
Magic Touch
↓
Star Burst
↓
Bia Celebrating
↓
MUITO BEM!
↓
PROXIMA DESCOBERTA
```

Resposta nao correspondente:

```text
Card vibra
↓
Volta
↓
Bia Encouraging
↓
VAMOS DESCOBRIR JUNTOS?
↓
OUVIR DICA
↓
TENTAR NOVAMENTE
```

## Capitulo 05 - Tela Final

Fluxo implementado:

1. `YgBq_0BZUE0gxHvqrYrb-_video_0.mp4`
2. `painel_vitoria_premium.png`
3. `medalha_pequeno_explorador.png`
4. XP em HTML
5. Bia
6. Tito
7. Pipo
8. Botoes `JOGAR NOVAMENTE`, `CONTINUAR`, `VOLTAR AO SITE`

## Pendencias

- `tiLYRN3ywobzQneuyTtB3_video_0(1).mp4` foi definido como oficial para Bia Celebrating, mas o arquivo presente e `tiLYRN3ywobzQneuyTtB3_video_0.mp4`. Aguardando confirmacao do usuario.
