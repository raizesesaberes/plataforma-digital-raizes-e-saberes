# Politica De Acessos RS-SCHOOL V1

Cadastro institucional e acesso digital sao etapas separadas.

## Regras

- Nao criar Auth automaticamente para todos os alunos/responsaveis.
- Nao registrar senhas em CSV, Git, relatorio, script ou migration.
- Usar senha temporaria segura, reset obrigatorio ou mecanismo oficial equivalente.
- Criar admin inicial manualmente no Supabase Auth.
- Criar acesso de professor, familia e aluno somente apos validacao institucional.

## Sequencia Recomendada

1. Admin inicial.
2. Secretaria valida cadastros.
3. Professores selecionados recebem acesso.
4. Familias selecionadas recebem acesso.
5. Alunos recebem acesso somente quando o modulo estiver autorizado para a escola.

