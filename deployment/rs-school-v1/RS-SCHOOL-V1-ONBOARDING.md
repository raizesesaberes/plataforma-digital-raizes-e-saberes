# Onboarding Da Primeira Escola

## Antes Da Implantacao

- Preencher checklist pre-deploy.
- Confirmar project-ref novo.
- Confirmar que nao e Pilot.
- Confirmar backup.
- Revisar CSVs sem dados reais indevidos.
- Executar dry-run do importador.

## Implantacao

1. Aplicar migrations do Template.
2. Criar Auth Admin inicial.
3. Executar bootstrap.
4. Validar Secretaria vazia.
5. Configurar backup e restore.
6. Importar ou cadastrar dados.
7. Validar RLS.
8. Criar acessos digitais aprovados.
9. Executar UAT.
10. Registrar GO/NO-GO.

## Pos-Liberacao

- Monitorar primeiro login da Secretaria.
- Monitorar professores habilitados.
- Monitorar familia/aluno somente se esses acessos foram ativados.
- Registrar chamados pelo checklist de suporte.
- Manter handoff atualizado.

