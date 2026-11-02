# Pacote oficial e isolamento — 2026-11-02

## Transferência bloqueada (falha, não negação de autorização)

Fonte recebida: Library `libfile_5714948299648191afad5b5d1108c51a`, versão 0, `RAIZES_E_SABERES_CATALOGO_OFICIAL_70_CAPAS_2026.zip`.
Metadados esperados: 9.118.316 bytes; SHA-256 `acbbad90f939f09d55b7f2d7ed9e781c507f0b7c0bf460e13cbad9334cab3aa4`; 72 entradas (70 WebP, catálogo e README).

`prepare_materialize` resolveu o arquivo e confirmou nome/tamanho/versão. `library_file_transfer.py materialize` falhou em `/workspace/official-catalog-import/RAIZES_E_SABERES_CATALOGO_OFICIAL_70_CAPAS_2026.zip` com `library file transfer failed: download failed`. Um único retry com nova preparação e execução escalada do mesmo helper oficial também falhou com a mesma mensagem. Não há arquivo local; não foi possível conferir hash, extrair, inspecionar as imagens nem integrar os dados. Nenhuma rota alternativa, download manual, URL antiga ou consulta Supabase foi utilizada. O ZIP não está no repositório nem no pacote público.

O catálogo ainda tem books=[]; a aprovação dos 70 livros reais continua pendente neste executor. Os testes e screenshots anteriores usam fixtures locais e não certificam o pacote recebido.

## Isolamento concluído

- Worktree: `/workspace/raizes-public-collections-isolated`.
- Branch: `feat/public-official-collections`.
- Base: `d6fb2bb7a597de8ef6175aa1291ee06cebea0782`.
- Commits transportados: `ab36448` (estrutura pública), `1939f8d` (CTAs honestos).
- Resolveu-se somente o conflito esperado da contagem no build, mantendo integralmente o script da base sem o filtro de retirada.
- Vercel novamente confirmou deploy production READY `dpl_Am2W5En8H7tMHNSVjJ86i5CG1eVf` e aliases `www.raizesesaberes.com.br`, `raizesesaberes.com.br`, `plataforma-digital-raizes-e-saberes.vercel.app`.
- Validação do manifesto: nenhum arquivo anterior removido; único arquivo existente alterado é index.html; somente três arquivos públicos novos (CSS, JS, JSON). `app-pages.js`, `styles.css`, `master-pack.css` e `supabase` sem diferença contra produção.
- Build isolado: 4.281 arquivos verificados/copiados. Sintaxe JS e diff check passaram. Sem push/deploy.
- A branch original `chore/archive-legacy-library-production` continua preservada no outro worktree com retirada e shell, sem envio/publicação.

## Próximos passos e release controlado

1. Resolver a entrega autorizada do pacote neste executor, sem contornar restrições. Conferir tamanho/SHA-256 e xattrs/identidade da Library. Verificar ZIP antes da extração (paths relativos dentro de assets/colecoes, sem symlinks/traversal). Não publicar ZIP/README privado.
2. Integrar somente JSON e 70 WebP; inspecionar capas reais em paisagem/retrato; rodar `catalog-check.py` sem `--allow-pending`; atualizar SHA-256 e contagem exata do manifesto. Reexecutar build e testes de 390/768/1440px com dados reais, sem fixtures, incluindo filtros, modal, teclado, foco, CTA, orientação e scan de URLs/campos privados.
3. Conferir novamente commit e aliases de produção. Se houver mudança, reaplicar somente o escopo público sobre a nova base e repetir os checks. Revisão do root é obrigatória antes do cutover por instrução desta tarefa.
4. Depois da revisão e autorização operacional, criar deploy de produção staged no projeto/equipe já identificados, sem atribuir domínios (`vercel deploy --prod --skip-domain`, se CLI autenticada disponível). Não executar esse passo agora. Conferir build e versão exata. Testar por acesso autorizado existente que não crie links compartilháveis nem altere proteção; se indisponível, parar antes de promover.
5. Somente após verificação, promover o deploy staged testado e verificar aliases. Nenhuma migração ou modificação Supabase faz parte deste release público. Registrar novo ID/commit/horário e resultado real.
6. Rollback: restaurar os aliases ao deploy imediatamente anterior registrado na etapa 3 (`dpl_Am2W5En8H7tMHNSVjJ86i5CG1eVf` no estado atualmente confirmado) pelo fluxo Vercel de rollback. Revalidar os aliases. Reverter o commit público em Git para impedir reintrodução futura; nenhum banco requer rollback neste escopo.

O CTA permanece “Ver detalhes” e “Acessar a plataforma”; não promete leitura nem passagem de ID da edição. A reconciliação/ingestão de leitura é independente e continua bloqueada.
