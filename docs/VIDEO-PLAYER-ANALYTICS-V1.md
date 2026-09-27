# Player Educacional de Video + Analytics V1

Status: FROZEN estrutural apos aplicacao da migration `202609270004_rs_school_template_v2_video_player_analytics_v1.sql`.

## Escopo

- Player canônico Web reutilizável via `window.RaizesVideoPlayer`.
- Catálogo técnico em `educational_video_assets`.
- Legendas em `educational_video_captions`.
- Progresso server-side em `educational_video_progress`.
- Eventos em `educational_video_events`.
- Snapshots/indicadores em `educational_video_analytics_snapshots`.

## Integração

O mesmo player deve ser reutilizado por:

- Biblioteca;
- Universidade/Formação;
- conteúdos pedagógicos;
- Recomposição;
- futuras videoaulas.

Não criar players paralelos por módulo.

## Eventos Canônicos

- `PLAY`
- `PAUSE`
- `SEEK`
- `PROGRESS`
- `COMPLETE`
- `SPEED_CHANGE`

O frontend nunca envia percentual assistido como fonte de verdade. O backend calcula percentual a partir de posição/duração e consolida progresso com limites.

## HLS/CDN

A estrutura suporta MP4, HLS, qualidade/resolução e CDN, mas a infraestrutura externa ainda não está contratada/configurada.

`HLS_CDN=EMPTY_REAL`

## Segurança

- Vídeos privados exigem `storage_bucket`/`storage_path` e URL assinada/temporária.
- Não gravar URL permanente em asset privado.
- Sem segredo de provider/CDN no schema ou frontend.
- RLS habilitado em todas as tabelas do motor.
- Analytics respeitam contexto de escola/aluno.

## Mobiliação

Entram depois:

- produção de videoaulas;
- conversão em massa;
- legendas/audiodescrição reais;
- configuração de CDN/HLS;
- acervo de Universidade/Formação/Biblioteca em vídeo.
