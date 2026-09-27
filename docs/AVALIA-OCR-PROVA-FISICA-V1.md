# Avalia+ OCR / Correcao Automatizada de Prova Fisica V1

Esta camada evolui o mesmo Avalia+ para receber prova/folha fisica digitalizada e consolidar o resultado no motor canonico ja existente.

Nao cria segundo Avalia+, segundo gabarito ou segundo motor de resultados.

## Escopo

O fluxo cobre:

- upload de PDF, JPG/JPEG, PNG ou foto de celular;
- lote de processamento vinculado a avaliacao, assignment, escola, turma e caderno;
- identificacao de aluno quando houver dado confiavel;
- respostas objetivas detectadas com confianca e status;
- revisao manual obrigatoria para casos incertos;
- consolidacao em `assessment_attempts`, `assessment_responses` e `assessment_results`;
- auditoria de arquivo, operador, eventos, ajustes e consolidacao.

## Pipeline Canonico

```text
UPLOAD
-> VALIDATION
-> PROCESSING
-> REVIEW
-> CONSOLIDATION
-> CONSOLIDATED
```

Quando nao houver provedor OCR configurado, o lote permanece com:

```text
OCR_PROVIDER=EMPTY_REAL
```

Isso nao bloqueia a arquitetura. O arquivo pode ser registrado e conferido manualmente, mas a plataforma nao simula leitura automatica para produzir resultado artificial.

## Revisao Humana

Cada resposta possui:

- questao;
- alternativa detectada;
- alternativa final;
- confianca;
- status.

Marcacoes ambiguas ou incompletas entram como:

```text
REVIEW_REQUIRED
```

A consolidacao somente ocorre depois que o aluno esta identificado e as respostas estao `CONFIRMED` ou `ADJUSTED`.

## Resultado Canonico

A correcao usa o gabarito canonico de `question_alternatives.is_correct` e os pontos de `assessment_questions.points`.

Resultados fisicos digitalizados entram no mesmo motor com:

```text
origin=SCANNED_PHYSICAL
```

Assim, analytics, relatorios, recomposicao e demais camadas continuam lendo a base oficial do Avalia+.

## Seguranca

- scans e respostas ficam protegidos por RLS;
- funcoes de escrita exigem usuario autenticado e turma autorizada;
- professores so operam assignments autorizados;
- consolidacao nao aceita nota calculada pelo cliente;
- duplicidade de resultado consolidado para mesmo aluno/assignment e bloqueada;
- arquivos privados nao recebem permissao anonima;
- auditoria registra operador, origem e ajustes.

Gates:

```text
PRIVATE_SCAN_EXPOSURE=ZERO
CROSS_STUDENT_LEAK=ZERO
CROSS_SCHOOL_LEAK=ZERO
UNAUTHORIZED_REVIEW=ZERO
CLIENT_SIDE_SCORE_TRUST=ZERO
DUPLICATE_RESULT_ENGINE=ZERO
```
