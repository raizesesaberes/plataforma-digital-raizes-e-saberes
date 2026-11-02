# Catálogo público das três coleções — estrutura local

Status: estrutura implementada; conteúdo final PENDENTE do pacote de 70 capas e sínteses do root. Nenhum push/deploy. Não confundir o catálogo público com autorização de leitura integral.

Mudanças isoladas do escopo anterior:

- `index.html`: entrada do cabeçalho “Coleções Raízes e Saberes” aponta para `#colecoes`; seção Educação Infantil substituída pela área de três coleções, filtros e modal. Âncora antiga `#infantil` preservada como compatibilidade.
- `public-collections.css`: estilos limitados ao novo catálogo, reutilizando botões/cards, cores e tipografia do site. Capas sempre inteiras em `object-fit: contain`, inclusive paisagem EI2/EI3. Altura do cabeçalho observada para compensar deslocamento das âncoras.
- `public-collections.js`: coleção, ano/idade, volume, público e busca textual combináveis; estado vazio, reset, modal nativo com Escape e devolução de foco; links integrais somente para `login.html?next=biblioteca.html`.
- `assets/colecoes/catalogo-oficial.json`: três propostas gerais e lista `books` VAZIA. Não há capas antigas rotuladas como novas nem sínteses fictícias publicáveis. O estado de preparação é mostrado até a integração.
- Manifesto adiciona somente os três novos arquivos runtime e atualiza hash de index. Build passa de 4.278 para 4.281 fontes verificadas, 1.934 publicáveis nesta branch após a retirada de 2.347 assets legados.

## Contrato para integrar o pacote oficial

Preservar `version: 1` e as coleções (IDs `raizes-crescer`, `avalia-mais`, `indigena-afro-brasileira`). Atualizar as descrições das coleções com as sínteses fundamentadas, se necessário. Preencher `books` com 70 objetos:

```json
{
  "id": "slug-estavel-do-livro",
  "collectionId": "raizes-crescer",
  "title": "Título confirmado no PDF",
  "grade": 2,
  "volume": "1",
  "audience": "student",
  "summary": "Síntese curta confirmada no conteúdo do PDF.",
  "cover": {
    "src": "assets/colecoes/oficiais/nome-da-capa.webp",
    "width": 1200,
    "height": 800
  }
}
```

- `grade`: inteiro, idade 2–5 para Raízes Crescer; ano 1–9 para as outras duas coleções.
- `volume`: string `"1"`, `"2"`; `""` quando não houver divisão (mostra “Volume único”).
- `audience`: `student` ou `teacher`.
- `cover`: apenas caminho local `assets/...` para PNG/JPG/WEBP com dimensões reais, sem espaços no nome. Sem URLs de Drive, PDF, ZIP, DOCX, origem gráfica ou fontes privadas.
- `summary`: texto simples; pode ter acentos e é escapado no HTML. Não inserir HTML.
- O JSON público não deve incluir IDs privados de Drive, URLs originais, credenciais ou caminhos de produção gráfica. Proveniência detalhada fica em documentação privada, fora do manifesto público.
- Confirmar contagens 16/36/18, unicidade de IDs, dimensões/orientação, correspondência aluno/professor e legibilidade das capas. Acrescentar cada capa ao manifesto com hash e atualizar contagem exata do build. Não usar curingas para publicar diretórios.
- Reexecutar build e testes com o catálogo verdadeiro. As capturas atuais são de fixtures e NÃO representam capas oficiais.

## Evidência

`browser-check.py` intercepta somente respostas HTTP locais e injeta 70 registros sintéticos e retângulos PNG temporários de retrato/paisagem; não grava esses livros em JSON/runtime. Tudo externo é bloqueado. Testou 390/768/1440px, contagens 16/36/18, filtros combinados, busca sem resultado e reset, modal por teclado, Escape/foco, botão fechar, caminho autenticado, ausência de PDF/Drive, object-fit, âncora sem sobreposição do cabeçalho e sem overflow horizontal. Zero erros JS. Resultado em `results.json`; imagens marcadas `synthetic` apenas para QA. Também verifica que o catálogo fonte continua vazio em preparação.

Comandos: `node --check public-collections.js`; `git diff --check`; `node scripts/build-static-web.mjs`; `node qa/legacy-library-retirement/build-check.mjs`; servir `dist` em 127.0.0.1:8769 e executar `python qa/public-collections/browser-check.py`.

## Separação para publicação futura

Não publicar a branch inteira enquanto a retirada remota continua bloqueada. A estrutura pública está em commit separado e pode ser revisada/transportada isoladamente para uma branch baseada no deploy real de produção, preservando os hashes dos demais arquivos. O ajuste público do build é somente a contagem; não transportar por engano o filtro de retirada e a dependência do inventário presentes nesta branch. A integração das capas muda essa contagem novamente. Confirmar produção atual antes de qualquer release.

As duas capturas de referência (`libfile_df96e40162948191be1fb3983e0fe108` e `libfile_3826663f04f48191955b76703cb30636`) foram resolvidas por prepare_materialize, mas os dois downloads pelo helper retornaram `library file transfer failed: download failed`. Nenhum original foi alterado. Seus pixels não puderam ser inspecionados neste executor; o alinhamento estrutural usou o código de produção e a descrição fornecida pelo root, e as novas screenshots locais foram visualizadas.

Gate de integração: `python qa/public-collections/catalog-check.py` exige os 70 livros, contagens por coleção, combinações únicas ano/volume/público, imagens existentes e dimensões reais, e rejeita campos extras privados. Enquanto o pacote está pendente, somente `--allow-pending` aceita explicitamente a lista vazia e reporta PENDING; não usar essa opção como aprovação de release.

### Honestidade dos CTAs

Cards usam “Ver detalhes” para abrir capa/síntese. O modal usa “Acessar a plataforma”, com texto neutro sobre recursos disponíveis para escola/perfil. Não promete leitura integral nem abertura da edição. A ingestão digital e o mapeamento canônico permanecem pendentes para os 70 livros; essa dependência é registrada somente neste contrato interno, sem acrescentar campos ao schema público. O login continua em `login.html?next=biblioteca.html`, sem IDs legados.
