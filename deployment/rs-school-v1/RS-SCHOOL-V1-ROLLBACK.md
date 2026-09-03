# Rollback De Implantacao

Se a importacao falhar:

1. Parar no primeiro erro.
2. Nao continuar em cascata.
3. Identificar arquivo, linha e lote.
4. Preservar relatorio de importacao.
5. Confirmar se houve gravacao parcial.
6. Preferir rollback transacional ou restore testado.
7. Nao apagar manualmente dados aleatorios.
8. Reexecutar somente apos causa corrigida e nova aprovacao.

## Evidencia Minima

- Arquivo:
- Linha:
- Erro:
- Objetos criados antes da falha:
- Estrategia escolhida:
- Responsavel:

