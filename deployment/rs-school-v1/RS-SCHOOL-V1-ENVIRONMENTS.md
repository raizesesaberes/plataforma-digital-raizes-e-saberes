# Ambientes RS-SCHOOL V1

## PILOT

Laboratorio permanente. Pode conter fixtures, dados de demonstracao e iteracoes de produto.

## TEMPLATE

Base limpa homologada. Nao deve conter dados operacionais, nomes ficticios de validacao ou project-ref fixo.

## VALIDATION

Ambiente temporario para testar instalacao, bootstrap, importacao e UAT.

## SCHOOL PRODUCTION

Instancia propria da escola contratante. Cada escola deve ter project-ref proprio e handoff proprio.

## Regra

Nunca misturar project-refs. Antes de aplicar SQL ou importar dados, confirmar explicitamente o projeto alvo.

