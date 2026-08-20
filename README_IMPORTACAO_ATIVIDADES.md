# Importacao de Atividades Imprimiveis

Este modulo esta preparado para receber pacotes de atividades imprimiveis da Educacao Infantil sem cadastrar atividades ficticias.

## Onde colocar o pacote

Coloque a pasta extraida em `assets/atividades-imprimiveis/importacao/` ou informe o caminho completo ao executar o importador.

Estrutura recomendada:

```text
pacote-atividades-ei2/
├── manifest.json
├── arquivos/
└── miniaturas/
```

## Formatos aceitos

Arquivos pedagogicos: `png`, `pdf`, `jpg`, `jpeg` e `webp`.

Manifestos: `manifest.json` ou `manifest.csv`.

## Modelos

Modelo JSON: `data/atividades-imprimiveis/modelos/manifest.json`.

Modelo CSV: `data/atividades-imprimiveis/modelos/manifest.csv`.

Catalogo central: `data/atividades-imprimiveis/catalog.json`.

Espelho usado pela interface estatica: `printable-activities-catalog.js`.

Campos minimos: `codigo`, `titulo`, `faixaEtaria`, `idade`, `objetivo`, `camposExperiencia`, `tiposAtividade`, `materiais`, `palavrasChave`, `orientacaoProfessor`, `arquivo`, `versao`, `status`.

## Dry-run

```bash
node scripts/import-printable-activities.mjs --source assets/atividades-imprimiveis/importacao/pacote-atividades-ei2 --dry-run
```

O dry-run valida manifesto, codigos, duplicidades, extensoes e arquivos ausentes, mas nao grava no catalogo.

## Importar

```bash
node scripts/import-printable-activities.mjs --source assets/atividades-imprimiveis/importacao/pacote-atividades-ei2 --commit
```

Registros invalidos nao sao publicados automaticamente. Quando o pacote vier sem manifesto, o importador tenta localizar codigos nos nomes dos arquivos e cria itens com `status` igual a `PENDENTE_DE_METADADOS`.

## Relatorio

O relatorio informa:

- codigos duplicados;
- arquivos duplicados;
- arquivos ausentes;
- codigos sem arquivo;
- arquivos sem codigo;
- extensoes nao autorizadas;
- metadados obrigatorios pendentes;
- total que seria importado ou foi importado.

Corrija os erros no manifesto ou nos nomes dos arquivos e execute novamente o dry-run antes de importar.

## Publicacao

Depois da importacao, revise os metadados na area `Admin > Atividades Imprimiveis`. Publique somente atividades com codigo, titulo, arquivo valido e status revisado.
