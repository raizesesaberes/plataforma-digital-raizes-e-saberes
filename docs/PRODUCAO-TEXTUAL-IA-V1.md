# Producao Textual + Correcao por IA V1

Motor canonico para propostas de producao textual, entrega do aluno, correcao docente, correcao por IA preparada e correcao hibrida.

Nao cria segundo motor de IA. A camada reutiliza `ai_provider_status()` e `ai_pedagogy_prepare_request()`.

## Fluxo

```text
PROPOSTA
-> RASCUNHO / AUTOSAVE
-> ENVIO FINAL
-> CORRECAO DOCENTE | IA | HIBRIDA_IA_DOCENTE
-> FEEDBACK
-> REESCRITA
-> ANALYTICS
```

## Propostas

Professor cria proposta com:

- genero textual;
- tema;
- comando;
- ano/serie;
- componente;
- BNCC;
- rubrica configuravel;
- prazo;
- alvo por aluno, grupo ou turma.

O alvo por grupo reutiliza `recomposition_intervention_groups`.

## Entrega do Aluno

O aluno pode:

- salvar rascunho;
- usar autosave;
- enviar versao final;
- anexar arquivo/imagem quando autorizado.

Imagem e escrita manuscrita ficam preparadas para o OCR existente. Sem provedor OCR real:

```text
HANDWRITING_OCR=EMPTY_REAL
```

Nao ha reconhecimento simulado.

## Correcao

Modos:

```text
DOCENTE
IA
HIBRIDA_IA_DOCENTE
```

Sem provedor IA configurado:

```text
AI_CORRECTION_PROVIDER=EMPTY_REAL
```

O fluxo docente continua operacional. Na correcao hibrida, o professor valida e ajusta antes da consolidacao.

## Rubrica

A rubrica e configuravel e nao fica presa a ENEM.

Dimensoes recomendadas:

- aspectos linguisticos;
- clareza/coerencia;
- coesao;
- progressao tematica;
- argumentacao/repertorio quando aplicavel;
- estrutura do genero;
- criterios customizados.

## Feedback e Reescrita

O feedback pode ser:

- geral;
- por criterio;
- por paragrafo/trecho;
- pontos fortes;
- aspectos a melhorar;
- orientacao de reescrita.

Historico:

```text
VERSAO_1 -> FEEDBACK -> REESCRITA -> VERSAO_2
```

## Analytics

Snapshots permitem evolucao por:

- aluno;
- turma;
- escola;
- genero textual;
- periodo;
- criterio.

## Seguranca

Gates:

```text
CROSS_STUDENT_LEAK=ZERO
CROSS_SCHOOL_LEAK=ZERO
AI_SECRET_FRONTEND=ZERO
UNAUTHORIZED_GRADE_CHANGE=ZERO
STUDENT_TEXT_PRIVACY=PASS
DUPLICATE_AI_ENGINE=ZERO
```

Funcoes oficiais calculam e consolidam no servidor. O frontend nao recebe nem armazena segredo de IA.
