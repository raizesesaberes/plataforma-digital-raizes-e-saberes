# RS-SCHOOL-TEMPLATE V1 - Classificacao De Dados

## Estrutura

Schema, tabelas, views, funcoes, RPCs, RLS, policies, grants, triggers, constraints, indices e enums.

## Seed Estrutural

Catalogo global de tipos de documento com `school_id = null`:

- certidao_nascimento
- documento_responsavel
- comprovante_endereco
- carteira_vacinacao
- foto
- autorizacao_saida

Esses registros sao catalogo funcional comum e nao representam uma escola, aluno, responsavel, professor ou turma real.

## Dados De Instancia

Dados que pertencem a uma escola especifica e nao fazem parte do template:

- escolas reais;
- alunos reais;
- responsaveis reais;
- professores reais;
- turmas reais;
- matriculas;
- vinculos familiares;
- frequencias;
- comunicados;
- documentos de aluno;
- movimentacoes;
- memberships operacionais.

## Dados Do Piloto Excluidos

O pacote executavel do template nao contem IDs ou nomes do piloto homologado, incluindo escola, alunos, familia, professora, admin operacional, turmas de teste, registros Aurora, mensagens de homologacao, frequencias artificiais, documentos artificiais e movimentacoes artificiais.

