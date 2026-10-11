/* Persisted communication replies. Requires the reviewed reply RPCs. */
(() => {
  // Explicit rollout gate. Enable only after backend review/application approval.
  if (globalThis.RAIZES_COMMUNICATION_REPLIES_ENABLED !== true) return;
  // Retain uncertain submissions across modal close/reopen, scoped to the actor.
  // Memory only: no message content is persisted in browser storage.
  const pendingRequests = new Map();
  const element = (tag, text, attributes = {}) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const request = (name, body) => createSupabaseRestClient().request(`rpc/${name}`, '', {
    method: 'POST', requireAuthenticated: true, body: JSON.stringify(body)
  });
  document.addEventListener('click', async event => {
    const opener = event.target.closest('[data-communication-delivery], [data-communication-replies]');
    if (!opener || opener.disabled) return;
    event.preventDefault();
    opener.disabled = true;
    const dialog = element('dialog', undefined, { 'aria-label': 'Respostas do comunicado', class: 'family-panel' });
    Object.assign(dialog.style, { width: 'min(92vw, 640px)', maxHeight: '85vh', overflow: 'auto' });
    const close = element('button', 'Fechar', { type: 'button' });
    const content = element('section', 'Carregando conversa…', { 'aria-live': 'polite' });
    dialog.append(close, content);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); opener.disabled = false; opener.focus(); });
    document.body.append(dialog);
    dialog.showModal();
    const openThread = async deliveryId => {
      content.textContent = 'Carregando conversa…';
      const thread = await request('communication_get_reply_thread', { p_delivery_id: deliveryId });
      if (!dialog.isConnected) return;
      const actor = await resolveSupabaseUserContext({ requireAuthenticated: true });
      if (!dialog.isConnected) return;
      const pendingKey = `${actor.userId}:${deliveryId}`;
      content.replaceChildren(element('h2', thread.title), element('p', thread.body),
        element('p', 'Respostas visíveis ao destinatário, ao autor autorizado e à gestão escolar, de rede ou administradores com permissão.'));
      const messages = element('div', undefined, { 'data-reply-messages': '' });
      const renderMessages = rows => {
        messages.replaceChildren();
        if (!rows.length) messages.append(element('p', 'Nenhuma resposta ainda.'));
        for (const row of rows) {
          const article = element('article');
          article.append(element('strong', row.own ? 'Você' : row.author_name || 'Participante'), element('p', row.body));
          messages.append(article);
        }
      };
      renderMessages(thread.messages);
      const form = element('form', undefined, { class: 'tw-planning-form' });
      const label = element('label', 'Sua resposta');
      const input = element('textarea', undefined, { required: '', maxlength: '1000', rows: '3', 'aria-label': 'Sua resposta' });
      label.append(input);
      const send = element('button', 'Enviar resposta', { type: 'submit' });
      const status = element('p', '', { role: 'status' });
      form.append(label, send, status);
      content.append(messages, form);
      const retained = pendingRequests.get(pendingKey);
      let requestId = retained?.requestId || crypto.randomUUID();
      let pendingBody = retained?.body ?? null;
      input.value = pendingBody || '';
      let sending = false;
      dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
      form.addEventListener('submit', async submitEvent => {
        submitEvent.preventDefault();
        if (sending || !input.value.trim()) return;
        // A retry of the same text reuses the request id after an uncertain response.
        if (pendingBody !== null && pendingBody !== input.value.trim()) requestId = crypto.randomUUID();
        pendingBody = input.value.trim();
        pendingRequests.set(pendingKey, { requestId, body: pendingBody });
        sending = true; close.disabled = true; send.disabled = true; input.readOnly = true; status.textContent = 'Enviando…';
        try {
          await request('communication_send_reply', { p_delivery_id: deliveryId, p_body: pendingBody, p_request_id: requestId });
          pendingRequests.delete(pendingKey);
          if (!dialog.isConnected) return;
          input.value = ''; pendingBody = null; requestId = crypto.randomUUID();
          status.textContent = 'Resposta enviada.';
          try {
            const refreshed = await request('communication_get_reply_thread', { p_delivery_id: deliveryId });
            if (dialog.isConnected) renderMessages(refreshed.messages);
          } catch { status.textContent = 'Resposta enviada. Reabra a conversa para atualizar as mensagens.'; }
        } catch { if (dialog.isConnected) status.textContent = 'Não foi possível enviar. Seu texto foi mantido; tente novamente.'; }
        finally { sending = false; close.disabled = false; send.disabled = false; input.readOnly = false; }
      });
    };
    try {
      if (opener.dataset.communicationDelivery) await openThread(opener.dataset.communicationDelivery);
      else {
        const threads = await request('communication_list_reply_threads', { p_communication_id: opener.dataset.communicationReplies });
        if (!dialog.isConnected) return;
        content.replaceChildren(element('h2', 'Conversas por destinatário'));
        if (!threads.length) content.append(element('p', 'Nenhum destinatário disponível.'));
        for (const thread of threads) {
          const button = element('button', `${thread.recipient_name || 'Destinatário'}${thread.student_name ? ` · Aluno: ${thread.student_name}` : ''} · ${thread.reply_count} resposta(s)`, { type: 'button' });
          button.addEventListener('click', () => openThread(thread.delivery_id).catch(() => { content.textContent = 'Não foi possível abrir esta conversa.'; }));
          content.append(button);
        }
      }
    } catch { if (dialog.isConnected) content.textContent = 'Não foi possível abrir as respostas deste comunicado.'; }
  });
})();
