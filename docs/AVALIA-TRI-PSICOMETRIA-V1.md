# Avalia+ TRI / Psicometria Avancada V1

## Objetivo

A camada `TRI_PSICOMETRIA_V1` complementa o Avalia+ existente sem reconstruir as Fases 1-4.

Ela preserva os indicadores classicos ja homologados:

- percentual de acerto;
- dificuldade classica;
- discriminacao;
- ponto-bisserial;
- Alfa de Cronbach.

TRI entra como medida adicional, separada e rastreavel.

## Modelos suportados

A estrutura suporta:

- `1PL`: dificuldade `b`, discriminacao fixa `a=1`, acerto ao acaso `c=0`;
- `2PL`: dificuldade `b`, discriminacao `a`, acerto ao acaso `c=0`;
- `3PL`: dificuldade `b`, discriminacao `a`, acerto ao acaso `c`.

O parametro `c` do 3PL usa a estrutura real de alternativas do item quando ha calibracao valida.

## Calibracao

Toda calibracao registra:

- avaliacao;
- modelo;
- metodo;
- versao;
- amostra;
- quantidade de itens;
- status;
- metricas;
- usuario;
- data.

Quando a amostra nao e suficiente, o status canonico e `INSUFFICIENT_SAMPLE`.

A plataforma nao inventa parametros TRI para ausencia de amostra.

## Theta e proficiencia

Quando existe calibracao valida, o motor estima:

- `theta`;
- erro padrao de theta;
- `TRI_PROFICIENCY`;
- rastreabilidade da calibracao.

`PERCENTUAL_ACERTO` e `TRI_PROFICIENCY` permanecem medidas diferentes.

## Analytics

A funcao `avalia_plus_get_irt_analytics` agrega resultados por:

- aluno;
- turma;
- escola;
- rede;
- evolucao temporal.

Quando nao ha calibracao/proficiencia valida, o retorno e `EMPTY_REAL`.

## Seguranca

Os calculos oficiais de TRI ocorrem no banco/servidor.

O frontend nao envia nem define `theta`, parametros `a/b/c` ou proficiencia oficial.

O acesso segue as permissoes existentes de Avalia+, Secretaria e Rede:

- `UNAUTHORIZED_CALIBRATION=ZERO`;
- `CLIENT_SIDE_TRI_TRUST=ZERO`;
- `DUPLICATE_ANALYTICS_ENGINE=ZERO`.

## Limites

A camada nao declara equivalencia oficial com SAEB sem parametrizacao oficial apropriada.

Ela tambem nao cria banco massivo de questoes nem parametros ficticios.
