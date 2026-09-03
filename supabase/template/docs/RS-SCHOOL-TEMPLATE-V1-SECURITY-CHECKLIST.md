# RS-SCHOOL-TEMPLATE V1 - Checklist De Seguranca

- Nao aplicar este template sobre o projeto piloto homologado.
- Nao versionar `SUPABASE_SERVICE_ROLE_KEY`, senha de banco, URL com senha ou senha de usuario Auth.
- Usar `service_role` somente em scripts locais ou backend seguro.
- Manter `document_upload_enabled = false` ate configurar Storage/policies de upload.
- Confirmar RLS ativo antes de liberar acesso de usuario final.
- Confirmar que responsaveis acessam apenas alunos vinculados.
- Confirmar que professores acessam apenas turmas vinculadas.
- Confirmar que alunos acessam apenas o proprio registro.
- Confirmar que Secretaria depende de membership institucional ativo.
- Rotacionar credenciais temporarias apos homologacao.

