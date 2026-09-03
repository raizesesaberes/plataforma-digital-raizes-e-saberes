# RS-SCHOOL-TEMPLATE V1 - Teste Local Isolado

Script:

```bash
scripts/rs-school-template-v1-test-local.sh
```

O teste sobe um PostgreSQL temporario em `/private/tmp`, cria duas bases limpas, aplica as migrations do template, executa o bootstrap parametrizado, valida o estado inicial vazio e compara o schema gerado nas duas reconstrucoes.

Resultado esperado:

```text
INSTALLATIONS=1
SCHOOLS=1
CLASSES_EMPTY=0
STUDENTS_EMPTY=0
GUARDIANS_EMPTY=0
ENROLLMENTS_EMPTY=0
DOCUMENT_TYPES_GLOBAL=6
SECRETARIA_CAN_MANAGE=true
FIRST_CRUD=1
REBUILD_A PASS
REBUILD_B PASS
SCHEMA_COMPARE PASS
```

O teste nao acessa nem altera o Supabase remoto do piloto.

