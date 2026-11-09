# Roteiro de homologação isolada do App Raízes

Preparado em 2026-11-09. Nenhum ambiente/conta/credencial criado. Documento de execução futura, não autorização para criar, gastar ou alterar acesso.

## Escolha e orçamento

Preferência: branch Supabase temporária `app-raizes-homologacao`, na organização já utilizada pelo projeto, sem dados de produção. Organização atual confirmada por metadados: Raizes e saberes digital, plano Pro, região sa-east-1. Não é necessário upgrade para branching. Confirmar o uso dessa organização e obter cotação específica antes da criação. Não sobrescrever RS-SCHOOL-TEMPLATE-V1-VALIDATION ou VALIDATION-2: não possuem os contratos do app e sua reutilização não foi autorizada.

Preço oficial consultado: Micro US$0,01344/h, aproximadamente US$0,32/24 h ou US$2,26/7 dias, só compute. Somam-se eventual uso excedente e impostos. Branches não são cobertas por Spend Cap ou pelos créditos de compute. Branching exige Pro; a organização atual já possui esse plano, portanto não há nova assinatura de Pro necessária para essa opção. Não prometer teto automático ou total fechado com base nessa estimativa.

Alternativas: projeto separado (mesma ordem de compute em organização paga; Free somente se houver cota elegível), ou stack local com dados sintéticos (sem cobrança de hospedagem, mas não fornece por si só acesso Safari remoto).

Fontes oficiais:
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/deployment/branching/dashboard
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/local-development/cli/getting-started

## Aprovações mínimas antes de executar

1. Organização/ambiente exatos, duração prevista e orçamento total autorizado. Cotar antes de criar. Não realizar upgrade/assinatura adicional sem aprovação específica.
2. Confirmação apropriada para criar/configurar acesso persistente e identidades exclusivamente de teste. Senhas por fluxo seguro, nunca no chat, arquivos do repositório ou logs.
3. Aprovação de login e operações de teste nos destinatários/ambiente identificados. Nenhuma conta real de aluno/cliente.
4. Revisar como encerrar custos. Não prometer excluir a branch automaticamente: exclusão irreversível exige confirmação própria. Uma branch persistente não pausa automaticamente.

A primeira branch via dashboard pode registrar metadados/habilitar branching no projeto-base. Dados e aplicação ficam isolados, mas não se deve prometer ausência absoluta de alterações administrativas no projeto-base.

## Preparação técnica, sem dados de produção

- Fixar SHA fonte e reconciliar com último deploy. App e Colorir têm frentes separadas; não promover commits incidentalmente.
- Comparar schema/definições atuais com migrations. O ledger de produção tem 184 entradas; o snapshot antigo não reproduz tudo. As quatro versões FASE3 constam instaladas, mas há mudanças posteriores em escopos/autorização. Não executar cegamente SQL antigo sobre o banco.
- Revisar cada migration/seed/config antes da branch: branches não copiam dados por padrão, mas migrations/seeds podem fazer inserções ou integrar serviços. Remover qualquer dado de pessoas, segredo ou automação externa.
- Preparar Auth, RPCs/RLS/grants, armazenamento e Edge Functions necessários. Não copiar SMTP/OAuth, webhooks ou credenciais de produção. Conteúdos editoriais somente do escopo já aprovado, com referências de teste.
- Usar somente perfis fictícios: professora, aluno infantil e aluno fundamental/médio. Para testar isolamento, segunda escola/turma e identidade adversarial fictícia. Incluir turma de médio sem criar quarto perfil de produto.
- Registrar o novo project_ref, origem HTTPS e frontend exclusivo de homologação. Login central e `/app/` precisam da mesma origem. Confirmar em configuração e tráfego que nenhum request operacional vai à produção antes de autenticar.
- Criar credenciais de teste apenas pelo fluxo aprovado e guardá-las por mecanismo seguro. Nenhuma credencial em URL/log/captura/repositório.
- Se usar CLI, verificar versão e `--help`: v3 tornou comandos locais por padrão, com `--remote` para hospedado. Não copiar comandos antigos sem conferir.

## Matriz de aceite

### Sessão e permissões
- Login central → App no perfil confirmado; URL direta sem sessão bloqueada.
- Sessão expirada/revogada, logout na outra aba, troca de conta durante requisição e conta inativa eliminam conteúdo anterior.
- Cada escola/turma/aluno recebe apenas dados/licenças próprios. Negado, vazio e rede indisponível distintos.
- Nenhum token em URL, payload privado em history.state, service-role no cliente ou cache offline privado.

### Fluxos reais isolados
- Missão: professora escolhe turma → catálogo autorizado → plano → confirmação/publicação → aluno recebe → realiza → estado persiste. Confirmar conflito, expiração, cancelamento e isolamento.
- Colorir: temas → desenho → faixa etária → pintar/ganhar vida → voltar; missão institucional persiste somente quando previsto; livre não inventa XP/gravação remota.
- Biblioteca/atividades: abre material autorizado, registra progresso e releitura; licença revogada bloqueia.
- Agenda/avisos: lista/detalhe por identidade real do registro, inclusive títulos iguais; escrita e contagem respeitam contrato.
- Avalia+, respostas e edição: habilitar flags só no build de homologação quando contratos atuais e testes negativos passarem. Avaliação de diferentes tipos, autosave, reenvio idempotente, conflito e recibos por revisão.
- Diário: rascunho preserva links e metadata, usa If-Match e trata PT409; resultado incerto é reconciliado antes de qualquer repetição. Fechamento permanece bloqueado até suportar revisão otimista no servidor ou revisão específica aprovar o contrato existente. Read-then-close não é garantia atômica.

### Navegador/dispositivos
- Safari iPhone e Chrome Android reais: login/retorno, safe-area, teclado, orientação, SVG, toque, pintura, impressão/download, upload permitido, rede interrompida/retomada, Voltar/Avançar e guarda de alterações.
- Viewports 320/390/768 e desktop; acessibilidade por teclado/leitor; nenhuma rolagem horizontal acidental.
- App tradicional/nativo e rotas web atuais sem regressão. QA de Chrome em iframe de largura fixa não substitui testes físicos.

## Saída de homologação

Guardar SHA, hashes de build, versões de schema, resultados e limitações sem dados privados. Revisar autorização de publicação separadamente. Não mesclar ou implantar em produção como efeito de criar/testar a branch. Lojas continuam fora deste escopo.

Cotação específica não foi obtida: a ferramenta requer confirmação da organização pelo usuário antes de get_cost. A tarifa acima é documentação oficial, não cotação da conta. Nenhuma chamada confirm_cost, create_branch ou criação/configuração de credenciais foi executada.
