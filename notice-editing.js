/* Versioned notices; rollout only after reviewed backend installation. */
(() => {
  if (globalThis.RAIZES_NOTICE_EDITING_ENABLED !== true) return;
  const pending = new Map();
  const node = (tag, text, attrs = {}) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
  };
  const rpc = (name, body) => createSupabaseRestClient().request(`rpc/${name}`, '', {
    method: 'POST', requireAuthenticated: true, body: JSON.stringify(body)
  });
  document.addEventListener('click', async event => {
    const opener = event.target.closest('[data-notice-versions]');
    if (!opener || opener.disabled) return;
    event.preventDefault(); opener.disabled = true;
    const id = opener.dataset.noticeVersions;
    const deliveryId = opener.dataset.noticeDelivery || null;
    const dialog = node('dialog', undefined, { 'aria-label': 'Versões do comunicado', class: 'family-panel' });
    Object.assign(dialog.style, { width: 'min(92vw, 640px)', maxHeight: '85vh', overflow: 'auto' });
    const close = node('button', 'Fechar', { type: 'button' });
    const content = node('section', 'Carregando versão…', { 'aria-live': 'polite' });
    let busy = false;
    close.onclick = () => dialog.close();
    dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
    dialog.addEventListener('close', () => { dialog.remove(); opener.disabled = false; opener.focus(); });
    dialog.append(close, content); document.body.append(dialog); dialog.showModal();
    const load = async () => {
      const data = await rpc('communication_get_notice_versions', { p_communication_id: id, p_delivery_id: deliveryId });
      const actor = await resolveSupabaseUserContext({ requireAuthenticated: true });
      if (!dialog.isConnected) return;
      const key = `${actor.userId}:${id}`;
      content.replaceChildren(node('h2', data.title), node('strong', `Versão ${data.revision}`), node('p', data.body));
      content.append(node('p', 'A edição mantém destinatários, respostas e leituras anteriores. Leituras antigas não confirmam a leitura da versão atual.'));
      const status = node('p', '', { role: 'status' });
      content.append(status);
      if (deliveryId) {
        const read = node('button', data.current_revision_read_at ? 'Esta versão já foi lida' : 'Confirmar leitura desta versão', { type: 'button' });
        read.disabled = Boolean(data.current_revision_read_at);
        read.onclick = async () => {
          busy = true; close.disabled = true; read.disabled = true;
          try {
            await rpc('communication_mark_revision_read', { p_delivery_id: deliveryId, p_revision: data.revision });
            read.textContent = 'Esta versão já foi lida'; status.textContent = 'Leitura confirmada no servidor.';
          } catch { read.disabled = false; status.textContent = 'Não foi possível confirmar. A versão pode ter mudado; reabra o comunicado.'; }
          finally { busy = false; close.disabled = false; }
        };
        content.append(read);
      }
      if (data.can_edit) {
        content.append(node('p', `${data.current_revision_read_count} leitura(s) confirmada(s) da versão atual.`));
        const form = node('form', undefined, { class: 'tw-planning-form' });
        const title = node('input', undefined, { 'aria-label': 'Título do comunicado', maxlength: '160', required: '' });
        const body = node('textarea', undefined, { 'aria-label': 'Texto do comunicado', maxlength: '700', rows: '5', required: '' });
        const retained = pending.get(key);
        title.value = retained?.p_title ?? data.title; body.value = retained?.p_body ?? data.body;
        const save = node('button', 'Salvar nova versão', { type: 'submit' });
        const reload = node('button', 'Descartar rascunho e carregar versão atual', { type: 'button' });
        reload.onclick = () => { pending.delete(key); load().catch(() => { status.textContent = 'Não foi possível atualizar a versão.'; }); };
        form.append(title, body, save, reload); content.append(form);
        form.onsubmit = async e => {
          e.preventDefault(); if (busy) return;
          let payload = pending.get(key);
          const t = title.value.trim(), b = body.value.trim();
          if (!t || !b) return;
          if (!payload || payload.p_title !== t || payload.p_body !== b) payload = {
            p_communication_id: id, p_expected_revision: data.revision, p_title: t, p_body: b, p_request_id: crypto.randomUUID()
          };
          pending.set(key, payload); busy = true; close.disabled = true; save.disabled = true; reload.disabled = true;
          title.readOnly = true; body.readOnly = true; status.textContent = 'Salvando…';
          let saved = false;
          try {
            const receipt = await rpc('communication_edit_notice', payload);
            pending.delete(key); saved = true;
            status.textContent = `Versão ${receipt.revision} salva no servidor. Reabra para consultar; recarregue a lista para atualizar os cartões.`;
          } catch { status.textContent = 'Não foi possível salvar. Texto mantido. Se outra versão foi salva, carregue a versão atual antes de editar novamente.'; }
          finally { busy = false; close.disabled = false; save.disabled = saved; reload.disabled = false; title.readOnly = saved; body.readOnly = saved; }
        };
      }
      const history = node('details'); history.append(node('summary', 'Histórico de versões'));
      for (const version of data.history) {
        const item = node('article'); item.append(node('strong', `Versão ${version.revision}: ${version.title}`), node('p', version.body)); history.append(item);
      }
      content.append(history);
    };
    try { await load(); } catch { if (dialog.isConnected) content.textContent = 'Não foi possível abrir as versões deste comunicado.'; }
  });
})();
