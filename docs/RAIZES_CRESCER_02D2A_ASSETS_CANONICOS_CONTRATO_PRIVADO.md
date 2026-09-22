# Raizes Crescer 02D.2A - Assets canonicos e contrato privado

## Escopo

Alvos auditados:

- `RS-EI4-V1-INT-001`
- `RS-EI4-V1-EXP-001`

Esta etapa nao fez upload para o PILOT, nao alterou mobile, nao implementou XP, nao criou buckets publicos e nao substituiu midia ausente.

## Fonte canonica

Fonte editorial principal: `infantil-experience-catalog.js`.

Conteudo canônico já existente no PILOT pela 02D.1:

- atividade `RS-EI4-V1-INT-001`, UUID `02d10000-0000-4000-8000-000000000011`;
- descoberta `RS-EI4-V1-EXP-001`, UUID `02d10000-0000-4000-8000-000000000001`.

## Assets declarados

| ID | Papel | Path declarado | Estado |
| --- | --- | --- | --- |
| `RS-EI4-V1-001` | video definitivo de abertura | `assets/experiencias/infantil/ei4/volume-1/videos/rs-ei4-v1-001-caixa-misteriosa.mp4` | missing |
| `RS-EI4-V1-001` | video provisorio declarado | `assets/video/RS-020-video-institucional.mp4` | missing |
| `RS-EI4-V1-001` | cover/poster | `assets/games/caixa-misteriosa/screens/screen-intro.png` | present, 374615 bytes |
| `RS-EI4-V1-002` | audio de apoio/instrucao | `assets/experiencias/infantil/ei4/volume-1/audios/rs-ei4-v1-002.mp3` | missing |
| `RS-EI4-V1-003` | tela de conclusao | `assets/experiencias/infantil/ei4/volume-1/images/rs-ei4-v1-003.webp` | missing |
| `RS-EI-C-001` | lottie de recompensa | `assets/experiencias/infantil/compartilhados/efeitos/rs-ei-c-001-estrelas-recompensa.json` | missing |
| `RS-EI-C-002` | lottie de conclusao | `assets/experiencias/infantil/compartilhados/efeitos/rs-ei-c-002-confetes.json` | missing |
| `RS-EI-C-003` | audio de acerto | `assets/experiencias/infantil/compartilhados/audios/rs-ei-c-003-acerto.mp3` | missing |
| `RS-EI-C-004` | audio de tentar novamente | `assets/experiencias/infantil/compartilhados/audios/rs-ei-c-004-tentar-novamente.mp3` | missing |
| `RS-EI4-C-001` | personagem guia compartilhado EI4 | `assets/experiencias/infantil/ei4/compartilhados/rs-ei4-c-001-personagem-guia.webp` | missing |
| `css:ladybug` | objeto de cena gerado | sem Storage | present/generated |

## Assets fisicos encontrados mas nao mapeados

A auditoria local encontrou 217 arquivos candidatos presentes, mas ainda nao mapeados, em pastas relacionadas a Caixa Misteriosa/Jardim das Descobertas:

- 159 imagens `.png`;
- 52 videos `.mp4`;
- 4 arquivos `.js`;
- 2 arquivos `.md`;
- 1 arquivo `.css`.

Grupos principais:

- `assets/games/caixa-misteriosa/...`
- `assets/builds/caixa-misteriosa-avaliacao-01/...`
- `assets/builds/caixa-misteriosa-premium-01/...`
- `assets/experiencias/jardim-das-descobertas/...`
- `assets/game-engine-2/assets/caixa-misteriosa/...`

Esses arquivos existem fisicamente, mas nao devem ser ingeridos como assets canonicos de `RS-EI4-V1-INT-001` ou `RS-EI4-V1-EXP-001` sem mapeamento editorial/tecnico explicito. Em especial, nenhum deles foi comprovado como substituto do `RS-020-video-institucional.mp4`.

## Jardim das Descobertas

O arquivo `assets/experiencias/jardim-das-descobertas/config/jardim-descobertas.config.js` declara e os arquivos existem localmente:

- videos `video-01-abertura.mp4` ate `video-06-vitoria-xp.mp4`;
- placas `placa-explorar.png`, `placa-passarinho.png`, `placa-joaninha.png`;
- hotspots de passarinho, joaninha e patinho.

