/* Isolated browser print surface. PDF generation stays in the browser; no school data leaves this surface. */
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const table = (headers, rows) => `<table><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const diary = entries => entries.length ? entries.map(e=>`<article><h2>${escape(e.entryDate ?? e.entry_date)} · ${escape(e.title)}</h2><p><strong>${e.status==='closed'?'FECHADO':'RASCUNHO'}</strong></p><h3>Conteúdo ministrado</h3><div class="text">${escape(e.taughtContent ?? e.taught_content)}</div><h3>Registro pedagógico coletivo</h3><div class="text">${escape(e.pedagogicalNotes ?? e.pedagogical_notes)}</div></article>`).join('') : '<p>Nenhum registro no período selecionado.</p>';
  let pdfLibrary;
  const loadPdf = () => pdfLibrary ||= (async () => {
    for (const file of ['pdfmake.min.js', 'vfs_fonts.js']) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/vendor/pdfmake-0.2.20/' + file;
        script.onload = resolve;
        script.onerror = () => { script.remove(); reject(Error('Não foi possível carregar o gerador de PDF.')); };
        document.head.append(script);
      });
    }
    return window.pdfMake;
  })().catch(error => { pdfLibrary = null; throw error; });
  // Convert only the controlled diary/attendance document, never the application UI.
  const pdfText = value => String(value).replace(/\S{25,}/gu, word => [...word].map((c,i) => i && i%16===0 ? '\u200b'+c : c).join(''));
  const pdfDefinition = doc => {
    const blocks = parent => [...parent.children].flatMap(node => {
      const tag = node.tagName;
      if (tag === 'TABLE') {
        const rows = [...node.rows].map(row => [...row.cells].map(cell => ({
          text: pdfText(cell.textContent), bold: cell.tagName === 'TH', margin: [2, 4, 2, 4]
        })));
        return rows.length ? [{table: {headerRows: node.tHead?.rows.length || 0,
          widths: rows[0].map(() => '*'), body: rows}, margin: [0, 8, 0, 12]}] : [];
      }
      if (['HEADER', 'MAIN', 'ARTICLE', 'SECTION'].includes(tag)) return blocks(node);
      if (['H1', 'H2', 'H3', 'P', 'DIV', 'FOOTER'].includes(tag)) return [{
        text: pdfText(node.textContent || ' '), fontSize: tag === 'H1' ? 19 : tag === 'H2' ? 14 : tag === 'FOOTER' ? 9 : 11,
        bold: /^H[123]$/.test(tag) || !!node.querySelector('strong'),
        margin: [0, tag === 'H2' ? 12 : 0, 0, 8]
      }];
      return [];
    });
    return {pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [45.354, 45.354, 45.354, 45.354],
      defaultStyle: {font: 'Roboto', fontSize: 11, lineHeight: 1.2},
      info: {title: doc.title, creator: 'Raízes e Saberes'}, content: blocks(doc.body),
      footer: (page, total) => ({text: `${page} / ${total}`, alignment: 'center', fontSize: 9, margin: [0, 12, 0, 0]})};
  };
  let active = null;
  const close = () => {if(!active)return;clearInterval(active.timer);active.dialog.remove();active.trigger?.focus();active=null;};
  const open = ({title,subtitle='',html,current,downloadPdf=false,assessmentKind=''}) => {
    if(typeof current!=='function'||!current())throw Error('Contexto alterado. Recarregue antes de imprimir.');
    close();const trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.setAttribute('aria-label',`Prévia: ${title}`);
    Object.assign(dialog.style,{width:'min(1000px,94vw)',height:'90vh',padding:'16px',border:'1px solid #aaa'});
    dialog.innerHTML='<div style="display:flex;gap:12px;margin-bottom:12px"><button type="button" data-print-go>Imprimir / Salvar em PDF</button><button type="button" data-print-close>Fechar prévia</button></div><p role="status">Preparando documento…</p><iframe title="Documento para impressão" style="width:100%;height:75vh;border:1px solid #ddd"></iframe>';
    if(downloadPdf){dialog.querySelector('[data-print-go]').textContent='Imprimir';const save=document.createElement('button');save.type='button';save.dataset.pdfDownload='';save.textContent='Baixar PDF';save.disabled=true;dialog.firstElementChild.prepend(save);}
    document.body.append(dialog);const frame=dialog.querySelector('iframe');
    // Scripts/forms are prohibited in the document; only browser printing is allowed.
    frame.setAttribute('sandbox','allow-same-origin allow-modals');
    const button=dialog.querySelector('[data-print-go]');button.disabled=true;
    const save=dialog.querySelector('[data-pdf-download]');let invalid=false;
    const valid=()=>dialog.isConnected&&current()&&!invalid;
    const invalidate=()=>{if(!current()&&!invalid){invalid=true;if(save)save.disabled=true;frame.srcdoc='<p>Contexto alterado. Feche e consulte novamente.</p>';button.disabled=true;dialog.querySelector('[role=status]').textContent='Sessão, escola ou filtro alterado.';return true;}return invalid;};
    // Insert no extra markup or CSS at all for answers, diary, attendance or other surfaces.
    const assessmentStyles = ['student','teacher'].includes(assessmentKind) ? `<style data-assessment-layout>
      @media print {
        main>article{break-inside:avoid-page;page-break-inside:avoid}
        .qb-answer-summary{display:table}
        .qb-answer-summary thead{display:table-header-group;break-inside:avoid;page-break-inside:avoid}
        .qb-answer-summary tbody{display:table-row-group}
        .qb-answer-summary tr{break-inside:avoid-page;page-break-inside:avoid}
      }
      .qb-preview-meta .qb-print-write-field{grid-column:1/-1;display:flex;align-items:baseline;gap:8px}
      .qb-print-write-field>b{white-space:nowrap}
      .qb-print-write-line{flex:1;min-width:0;border-bottom:1px solid #555;height:1em}
    </style>` : '';
    const enemStudentSpacingStyles = assessmentKind === 'student' ? `<style data-enem-student-spacing>
      @media print {
        main > article.qb-enem-rich{break-inside:auto;page-break-inside:auto}
        main > article.qb-enem-rich > p{margin:6px 0}
        main > article.qb-enem-rich > h3{margin-bottom:6px}
        main > article.qb-enem-rich > .qb-alternatives > li{break-inside:avoid;page-break-inside:avoid}
        main > article.qb-enem-rich:has(+ article.qb-enem-rich){margin-bottom:12px}
        main > article.qb-enem-rich + article.qb-enem-rich{margin-top:12px;padding-top:8px}
        main > article.qb-enem-rich > figure > img{max-width:min(100%,400px)!important;height:auto}
      }
    </style>` : '';
    const printFooterStyles = ['teacher','answers'].includes(assessmentKind) ? '<style>@media print{body > footer.rs-print-generated-footer{display:none}}</style>' : '';
    const doc=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:11pt Arial,sans-serif;color:#111;margin:0;padding:16px;background:white}h1{font-size:19pt}h2{font-size:14pt;break-after:avoid}h3{font-size:11pt;break-after:avoid}p,.text,td{overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.4}.text{margin-bottom:16px}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:16px 0}thead{display:table-header-group}th,td{border:1px solid #888;padding:7px;text-align:left}tr{break-inside:avoid}article{margin:20px 0}article+article{border-top:1px solid #777;padding-top:12px}img{max-width:100%}.is-correct{font-weight:bold}.qb-preview-cover{display:grid;gap:4px;text-align:center;border-bottom:1px solid #555;padding-bottom:10px}.qb-preview-cover>*{display:block}.qb-preview-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;padding:12px;border:1px solid #999;margin:16px 0;font-size:10pt}.qb-preview-meta span{min-width:0;overflow-wrap:anywhere}.qb-alternatives{list-style:none;padding-left:0}.qb-alternatives li{margin:8px 0}.qb-preview-sheet{overflow:visible!important;max-height:none!important}button{display:none}footer{font-size:9pt;margin-top:20px}@media print{body{padding:0}h1,h2,h3{break-after:avoid}}</style>${assessmentStyles}${printFooterStyles}${enemStudentSpacingStyles}</head><body><header><h1>${escape(title)}</h1><p>${escape(subtitle)}</p></header><main>${html}</main><footer class="rs-print-generated-footer">Raízes e Saberes · Consulta para impressão · ${escape(new Date().toLocaleString('pt-BR'))}</footer></body></html>`;
    frame.addEventListener('load',async()=>{
      if(invalidate())return;
      await frame.contentDocument.fonts.ready;
      await Promise.all([...frame.contentDocument.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
      if(!valid()||invalidate())return;button.disabled=false;
      dialog.querySelector('[role=status]').textContent=downloadPdf?'Documento A4. Baixe o PDF ou abra a impressão.':'Confira o documento. Na janela de impressão, escolha a impressora ou Salvar como PDF.';
      if(save){try{await loadPdf();if(valid())save.disabled=false;}catch(error){if(valid())dialog.querySelector('[role=status]').textContent=error.message+' A impressão continua disponível.';}}

    },{once:true});frame.srcdoc=doc;
    dialog.querySelector('[data-print-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    if(save)save.onclick=async()=>{
      if(!valid()||invalidate())return;save.disabled=true;
      const status=dialog.querySelector('[role=status]');status.textContent='Gerando PDF A4…';
      try {
        const definition=pdfDefinition(frame.contentDocument);
        const blob=await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('Tempo de geração excedido.')),120000);
          try{window.pdfMake.createPdf(definition).getBlob(blob=>{clearTimeout(timer);resolve(blob);});}
          catch(error){clearTimeout(timer);reject(error);}
        });
        if(!valid()||invalidate())return;
        const url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;link.download=(title.replace(/[^a-zA-Z0-9À-ÿ _-]/g,'').trim()||'documento')+'.pdf';
        document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
        status.textContent='PDF A4 gerado. Confira os downloads do navegador.';
      }catch(error){if(valid())status.textContent='Não foi possível gerar o PDF. Tente novamente ou use Imprimir.';}
      finally{if(valid())save.disabled=false;}
    };
    button.onclick=()=>{if(!invalidate()){frame.contentWindow.focus();frame.contentWindow.print();}};
    active={dialog,trigger,timer:setInterval(invalidate,500)};dialog.showModal();button.focus();
  };
  window.RSPrint={escape,table,diary,open,close};
})();
