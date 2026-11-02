# Revisão da integração pública — 2026-11-02

Status: integração local aprovada nos testes abaixo; sem push/deploy. Cutover depende da liberação do root.

## Origem e isolamento

Worktree `/workspace/raizes-public-import`, branch `feat/public-official-collections-import`, base de produção `d6fb2bb7a597de8ef6175aa1291ee06cebea0782`. Bundle incremental aplicado por fast-forward até `8110f674eaa664d226f72a224f3c51a879557581`, árvore conferida antes da integração. ZIP de código SHA256 `7e9b63d988d99a68f7425ecaaf0cdc1bd1bd12ab8154c116098f2e72fb1e662d`; bundle interno SHA256 `39fdd3a4b4dd937082c7d71f5bfb8e2f026d9dfcd295a7fb65dbe23a0b285362`.

Pacote oficial versão 0: SHA256 `acbbad90f939f09d55b7f2d7ed9e781c507f0b7c0bf460e13cbad9334cab3aa4`, 9.118.316 bytes, CRC e xattrs válidos. ZIP preservado fora do runtime em `/workspace/library-verification`. Todos os 71 arquivos assets copiados e comparados byte a byte entre ZIP, fonte e dist.

## Escopo final

Menu público Coleções Raízes e Saberes, três apresentações de coleção, 70 livros com sínteses oficiais, filtros por coleção/ano ou idade/volume/público e busca tolerante a acentos. Cards Ver detalhes; modal Acessar a plataforma apontando para `login.html?next=biblioteca.html`, sem prometer leitura integral.

Além do bundle, integradas 70 WebP e JSON oficial; corrigidos ciclo de foco por Tab/Shift+Tab no modal e dimensionamento mínimo das imagens em grid para impedir sobreposição dos retratos nos textos.

Manifesto: base 4.278 → 4.351 arquivos; 73 adições (70 WebP + JSON + CSS + JS), nenhuma retirada. Único runtime preexistente alterado: index.html. Cabeçalho preservado, exceto rótulo e destino da entrada solicitada. Shell autenticado, app-pages.js, styles.css, script.js, banco e configuração Vercel permanecem idênticos à base. QA e material privado de transferência não entram no manifesto/dist. Nenhuma nova URL Drive, PDF ou ZIP no catálogo.

## QA real

- `catalog-check.py`: PASS, 16 Crescer / 36 Avalia+ / 18 Indígena, 70 IDs e combinações únicos, paths relativos e dimensões corretas.
- 8 imagens 600×425 paisagem; 44 imagens 600×849 e 18 imagens 600×777 retrato. Todas decodificadas pelo navegador.
- `browser-real-check.py`: PASS em 390, 768 e 1440px. Menu e âncoras com destino visível e sem cabeçalho cobrindo; três coleções; filtros combinados; buscas com e sem acentos; vazio/reset; aluno/professor; dois volumes e volume único; modal, foco inicial, Tab/Shift+Tab, Escape, botão fechar e foco devolvido; contain e caixas de imagens limitadas aos frames; sem overflow horizontal.
- Nenhum erro JS, console ou resposta HTTP local 4xx/5xx. Destinos login.html e biblioteca.html retornaram 200, sem entrar em sessões autenticadas.
- Build de 4.351 arquivos e hashes: PASS. Sintaxe JS e diff whitespace: PASS.
- Capturas oficiais de overview, modal e grid em três larguras, mantidas apenas em QA. A inspeção visual identificou e confirmou a correção do overflow de retratos que a versão sintética não detectava.
- Limite: testes locais substituíram requisições externas por resposta vazia; a única observada foi Google Fonts. Não validam disponibilidade externa nem leitura/permissões da plataforma. Nenhuma consulta Supabase foi feita.

## Produção e estratégia de publicação proposta

Metadados autenticados Vercel confirmaram projeto `prj_FQGMiEgtPpMjGeQLMKhSNpPfcvXn`, equipe `team_DxW95pOlpbyKV4ZWtde17x47`, deployment `dpl_Am2W5En8H7tMHNSVjJ86i5CG1eVf`, READY/production, commit `d6fb2bb7a597de8ef6175aa1291ee06cebea0782`, aliases incluindo www.raizesesaberes.com.br e raizesesaberes.com.br. Nenhum share link ou acesso protegido foi criado. Main remoto continua `f60944b570e3d045b75e9a09ec274737f9687a1b`, divergente da base de produção.

Após liberação explícita do root:
1. Reconsultar metadados da produção e comparar deployment/SHA com o registro acima; parar e reconciliar se houver mudança.
2. Publicar somente a branch isolada com `git push origin HEAD:refs/heads/feat/public-official-collections-import`, a partir deste worktree limpo. Nunca force push, merge ou reset de main. O push pode disparar preview pelo Git integration; tratar isso como parte da autorização pendente.
3. Usar a conexão Git do projeto Vercel para criar deployment do SHA integral revisado desta branch, explicitando projeto/equipe e target production somente quando o cutover estiver liberado. Não usar main/latest como fonte e não incluir commits das frentes bloqueadas. Build `node scripts/build-static-web.mjs`, saída `dist` restrita ao manifesto.
4. Conferir READY, commit exato e aliases por metadados e validar a vitrine pelo domínio público. Se necessário, rollback para o deployment de produção registrado, também sob autorização. Não criar link compartilhável de deployment protegido.

Ingestão dos 70 PDFs, autorização de leitura, retirada de legados e shell autenticado seguem fora deste release.
