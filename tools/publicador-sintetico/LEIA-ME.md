# Validação do publicador no GitHub Actions
Proposta para revisão no repositório da Plataforma Raízes e Saberes. Não é uma
migração. Não instalar o SQL deste pacote em projeto hospedado. Nenhum vídeo,
dado real, identificador de produção ou credencial integra esta proposta.

**Primeira etapa:** workflow acionado apenas por push na branch de homologação que cria um banco descartável no runner,
sem porta TCP e sem segredo; aplica uma cópia intacta do protótipo V3.1 e verifica
que o objeto sintético é recusado antes da aprovação, aparece após a aprovação
e não se duplica na reexecução. Não toca Supabase hospedado nem Vercel.
Revisar integração e impacto da Vercel antes de enviar ao repositório público.
Não inclua este workflow na branch principal.
o rascunho não autoriza merge nem envio. Não alegar que rodou no GitHub sem run.

**Segunda etapa, sujeita a aprovação e revisão de segurança:** configurar
ambiente protegido só para homologação, com branch autorizada, revisão
obrigatória por outra pessoa quando houver condições e sem desvio por
administradores. Nome idêntico não substitui conferir configuração real.
Usar identidade de publicação dedicada, sem postgres, sem service_role,
sem BYPASSRLS, sem possibilidade de assumir papel aprovador e sem SQL arbitrário.
Restringir a operação e o destino no servidor, não apenas em YAML.
A aprovação do GitHub é uma barreira do CI, não aprovação no banco: vincular
registro de aprovação independente ao manifesto exato e ao seu digest, com
validade, possibilidade de revogação e recibo auditável ligado à execução.
A identidade do preparador, do aprovador e a de publicação devem ser distintas.
Se não houver separação e revisão verificáveis, não habilitar o envio hospedado.

**Aceite do piloto hospedado:** um vídeo fictício existente, sem reenvio;
rejeitar lote não aprovado, alterado ou revogado; repetir sem duplicar; falhar
sem alterações parciais; conferir recibo, catálogo, player com imagem/som e
negação para uma sessão válida sem acesso. A validação do banco local não
substitui testes de acesso do player nem comprova integração com catálogo real.
Não faça deploy de aplicação nem promoção Vercel por execução de lote.
Reversão proposta: desativar a execução, revogar credencial dedicada e usar a
retirada auditada de visibilidade (validar no RS-SCHOOL); preservar mídia e
recibos. O desenho permanente deve evitar as leituras amplas do fixture.
Nenhuma escrita oficial, execução de LOTE14, credencial de produção ou
alteração de RLS está autorizada por esta proposta.
