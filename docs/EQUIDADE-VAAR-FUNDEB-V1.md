# Equidade Educacional / VAAR-FUNDEB V1

## Objetivo

A camada `EQUIDADE_VAAR_FUNDEB_V1` amplia os analytics existentes da Plataforma Raizes e Saberes para acompanhamento institucional de equidade educacional e evidencias de apoio ao VAAR-FUNDEB.

Ela nao cria um segundo motor de analytics. Os indicadores sao calculados sobre estruturas canonicas ja existentes, principalmente:

- alunos, matriculas, turmas e escolas;
- resultados consolidados do Avalia+;
- frequencia;
- redes municipais;
- relatorios oficiais.

## Dimensoes autorizadas

A estrutura aceita dimensoes institucionais somente quando elas existirem de forma autorizada:

- raca/cor;
- nivel socioeconomico;
- territorio/localidade;
- PCD;
- genero, quando institucionalmente aplicavel.

Quando os dados nao existem, o retorno esperado e `EMPTY_REAL`. A plataforma nao fabrica classificacoes raciais, socioeconomicas ou de deficiencia.

## Indicadores

O painel de equidade consolida:

- desempenho medio;
- nivel de proficiencia;
- participacao em avaliacoes;
- frequencia;
- diferencas entre grupos;
- grupos que exigem atencao pedagogica;
- evolucao quando houver dados historicos suficientes.

Os indicadores internos sao rotulados como `INDICADOR_INTERNO`.

Dados oficiais importados ficam separados e rotulados como `DADO_OFICIAL_IMPORTADO`.

## Privacidade e LGPD

A tabela sensivel `equity_student_attributes` nao recebe grant direto para `authenticated`.

O consumo normal acontece por funcoes agregadas, com:

- escopo por rede/escola;
- checagem de permissao;
- supressao de grupos pequenos;
- ausencia de ranking publico por dimensao sensivel;
- separacao entre dado oficial e indicador interno.

O minimo canonico de grupo e `5`. Grupos menores retornam `SUPPRESSED_SMALL_GROUP`.

## VAAR-FUNDEB

A plataforma fornece evidencias e snapshots historicos para apoiar acompanhamento da reducao de desigualdades.

Ela nao declara automaticamente que municipio, escola ou rede esta habilitado oficialmente ao VAAR-FUNDEB.

O payload deixa explicito:

- `INDICADOR_INTERNO`;
- `DADO_OFICIAL_IMPORTADO`;
- `NOT_DECLARED_BY_PLATFORM`.

## Relatorios oficiais

A integracao usa o motor existente de `official_report_exports`.

Os snapshots de Equidade/VAAR sao exportados como:

- `network-analytics`, para rede;
- `school-analytics`, para escola.

O campo `params.module` identifica `EQUIDADE_VAAR_FUNDEB_V1`, preservando a arquitetura oficial de relatorios sem criar motor paralelo.
