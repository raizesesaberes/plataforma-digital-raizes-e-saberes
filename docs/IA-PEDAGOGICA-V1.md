# IA Pedagogica V1

Camada canonica para assistentes pedagogicos e recomendacoes personalizadas da Plataforma Raizes e Saberes.

## Estado de provedor

Sem credencial externa configurada:

`AI_PROVIDER=EMPTY_REAL`

Isso nao bloqueia a arquitetura. A plataforma prepara contexto, valida seguranca, registra auditoria e retorna contrato server-side pronto para conectar um provedor posteriormente.

## Contratos RPC

### Status do provedor

`ai_provider_status()`

Retorna `EMPTY_REAL` ou provedor/modelo configurado.

### Contexto pedagogico

`ai_pedagogy_build_context(audience, student_id, class_id, component, skill)`

Fontes usadas:

- Avalia+ resultados;
- BNCC/habilidades dos itens;
- mapa de lacunas;
- recomposicao/nivelamento;
- recomendacoes pedagogicas;
- biblioteca/atividades quando vinculadas.

### Assistente

`ai_pedagogy_prepare_request(audience, prompt, student_id, class_id, component, skill)`

Audita a solicitacao e retorna:

- contexto autorizado;
- referencias rastreaveis;
- contrato de chamada server-side;
- `EMPTY_REAL` quando nao houver provedor;
- `BLOCKED` quando houver tentativa de obter resposta/gabarito durante avaliacao ativa.

### Recomendacoes personalizadas

`ai_pedagogy_recommendations(audience, student_id, class_id, skill)`

Reutiliza motores reais:

- `AVALIA+ ANALYTICS`;
- `LEARNING GAP MAP`;
- `RECOMPOSICAO`;
- `ATIVIDADES`;
- `BIBLIOTECA`.

Se nao houver conteudo compativel:

`EMPTY_REAL`

## Privacidade

Regras:

- nao enviar senha, token ou credencial;
- nao colocar chave de IA no frontend;
- minimizar dados enviados ao provedor;
- armazenar hash do prompt para auditoria;
- manter referencias de origem sem expor dados de terceiros.

## Protecao de avaliacao ativa

Durante avaliacao ativa, o aluno nao recebe gabarito, alternativa correta ou resposta de questao.

Status esperado:

`ACTIVE_ASSESSMENT_ANSWER_LEAK=ZERO`

## Auditoria

Tabela:

`ai_interaction_logs`

Registra:

- usuario;
- papel;
- escola/turma/aluno quando autorizado;
- tipo de solicitacao;
- hash do prompt;
- provedor/modelo;
- status;
- referencias usadas;
- protecao de avaliacao ativa.

## Provedor server-side

Tabela:

`ai_provider_configs`

Armazena somente:

- `provider_key`;
- `model_name`;
- `endpoint_ref`;
- `secret_ref`.

Nao armazena chave bruta.

## Garantias

- `AI_SECRET_FRONTEND=ZERO`
- `CROSS_STUDENT_AI_LEAK=ZERO`
- `CROSS_SCHOOL_AI_LEAK=ZERO`
- `ACTIVE_ASSESSMENT_ANSWER_LEAK=ZERO`
- `DUPLICATE_RECOMMENDATION_ENGINE=ZERO`