Esse cenário e fisicamente consistente, mas esta em outro contrato legado. Ele fica como `PRESENT BUT UNMAPPED` para a 02D.2A ate ser vinculado formalmente a um conteudo canonico.

## Video ausente

`assets/video/RS-020-video-institucional.mp4` esta declarado como provisorio para homologacao, mas nao existe no workspace.

Resultado:

```text
DECLARED ASSET=MISSING
VIDEO ASSET=CONTENT GAP
```

Nao foi feita substituicao por outro MP4.

## Audio

Os audios declarados para o contrato canonico nao existem nos paths esperados:

- `RS-EI4-V1-002`;
- `RS-EI-C-003`;
- `RS-EI-C-004`.

Resultado:

```text
AUDIO=CONTENT GAP
```

Nao foi sintetizado nem criado audio.

## Modelo privado proposto

Buckets existentes e adequados:

- `images`;
- `videos`;
- `audios`.

Paths canonicos propostos para ingestao futura:

```text
early-childhood/{contentUUID}/{asset-file-name}
```

O cliente nunca deve enviar `bucket` ou `storage_path`.

## Contrato de acesso preparado

Arquivo local preparado:

```text
supabase/functions/student-early-childhood-asset-access/index.ts
```

Entrada permitida:

```json
{
  "contentKind": "activity | discovery",
  "contentId": "uuid canonico",
  "mode": "manifest | asset",
  "assetId": "identificador logico controlado"
}
```

Fluxo:

```text
JWT real
-> auth.getUser
-> student_can_read_activity/student_can_read_discovery
-> student_get_activity/student_get_discovery
-> assetId precisa estar vinculado ao conteudo
-> lookup em early_childhood_content_assets
-> bucket/path derivados no backend
-> signed URL temporaria de 300s
```

Manifesto:

- retorna dados de cena/hotspot necessarios;
- retorna IDs logicos de assets;
- nao retorna bucket;
- nao retorna storage path privado.

Asset on demand:

- assina somente o asset solicitado;
- nao assina todos os assets na abertura;
- assets `css:*` retornam como gerados, sem signed URL.

## Ingestao

Script local preparado:

```bash
node tools/audit-early-childhood-assets.js
```

Ele gera:

- assets declarados e presentes;
- assets declarados e ausentes;
- candidatos fisicos nao mapeados;
- plano local de upload somente para arquivos presentes e comprovados.

Nesta auditoria, o unico arquivo fisico declarado e presente e o cover/poster `screen-intro.png`. Como video/audio essenciais seguem ausentes, a ingestao privada completa fica pendente.

## Veredito local

```text
ACTIVITY ASSET AUDIT=PASS
ACTIVITY REAL ASSETS COUNT=2
ACTIVITY MISSING ASSETS=RS-EI4-V1-001 definitive video, RS-020 provisional video, RS-EI-C-003, RS-EI-C-004
DISCOVERY ASSET AUDIT=PASS
DISCOVERY REAL ASSETS COUNT=1
DISCOVERY MISSING ASSETS=RS-EI4-V1-001, RS-EI4-V1-002, RS-EI4-V1-003, RS-EI-C-001, RS-EI-C-002, RS-EI-C-003, RS-EI-C-004, RS-EI4-C-001
SCENE ASSET=PRESENT
HOTSPOT ASSETS=PARTIAL
AUDIO ASSETS=ABSENT
VIDEO RS-020=MISSING
DECLARED BUT MISSING COUNT=13
PRESENT BUT UNMAPPED COUNT=217
PRIVATE STORAGE MODEL=PASS_LOCAL
PRIVATE ASSET ACCESS CONTRACT=PASS_LOCAL
MANIFEST CONTRACT=PASS_LOCAL
ARBITRARY PATH SIGNING=ZERO
CROSS SCHOOL ASSET ACCESS=ZERO_DESIGNED
PUBLIC PRIVATE-ASSET=ZERO
INGESTION PLAN=READY
PILOT STORAGE UPLOAD=ZERO
MOBILE CHANGES=ZERO
XP CHANGES=ZERO
VERDICT=RAIZES CRESCER 02D.2A ASSETS PENDENTE
```
