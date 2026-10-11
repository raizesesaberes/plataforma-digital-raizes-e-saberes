# Inventário técnico mínimo — sem importação

Leitura canônica atual: `content_items` contém3 QUESTION/PUBLISHED, nenhum item de outros tipos. Isso não significa inexistência de arquivos no site.

| Fonte existente | Identificação disponível | Lacuna para catálogo canônico |
|---|---|---|
| `app-pages.js` → `libraryBooks`; `assets/biblioteca/` | id, título, coleção/segmento, páginas/caminhos | Resolver IDs estáticos para BOOK/BOOK_PAGE canônicos, faixa/ano, direitos editoriais e entrega protegida |
| `infantil-experience-catalog.js` → officialBooks/experienceDefinitions/interactiveActivityDefinitions | id/code, idade, volume, bookId/experienceCode | Mapear experiências para INTERACTION e atividades para ACTIVITY, preservar vínculos e registrar recurso de entrega |
| `game-engine.js` → gameRepository.games | id, title, category, scenario | GAME canônico, taxonomia, estado editorial, licença e associação ao motor existente |
| `printable-activities-catalog.js`; `data/atividades-imprimiveis/catalog.json`; `assets/atividades-imprimiveis/` | código/slug, título, faixa, formato, caminho | PRINTABLE/ACTIVITY canônico, checksums/proveniência, entrega e vínculo sem duplicação |
| `assets/universidade/` e páginas correspondentes | imagens/cards e materiais do site | Não comprovam cursos TRAINING publicados nem acesso protegido; inventário editorial por item ainda necessário |
| Estrutura de vídeo em `supabase/template/migrations/202609270004_rs_school_template_v2_video_player_analytics_v1.sql` | estrutura histórica de player/analytics | Não prova VIDEO canônico atual nem autorização; resolver fonte/licença/recurso antes da ingestão |

Preservar os fluxos existentes: `scripts/import-question-bank-json-secure.sh`, `scripts/import-question-bank-json.mjs`, `scripts/curation-pipeline.mjs`, `scripts/import-printable-activities.mjs`. Este último administra o catálogo estático; não presumir que ele já registra `content_items`. Nenhum script foi executado, nenhuma importação homologada foi alterada. Uma etapa futura deve confrontar IDs/proveniência, classificação, publicação e entrega real antes de prometer “todos os conteúdos disponíveis”.
