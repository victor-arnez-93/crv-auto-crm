// static/js/admin/leads-tabs.js
// Sub-abas em Leads: Lista | Funil (Kanban) | Atendimento (WhatsApp + follow-up)
// Carregar DEPOIS de: supabase.js, core/whatsapp.js, admin/leads.js
// Estilos: static/css/admin/leads-tabs.css
(function () {
  const tbody = document.getElementById('leadsTable');
  if (!tbody) return;
  const tabela = tbody.closest('table') || tbody;
  const wrap = tabela.closest('.admin-table-wrap') || tabela;  // alterna a tabela INTEIRA (com o scroll)
  const host = wrap.parentElement;
  const ETAPAS = ['novo','contato','negociacao','proposta','ganho','perdido'];

  const tabs = document.createElement('div');
  tabs.className = 'cfx-tabs';
  tabs.innerHTML =
    '<button class="cfx-tab active" data-tab="lista">Lista</button>' +
    '<button class="cfx-tab" data-tab="funil">Funil</button>' +
    '<button class="cfx-tab" data-tab="atendimento">Atendimento</button>';

  const funil = document.createElement('div'); funil.className = 'cfx-panel'; funil.id = 'cfxFunil';
  funil.innerHTML = '<div class="cfx-board" id="cfxBoard"></div>';
  const atend = document.createElement('div'); atend.className = 'cfx-panel'; atend.id = 'cfxAtend';
  atend.innerHTML = '<div class="cfx-at" id="cfxAtList"></div>';

  host.insertBefore(tabs, wrap);
  host.insertBefore(funil, wrap.nextSibling);
  host.insertBefore(atend, funil.nextSibling);

  function ativo(){ const b = tabs.querySelector('.cfx-tab.active'); return b ? b.dataset.tab : 'lista'; }
  function lista(){ return (typeof obterLeadsFiltrados === 'function') ? obterLeadsFiltrados() : (typeof leads !== 'undefined' ? leads : []); }

  function setTab(tab){
    tabs.querySelectorAll('.cfx-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    wrap.style.display = (tab === 'lista') ? '' : 'none';
    funil.classList.toggle('active', tab === 'funil');
    atend.classList.toggle('active', tab === 'atendimento');
    if (tab === 'funil') renderFunil();
    if (tab === 'atendimento') renderAtendimento();
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('.cfx-tab'); if (b) setTab(b.dataset.tab); });

  /* ---- FUNIL ---- */
  function renderFunil(){
    const board = document.getElementById('cfxBoard');
    const dados = lista();
    board.innerHTML = ETAPAS.map(et => {
      const itens = dados.filter(l => (l.etapa || 'novo') === et);
      const cards = itens.map(l => {
        const wa = obterLinkWhatsapp(l.telefone), veic = obterNomeVeiculo(l.veiculo_id);
        return '<div class="cfx-card" draggable="true" data-id="' + l.id + '">' +
            '<b>' + limparTextoHTML(l.nome) + '</b>' +
            (veic ? '<small>' + limparTextoHTML(veic) + '</small>' : '') +
            '<small>' + limparTextoHTML(l.telefone || '') + '</small>' +
            (wa ? '<a class="cfx-wa" href="' + wa + '" target="_blank" rel="noopener">WhatsApp ↗</a>' : '') +
          '</div>';
      }).join('') || '<span class="cfx-empty">—</span>';
      return '<div class="cfx-col" data-etapa="' + et + '">' +
          '<div class="cfx-col-h"><span>' + limparTextoHTML(nomeEtapa(et)) + '</span><span class="n">' + itens.length + '</span></div>' +
          cards + '</div>';
    }).join('');

    let dragId = null;
    board.querySelectorAll('.cfx-card').forEach(c => c.addEventListener('dragstart', () => { dragId = c.dataset.id; }));
    board.querySelectorAll('.cfx-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('drag');
        if (!dragId) return;
        try {
          await WhatsAppCRM.moverEtapa(dragId, col.dataset.etapa);
          if (typeof carregarLeads === 'function') await carregarLeads();
          renderFunil();
        } catch (err) { alert(err.message || 'Erro ao mover etapa.'); }
        dragId = null;
      });
    });
  }

  /* ---- ATENDIMENTO ---- */
  function renderAtendimento(){
    const boxEl = document.getElementById('cfxAtList');
    const agora = new Date();
    const dados = lista().slice().sort((a,b) => {
      const pa = a.proximo_contato_at ? new Date(a.proximo_contato_at) : new Date(8640000000000000);
      const pb = b.proximo_contato_at ? new Date(b.proximo_contato_at) : new Date(8640000000000000);
      return pa - pb;
    });
    if (!dados.length){ boxEl.innerHTML = '<span class="cfx-empty">Nenhum lead.</span>'; return; }
    boxEl.innerHTML = dados.map(l => {
      const atrasado = l.proximo_contato_at && new Date(l.proximo_contato_at) < agora;
      const veic = obterNomeVeiculo(l.veiculo_id), temp = l.temperatura || 'morno';
      const dataVal = l.proximo_contato_at ? String(l.proximo_contato_at).slice(0,10) : '';
      return '<div class="cfx-at-row ' + (atrasado ? 'atrasado' : '') + '" data-id="' + l.id + '">' +
          '<div class="nome"><b>' + limparTextoHTML(l.nome) + '</b><small>' +
            limparTextoHTML(veic || l.telefone || '') + (l.ultimo_contato_at ? ' · últ: ' + formatarData(l.ultimo_contato_at) : '') + '</small></div>' +
          '<select class="cfx-sel cfx-temp" title="Temperatura">' +
            '<option value="frio"' + (temp==='frio'?' selected':'') + '>🔵 Frio</option>' +
            '<option value="morno"' + (temp==='morno'?' selected':'') + '>🟡 Morno</option>' +
            '<option value="quente"' + (temp==='quente'?' selected':'') + '>🔴 Quente</option>' +
          '</select>' +
          '<input type="date" class="cfx-date" value="' + dataVal + '" title="Próximo contato">' +
          '<button class="cfx-btn wa">WhatsApp</button>' +
          '<button class="cfx-btn hist">Histórico</button>' +
          '<div class="cfx-hist"></div>' +
        '</div>';
    }).join('');

    boxEl.querySelectorAll('.cfx-at-row').forEach(row => {
      const id = row.dataset.id, l = (lista().find(x => x.id === id)) || {};
      row.querySelector('.cfx-temp').addEventListener('change', async e => {
        try { await WhatsAppCRM.agendarFollowUp(id, { temperatura: e.target.value }); if (typeof carregarLeads === 'function') await carregarLeads(); }
        catch (err) { alert(err.message); }
      });
      row.querySelector('.cfx-date').addEventListener('change', async e => {
        const val = e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : null;
        try { await WhatsAppCRM.agendarFollowUp(id, { proximo_contato_at: val }); if (typeof carregarLeads === 'function') await carregarLeads(); }
        catch (err) { alert(err.message); }
      });
      row.querySelector('.cfx-btn.wa').addEventListener('click', async () => {
        const msg = 'Olá ' + (l.nome || '') + ', tudo bem? Sou da equipe e quero te ajudar com seu interesse.';
        await WhatsAppCRM.abrirEAtender({ telefone: l.telefone, mensagem: msg, lead_id: id, cliente_id: l.cliente_id || null, veiculo_id: l.veiculo_id || null });
        if (typeof carregarLeads === 'function') await carregarLeads();
      });
      const hist = row.querySelector('.cfx-hist');
      row.querySelector('.cfx-btn.hist').addEventListener('click', async () => {
        if (hist.classList.contains('open')) { hist.classList.remove('open'); return; }
        hist.classList.add('open'); hist.innerHTML = '<div class="i">Carregando...</div>';
        try {
          const its = await WhatsAppCRM.listarInteracoes({ lead_id: id, limit: 20 });
          hist.innerHTML = its.length
            ? its.map(i => '<div class="i">' + formatarData(i.created_at) + ' · ' + i.canal + ' · ' + (i.sentido==='entrada'?'↘':'↗') + ' ' + limparTextoHTML(i.mensagem || '') + '</div>').join('')
            : '<div class="i">Sem interações ainda.</div>';
        } catch (err) { hist.innerHTML = '<div class="i">Erro: ' + limparTextoHTML(err.message) + '</div>'; }
      });
    });
  }

  /* ---- sincroniza com o fluxo do leads.js ---- */
  if (typeof renderizarLeads === 'function') {
    const _orig = renderizarLeads;
    renderizarLeads = function () {
      _orig.apply(this, arguments);
      const t = ativo();
      if (t !== 'lista') wrap.style.display = 'none';
      if (t === 'funil') renderFunil();
      else if (t === 'atendimento') renderAtendimento();
    };
  }
  ['buscaLeads','filtroEtapaLead','filtroOrigemLead','filtroOrdemLead'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const fn = () => { const t = ativo(); if (t === 'funil') renderFunil(); else if (t === 'atendimento') renderAtendimento(); };
      el.addEventListener('input', fn); el.addEventListener('change', fn);
    }
  });
})();