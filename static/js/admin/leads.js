/* ============================================================
   MAXX VEÍCULOS — LEADS.JS
   Supabase Auth · Funil Comercial · Multiempresa
   ============================================================ */

let leads = [];
let veiculos = [];
let empresaIdAtual = null;
let leadsAutoRefreshTimer = null;
let carregandoLeads = false;

async function protegerAdmin() {
  if (!window.MAXX_SUPABASE) {
    window.location.href = 'login.html';
    return false;
  }

  const { data } = await window.MAXX_SUPABASE.auth.getSession();

  if (!data.session) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

const logoutBtn = document.getElementById('logoutBtn');

const novoLeadBtn = document.getElementById('novoLeadBtn');
const leadModal = document.getElementById('leadModal');
const leadForm = document.getElementById('leadForm');
const leadModalTitle = document.getElementById('leadModalTitle');

const fecharLeadModalBtn = document.getElementById('fecharLeadModalBtn');
const cancelarLeadBtn = document.getElementById('cancelarLeadBtn');

const leadsTable = document.getElementById('leadsTable');
const leadsEmpty = document.getElementById('leadsEmpty');

const buscaLeads = document.getElementById('buscaLeads');
const filtroEtapaLead = document.getElementById('filtroEtapaLead');
const filtroOrigemLead = document.getElementById('filtroOrigemLead');
const filtroOrdemLead = document.getElementById('filtroOrdemLead');

const statTotalLeads = document.getElementById('statTotalLeads');
const statLeadsNovos = document.getElementById('statLeadsNovos');
const statLeadsNegociacao = document.getElementById('statLeadsNegociacao');

function capitalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((palavra) => {
      const excecoes = ['de', 'da', 'do', 'das', 'dos', 'e'];
      if (excecoes.includes(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarTelefone(valor) {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function limparTextoHTML(valor) {
  return String(valor || '')
    .replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
}

function formatarData(dataISO) {
  if (!dataISO) return '-';

  return new Date(dataISO).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}

function obterLinkWhatsapp(numero) {
  const numeros = somenteNumeros(numero);
  if (!numeros) return null;

  const numeroFinal = numeros.startsWith('55') ? numeros : `55${numeros}`;
  return `https://wa.me/${numeroFinal}`;
}

function nomeEtapa(etapa) {
  const nomes = {
    novo: 'Novo',
    contato: 'Contato',
    negociacao: 'Negociação',
    proposta: 'Proposta',
    ganho: 'Ganho',
    perdido: 'Perdido'
  };

  return nomes[etapa] || etapa || 'Novo';
}

function obterNomeVeiculo(id) {
  const veiculo = veiculos.find((item) => item.id === id);
  if (!veiculo) return '';

  return `${veiculo.marca} ${veiculo.modelo} ${veiculo.ano || ''}`.trim();
}

/* ==================== MÁSCARAS ==================== */

document.getElementById('leadTelefone')?.addEventListener('input', (event) => {
  event.target.value = formatarTelefone(event.target.value);
});

document.getElementById('leadNome')?.addEventListener('blur', (event) => {
  event.target.value = capitalizarTexto(event.target.value);
});

/* ==================== SUPABASE ==================== */

async function carregarVeiculosSelect() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('veiculos')
    .select('id, marca, modelo, ano, vendido, ativo')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  veiculos = data || [];

  const leadVeiculo = document.getElementById('leadVeiculo');
  if (!leadVeiculo) return;

  leadVeiculo.innerHTML = '<option value="">Nenhum veículo vinculado</option>';

  veiculos.forEach((veiculo) => {
    const status = veiculo.vendido ? ' — Vendido' : '';
    leadVeiculo.insertAdjacentHTML(
      'beforeend',
      `<option value="${veiculo.id}">${limparTextoHTML(`${veiculo.marca} ${veiculo.modelo} ${veiculo.ano || ''}${status}`)}</option>`
    );
  });
}

async function carregarLeads() {
  if (carregandoLeads) return;

  carregandoLeads = true;
  const { data, error } = await window.MAXX_SUPABASE
    .from('leads')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    carregandoLeads = false;
    return;
  }

  leads = data || [];

  popularFiltroOrigem();
  renderizarLeads();

  carregandoLeads = false;
}

function obterDadosFormulario() {
  const veiculoId = document.getElementById('leadVeiculo').value || null;

  return {
    empresa_id: empresaIdAtual,
    veiculo_id: veiculoId,
    nome: capitalizarTexto(document.getElementById('leadNome').value),
    telefone: document.getElementById('leadTelefone').value.trim(),
    email: document.getElementById('leadEmail').value.trim().toLowerCase(),
    origem: document.getElementById('leadOrigem').value.trim(),
    etapa: document.getElementById('leadEtapa').value,
    mensagem: document.getElementById('leadMensagem').value.trim(),
    observacoes: document.getElementById('leadObservacoes').value.trim(),
    updated_at: new Date().toISOString()
  };
}

/* ==================== MODAL ==================== */

function abrirLeadModal(lead = null) {
  leadForm.reset();
  document.getElementById('leadId').value = '';

  if (lead) {
    leadModalTitle.textContent = 'Editar lead';

    document.getElementById('leadId').value = lead.id;
    document.getElementById('leadNome').value = lead.nome || '';
    document.getElementById('leadTelefone').value = lead.telefone || '';
    document.getElementById('leadEmail').value = lead.email || '';
    document.getElementById('leadOrigem').value = lead.origem || '';
    document.getElementById('leadEtapa').value = lead.etapa || 'novo';
    document.getElementById('leadVeiculo').value = lead.veiculo_id || '';
    document.getElementById('leadMensagem').value = lead.mensagem || '';
    document.getElementById('leadObservacoes').value = lead.observacoes || '';
  } else {
    leadModalTitle.textContent = 'Novo lead';
    document.getElementById('leadEtapa').value = 'novo';
  }

  leadModal.classList.add('open');
}

function fecharLeadModal() {
  leadModal.classList.remove('open');
}

/* ==================== FILTROS ==================== */

function popularFiltroOrigem() {
  if (!filtroOrigemLead) return;

  const origemAtual = filtroOrigemLead.value;
  const origens = [...new Set(leads.map((lead) => lead.origem).filter(Boolean))].sort();

  filtroOrigemLead.innerHTML = '<option value="">Origem: Todas</option>';

  origens.forEach((origem) => {
    filtroOrigemLead.insertAdjacentHTML(
      'beforeend',
      `<option value="${limparTextoHTML(origem)}">${limparTextoHTML(origem)}</option>`
    );
  });

  filtroOrigemLead.value = origemAtual;
}

function obterLeadsFiltrados() {
  const termo = buscaLeads?.value.trim().toLowerCase() || '';
  const etapa = filtroEtapaLead?.value || '';
  const origem = filtroOrigemLead?.value || '';
  const ordem = filtroOrdemLead?.value || 'recentes';

  let filtrados = leads.filter((lead) => {
    const texto = [
      lead.nome,
      lead.telefone,
      lead.email,
      lead.origem,
      lead.etapa,
      lead.mensagem,
      lead.observacoes,
      obterNomeVeiculo(lead.veiculo_id)
    ].join(' ').toLowerCase();

    if (termo && !texto.includes(termo)) return false;
    if (etapa && lead.etapa !== etapa) return false;
    if (origem && lead.origem !== origem) return false;

    return true;
  });

  filtrados = ordenarLeads(filtrados, ordem);

  return filtrados;
}

function ordenarLeads(lista, ordem) {
  return [...lista].sort((a, b) => {
    if (ordem === 'nome') {
      return String(a.nome || '').localeCompare(String(b.nome || ''));
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

/* ==================== RENDER ==================== */

function renderizarLeads() {
  const filtrados = obterLeadsFiltrados();

  leadsTable.innerHTML = '';
  leadsEmpty.style.display = filtrados.length ? 'none' : 'block';

  filtrados.forEach((lead) => {
    const tr = document.createElement('tr');

    const whatsappLink = obterLinkWhatsapp(lead.telefone);
    const veiculoNome = obterNomeVeiculo(lead.veiculo_id);

    tr.innerHTML = `
      <td>
        <div class="lead-info">
          <strong>${limparTextoHTML(lead.nome)}</strong>
          <span>${limparTextoHTML(lead.email || 'Sem e-mail')}</span>
          ${veiculoNome ? `<span>${limparTextoHTML(veiculoNome)}</span>` : ''}
          ${
            lead.mensagem
              ? `<span class="lead-preview">${limparTextoHTML(lead.mensagem)}</span>`
              : ''
          }
        </div>
      </td>

      <td>
        <div class="lead-contato">
          ${
            whatsappLink
              ? `<a href="${whatsappLink}" target="_blank">${limparTextoHTML(lead.telefone || '-')}</a>`
              : `<span>${limparTextoHTML(lead.telefone || '-')}</span>`
          }
        </div>
      </td>

      <td>
        <span class="lead-origem">${limparTextoHTML(lead.origem || 'Não informado')}</span>
      </td>

      <td>
        <span class="lead-etapa ${limparTextoHTML(lead.etapa || 'novo')}">
          ${limparTextoHTML(nomeEtapa(lead.etapa))}
        </span>
      </td>

      <td>${formatarData(lead.created_at)}</td>

      <td>
        <div class="admin-actions">
          <button class="admin-icon-btn" onclick="editarLead('${lead.id}')" title="Editar">✎</button>
          <button class="admin-icon-btn" onclick="excluirLead('${lead.id}')" title="Excluir">×</button>
        </div>
      </td>
    `;

    leadsTable.appendChild(tr);
  });

  atualizarStats();
}

function atualizarStats() {
  const total = leads.length;
  const novos = leads.filter((lead) => lead.etapa === 'novo').length;
  const negociacao = leads.filter((lead) => lead.etapa === 'negociacao').length;

  statTotalLeads.textContent = total;
  statLeadsNovos.textContent = novos;
  statLeadsNegociacao.textContent = negociacao;
}

/* ==================== AÇÕES ==================== */

function editarLead(id) {
  const lead = leads.find((item) => item.id === id);
  if (lead) abrirLeadModal(lead);
}

async function excluirLead(id) {
  const lead = leads.find((item) => item.id === id);
  if (!lead) return;

  const confirmar = confirm(`Excluir lead ${lead.nome}?`);
  if (!confirmar) return;

  const { error } = await window.MAXX_SUPABASE
    .from('leads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    alert('Erro ao excluir lead.');
    return;
  }

  await carregarLeads();
}

/* ==================== LOGOUT ==================== */

const logoutModal = document.getElementById('logoutModal');
const fecharLogoutModalBtn = document.getElementById('fecharLogoutModalBtn');
const cancelarLogoutBtn = document.getElementById('cancelarLogoutBtn');
const confirmarLogoutBtn = document.getElementById('confirmarLogoutBtn');

function abrirLogoutModal() {
  logoutModal?.classList.add('open');
}

function fecharLogoutModal() {
  logoutModal?.classList.remove('open');
}

logoutBtn?.addEventListener('click', abrirLogoutModal);
fecharLogoutModalBtn?.addEventListener('click', fecharLogoutModal);
cancelarLogoutBtn?.addEventListener('click', fecharLogoutModal);

logoutModal?.addEventListener('click', (event) => {
  if (event.target === logoutModal) fecharLogoutModal();
});

confirmarLogoutBtn?.addEventListener('click', async () => {
  confirmarLogoutBtn.disabled = true;
  confirmarLogoutBtn.textContent = 'Saindo...';

  await window.MAXX_SUPABASE.auth.signOut();
  window.location.href = 'login.html';
});

/* ==================== EVENTOS ==================== */

novoLeadBtn?.addEventListener('click', () => abrirLeadModal());

fecharLeadModalBtn?.addEventListener('click', fecharLeadModal);
cancelarLeadBtn?.addEventListener('click', fecharLeadModal);

leadModal?.addEventListener('click', (event) => {
  if (event.target === leadModal) fecharLeadModal();
});

[
  buscaLeads,
  filtroEtapaLead,
  filtroOrigemLead,
  filtroOrdemLead
].forEach((campo) => {
  campo?.addEventListener('input', renderizarLeads);
  campo?.addEventListener('change', renderizarLeads);
});

leadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitBtn = leadForm.querySelector('button[type="submit"]');
  const idAtual = document.getElementById('leadId').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const dados = obterDadosFormulario();

    if (idAtual) {
      const { error } = await window.MAXX_SUPABASE
        .from('leads')
        .update(dados)
        .eq('id', idAtual);

      if (error) throw error;
    } else {
      const { error } = await window.MAXX_SUPABASE
        .from('leads')
        .insert(dados);

      if (error) throw error;
    }

    await carregarLeads();
    fecharLeadModal();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar lead.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar lead';
  }
});

/* ==================== INIT ==================== */

(async () => {
  const ok = await protegerAdmin();
  if (!ok) return;

  const empresa = await carregarEmpresaAtual();

  if (!empresa) {
    alert('Nenhuma empresa vinculada ao usuário.');
    return;
  }

  empresaIdAtual = empresa.id;

  await carregarVeiculosSelect();
  await carregarLeads();

  leadsAutoRefreshTimer = setInterval(async () => {
    await carregarLeads();
  }, 30000);
})();