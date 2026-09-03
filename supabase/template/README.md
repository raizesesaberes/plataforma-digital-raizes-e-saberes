# RS-SCHOOL-TEMPLATE V1

Template institucional limpo derivado do piloto homologado do RS-SCHOOL-PILOT.

Este pacote nao deve ser aplicado sobre o projeto piloto remoto. Ele existe para criar novas instalacoes RS-SCHOOL a partir de schema, RLS, policies, RPCs e catalogos estruturais, sem carregar dados operacionais do piloto.

## Conteudo

- `migrations/202608290001_rs_school_template_v1_schema.sql`: baseline consolidado de schema publico.
- `migrations/202608290002_rs_school_template_v1_installation_config.sql`: configuracao de instalacao e catalogo estrutural de documentos.
- `bootstrap/rs_school_template_bootstrap.sql`: criacao parametrizada da primeira escola e do primeiro vinculo administrativo.
- `tests/RS-SCHOOL-TEMPLATE-V1-LOCAL-TEST.md`: roteiro e resultado esperado do teste local isolado.
- `docs/RS-SCHOOL-TEMPLATE-V1-DATA-CLASSIFICATION.md`: classificacao de estrutura, seed estrutural e dados de instancia.
- `docs/RS-SCHOOL-TEMPLATE-V1-INSTALL-CHECKLIST.md`: checklist de instalacao.
- `docs/RS-SCHOOL-TEMPLATE-V1-SECURITY-CHECKLIST.md`: checklist de seguranca.

## Bootstrap

O bootstrap exige parametros locais do `psql`:

- `school_name`
- `school_code`
- `school_year`
- `admin_user_id`
- `admin_display_name`

Ele nao cria usuario Auth, nao recebe senha e nao grava segredo.

