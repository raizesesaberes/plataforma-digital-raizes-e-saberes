# Mapeamento Oficial dos Videos

Nao renomear os arquivos.

Os nomes abaixo passam a ser a referencia oficial de utilizacao dentro do jogo.

| Arquivo recebido | Funcao oficial | Estado |
| --- | --- | --- |
| `1jy891KtSNoTXHJMDoRci_video_0.mp4` | Introducao cinematografica | Intro |
| `D_gYXzwTrkNrZ8icCmXPu_video_0.mp4` | Ambiente da Sala das Descobertas | Background |
| `6bb33AISm260APF4RUNlQ_video_0.mp4` | Caixa em repouso | Box Idle |
| `BCo6YvvLU2PmMfND_b_4v_video_0.mp4` | Respiracao da caixa | Box Breathing |
| `bls5a3oOCNusVPiGJIfrO_video_0.mp4` | Reacao ao toque | Box Touch |
| `ByCgmsdpl5z7iWWTx13Bj_video_0.mp4` | Tremor da caixa | Box Shake |
| `c8lMyZ7f2_S1UDihV5kuc_video_0.mp4` | Brilho magico da caixa | Box Glow |
| `c9UROclf_gw-tw2PCeKzM_video_0.mp4` | Abertura da caixa | Box Opening |
| `wklNA0P4IIjwrJ5E_ewud_video_0.mp4` | Ambiente magico (particulas) | Magic Ambience |
| `Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4` | Bia parada | Bia Idle |
| `HZNe_8LcOOKR37DtdvjC__video_0.mp4` | Bia falando | Bia Speaking |
| `QatqMiXYgaWk2vlCoikJx_video_0.mp4` | Bia incentivando | Bia Encouraging |
| `URhMToaei3JpQG1PD3oas_video_0.mp4` | Bia orientando | Bia Talking |
| `tiLYRN3ywobzQneuyTtB3_video_0(1).mp4` | Bia comemorando | Bia Celebrating |
| `YgBq_0BZUE0gxHvqrYrb-_video_0.mp4` | Tela de Vitoria | Victory Animation |

## Ordem obrigatoria de execucao

### Tela Inicial

```text
1jy891KtSNoTXHJMDoRci_video_0.mp4
↓
D_gYXzwTrkNrZ8icCmXPu_video_0.mp4
↓
6bb33AISm260APF4RUNlQ_video_0.mp4
↓
BCo6YvvLU2PmMfND_b_4v_video_0.mp4
↓
Hh-6tytYNKGPrmAK8EJ_g_video_0.mp4
```

### Toque na caixa

```text
bls5a3oOCNusVPiGJIfrO_video_0.mp4
↓
ByCgmsdpl5z7iWWTx13Bj_video_0.mp4
↓
c8lMyZ7f2_S1UDihV5kuc_video_0.mp4
↓
c9UROclf_gw-tw2PCeKzM_video_0.mp4
```

### Durante as rodadas

Sempre manter em loop:

```text
D_gYXzwTrkNrZ8icCmXPu_video_0.mp4
+
wklNA0P4IIjwrJ5E_ewud_video_0.mp4
```

Durante as falas da Bia:

- `HZNe_8LcOOKR37DtdvjC__video_0.mp4`
- `QatqMiXYgaWk2vlCoikJx_video_0.mp4`
- `URhMToaei3JpQG1PD3oas_video_0.mp4`

Conforme o contexto.

### Tela Final

```text
YgBq_0BZUE0gxHvqrYrb-_video_0.mp4
↓
tiLYRN3ywobzQneuyTtB3_video_0(1).mp4
```

A animacao da vitoria inicia primeiro e, em seguida, a Bia comemora.

## Regra definitiva para o Codex

Estes arquivos sao considerados assets oficiais do projeto. O Codex deve utiliza-los exatamente conforme este mapeamento. Caso algum video nao se encaixe perfeitamente na Build 01, nao substitui-lo por outro video nem criar uma animacao alternativa. Manter o arquivo original e registrar a divergencia para analise na homologacao.

## Pendencia de arquivo

O arquivo `tiLYRN3ywobzQneuyTtB3_video_0(1).mp4` foi definido como oficial para `Bia Celebrating`, mas nao foi encontrado em `/Users/danielhenrique/Downloads` nem em `assets/builds/caixa-misteriosa-premium-01/videos`.

Arquivo encontrado com nome semelhante:

- `tiLYRN3ywobzQneuyTtB3_video_0.mp4`

Este arquivo semelhante nao foi renomeado nem tratado como substituto definitivo. A build deve aguardar confirmacao do usuario antes de congelar a integracao final desse estado.
