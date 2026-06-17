/* ============================================================
   MAXX VEÍCULOS — PROPOSTAS.JS
   Supabase Auth · Propostas · Multiempresa
   ============================================================ */

let propostas = [];
let clientes = [];
let leads = [];
let veiculos = [];
let empresaIdAtual = null;

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

const novaPropostaBtn = document.getElementById('novaPropostaBtn');
const propostaModal = document.getElementById('propostaModal');
const propostaForm = document.getElementById('propostaForm');
const propostaModalTitle = document.getElementById('propostaModalTitle');

const fecharPropostaModalBtn = document.getElementById('fecharPropostaModalBtn');
const cancelarPropostaBtn = document.getElementById('cancelarPropostaBtn');

const propostasTable = document.getElementById('propostasTable');
const propostasEmpty = document.getElementById('propostasEmpty');

const buscaPropostas = document.getElementById('buscaPropostas');
const filtroStatusProposta = document.getElementById('filtroStatusProposta');
const filtroOrdemProposta = document.getElementById('filtroOrdemProposta');

const statTotalPropostas = document.getElementById('statTotalPropostas');
const statPropostasAbertas = document.getElementById('statPropostasAbertas');
const statPropostasVendidas = document.getElementById('statPropostasVendidas');

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarPrecoInput(valor) {
  const numeros = somenteNumeros(valor);
  if (!numeros) return '';

  const centavos = Number(numeros) / 100;

  return centavos.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function converterPrecoBR(valor) {
  const numeros = somenteNumeros(valor);
  if (!numeros) return 0;
  return Number(numeros) / 100;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarData(dataISO) {
  if (!dataISO) return '-';

  return new Date(dataISO).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
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

function nomeStatus(status) {
  const nomes = {
    aberta: 'Aberta',
    em_analise: 'Em análise',
    aprovada: 'Aprovada',
    recusada: 'Recusada',
    vendida: 'Vendida',
    cancelada: 'Cancelada'
  };

  return nomes[status] || status || 'Aberta';
}

function obterClienteNome(id) {
  const cliente = clientes.find((item) => item.id === id);
  return cliente?.nome || '';
}

function obterLeadNome(id) {
  const lead = leads.find((item) => item.id === id);
  return lead?.nome || '';
}

function obterVeiculoNome(id) {
  const veiculo = veiculos.find((item) => item.id === id);
  if (!veiculo) return '';

  return `${veiculo.marca} ${veiculo.modelo} ${veiculo.ano || ''}`.trim();
}

/* ==================== MÁSCARAS ==================== */

[
  'propostaValor',
  'propostaEntrada',
  'propostaValorParcela'
].forEach((id) => {
  const campo = document.getElementById(id);

  campo?.addEventListener('input', () => {
    campo.value = formatarPrecoInput(campo.value);
  });
});

document.getElementById('propostaParcelas')?.addEventListener('input', (event) => {
  event.target.value = somenteNumeros(event.target.value).slice(0, 3);
});

/* ==================== SELECTS ==================== */

async function carregarSelects() {
  const [clientesRes, leadsRes, veiculosRes] = await Promise.all([
    window.MAXX_SUPABASE
      .from('clientes')
      .select('id, nome, telefone, whatsapp')
      .eq('empresa_id', empresaIdAtual)
      .order('nome', { ascending: true }),

    window.MAXX_SUPABASE
      .from('leads')
      .select('id, nome, telefone, etapa')
      .eq('empresa_id', empresaIdAtual)
      .order('created_at', { ascending: false }),

    window.MAXX_SUPABASE
      .from('veiculos')
      .select('id, marca, modelo, ano, preco, vendido, ativo')
      .eq('empresa_id', empresaIdAtual)
      .order('created_at', { ascending: false })
  ]);

  if (clientesRes.error) console.error(clientesRes.error);
  if (leadsRes.error) console.error(leadsRes.error);
  if (veiculosRes.error) console.error(veiculosRes.error);

  clientes = clientesRes.data || [];
  leads = leadsRes.data || [];
  veiculos = veiculosRes.data || [];

  preencherSelectCliente();
  preencherSelectLead();
  preencherSelectVeiculo();
}

function preencherSelectCliente() {
  const select = document.getElementById('propostaCliente');
  if (!select) return;

  select.innerHTML = '<option value="">Nenhum cliente vinculado</option>';

  clientes.forEach((cliente) => {
    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${cliente.id}">${limparTextoHTML(cliente.nome)}</option>`
    );
  });
}

function preencherSelectLead() {
  const select = document.getElementById('propostaLead');
  if (!select) return;

  select.innerHTML = '<option value="">Nenhum lead vinculado</option>';

  leads.forEach((lead) => {
    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${lead.id}">${limparTextoHTML(lead.nome)} — ${limparTextoHTML(lead.etapa || 'novo')}</option>`
    );
  });
}

function preencherSelectVeiculo() {
  const select = document.getElementById('propostaVeiculo');
  if (!select) return;

  select.innerHTML = '<option value="">Nenhum veículo vinculado</option>';

  veiculos.forEach((veiculo) => {
    const status = veiculo.vendido ? ' — Vendido' : '';
    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${veiculo.id}">${limparTextoHTML(`${veiculo.marca} ${veiculo.modelo} ${veiculo.ano || ''}${status}`)}</option>`
    );
  });
}

/* ==================== SUPABASE ==================== */

async function carregarPropostas() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('propostas')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    alert('Erro ao carregar propostas.');
    return;
  }

  propostas = data || [];

  renderizarPropostas();
}

function obterDadosFormulario() {
  return {
    empresa_id: empresaIdAtual,
    cliente_id: document.getElementById('propostaCliente').value || null,
    lead_id: document.getElementById('propostaLead').value || null,
    veiculo_id: document.getElementById('propostaVeiculo').value || null,
    valor_proposta: converterPrecoBR(document.getElementById('propostaValor').value),
    valor_entrada: converterPrecoBR(document.getElementById('propostaEntrada').value),
    qtd_parcelas: Number(somenteNumeros(document.getElementById('propostaParcelas').value) || 0),
    valor_parcela: converterPrecoBR(document.getElementById('propostaValorParcela').value),
    status: document.getElementById('propostaStatus').value,
    observacoes: document.getElementById('propostaObservacoes').value.trim(),
    updated_at: new Date().toISOString()
  };
}

/* ==================== MODAL ==================== */

function abrirPropostaModal(proposta = null) {
  propostaForm.reset();
  document.getElementById('propostaId').value = '';

  if (proposta) {
    propostaModalTitle.textContent = 'Editar proposta';

    document.getElementById('propostaId').value = proposta.id;
    document.getElementById('propostaCliente').value = proposta.cliente_id || '';
    document.getElementById('propostaLead').value = proposta.lead_id || '';
    document.getElementById('propostaVeiculo').value = proposta.veiculo_id || '';
    document.getElementById('propostaValor').value = proposta.valor_proposta
      ? formatarPrecoInput(String(Math.round(Number(proposta.valor_proposta) * 100)))
      : '';
    document.getElementById('propostaEntrada').value = proposta.valor_entrada
      ? formatarPrecoInput(String(Math.round(Number(proposta.valor_entrada) * 100)))
      : '';
    document.getElementById('propostaParcelas').value = proposta.qtd_parcelas || '';
    document.getElementById('propostaValorParcela').value = proposta.valor_parcela
      ? formatarPrecoInput(String(Math.round(Number(proposta.valor_parcela) * 100)))
      : '';
    document.getElementById('propostaStatus').value = proposta.status || 'aberta';
    document.getElementById('propostaObservacoes').value = proposta.observacoes || '';
  } else {
    propostaModalTitle.textContent = 'Nova proposta';
    document.getElementById('propostaStatus').value = 'aberta';
  }

  propostaModal.classList.add('open');
}

function fecharPropostaModal() {
  propostaModal.classList.remove('open');
}

/* ==================== FILTROS ==================== */

function obterPropostasFiltradas() {
  const termo = buscaPropostas?.value.trim().toLowerCase() || '';
  const status = filtroStatusProposta?.value || '';
  const ordem = filtroOrdemProposta?.value || 'recentes';

  let filtradas = propostas.filter((proposta) => {
    const texto = [
      obterClienteNome(proposta.cliente_id),
      obterLeadNome(proposta.lead_id),
      obterVeiculoNome(proposta.veiculo_id),
      proposta.status,
      proposta.valor_proposta,
      proposta.observacoes
    ].join(' ').toLowerCase();

    if (termo && !texto.includes(termo)) return false;
    if (status && proposta.status !== status) return false;

    return true;
  });

  filtradas = ordenarPropostas(filtradas, ordem);

  return filtradas;
}

function ordenarPropostas(lista, ordem) {
  return [...lista].sort((a, b) => {
    if (ordem === 'valor-desc') {
      return Number(b.valor_proposta || 0) - Number(a.valor_proposta || 0);
    }

    if (ordem === 'valor-asc') {
      return Number(a.valor_proposta || 0) - Number(b.valor_proposta || 0);
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

/* ==================== RENDER ==================== */

function renderizarPropostas() {
  const filtradas = obterPropostasFiltradas();

  propostasTable.innerHTML = '';
  propostasEmpty.style.display = filtradas.length ? 'none' : 'block';

  filtradas.forEach((proposta) => {
    const tr = document.createElement('tr');

    const clienteNome = obterClienteNome(proposta.cliente_id) || obterLeadNome(proposta.lead_id) || 'Sem cliente';
    const veiculoNome = obterVeiculoNome(proposta.veiculo_id) || 'Sem veículo';

    tr.innerHTML = `
      <td>
        <div class="proposta-info">
          <strong>${limparTextoHTML(clienteNome)}</strong>
          <span>${proposta.lead_id ? `Lead: ${limparTextoHTML(obterLeadNome(proposta.lead_id))}` : 'Cliente direto'}</span>
        </div>
      </td>

      <td>
        <div class="proposta-info">
          <strong>${limparTextoHTML(veiculoNome)}</strong>
          <span>${limparTextoHTML(proposta.observacoes || '')}</span>
        </div>
      </td>

      <td class="proposta-money">${formatarMoeda(proposta.valor_proposta)}</td>
      <td>${formatarMoeda(proposta.valor_entrada)}</td>
      <td>${Number(proposta.qtd_parcelas || 0)}x de ${formatarMoeda(proposta.valor_parcela)}</td>

      <td>
        <span class="proposta-status ${limparTextoHTML(proposta.status || 'aberta')}">
          ${limparTextoHTML(nomeStatus(proposta.status))}
        </span>
      </td>

      <td>${formatarData(proposta.created_at)}</td>

      <td>
        <div class="admin-actions">
          <button class="admin-icon-btn" onclick="editarProposta('${proposta.id}')" title="Editar">✎</button>
          <button class="admin-icon-btn" onclick="excluirProposta('${proposta.id}')" title="Excluir">×</button>
        </div>
      </td>
    `;

    propostasTable.appendChild(tr);
  });

  atualizarStats();
}

function atualizarStats() {
  statTotalPropostas.textContent = propostas.length;
  statPropostasAbertas.textContent = propostas.filter((p) => p.status === 'aberta').length;
  statPropostasVendidas.textContent = propostas.filter((p) => p.status === 'vendida').length;
}

/* ==================== AÇÕES ==================== */

function editarProposta(id) {
  const proposta = propostas.find((item) => item.id === id);
  if (proposta) abrirPropostaModal(proposta);
}

async function excluirProposta(id) {
  const proposta = propostas.find((item) => item.id === id);
  if (!proposta) return;

  const confirmar = confirm('Excluir esta proposta?');
  if (!confirmar) return;

  const { error } = await window.MAXX_SUPABASE
    .from('propostas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    alert('Erro ao excluir proposta.');
    return;
  }

  await carregarPropostas();
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

novaPropostaBtn?.addEventListener('click', () => abrirPropostaModal());

fecharPropostaModalBtn?.addEventListener('click', fecharPropostaModal);
cancelarPropostaBtn?.addEventListener('click', fecharPropostaModal);

propostaModal?.addEventListener('click', (event) => {
  if (event.target === propostaModal) fecharPropostaModal();
});

[
  buscaPropostas,
  filtroStatusProposta,
  filtroOrdemProposta
].forEach((campo) => {
  campo?.addEventListener('input', renderizarPropostas);
  campo?.addEventListener('change', renderizarPropostas);
});

propostaForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitBtn = propostaForm.querySelector('button[type="submit"]');
  const idAtual = document.getElementById('propostaId').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const dados = obterDadosFormulario();

    if (idAtual) {
      const { error } = await window.MAXX_SUPABASE
        .from('propostas')
        .update(dados)
        .eq('id', idAtual);

      if (error) throw error;
    } else {
      const { error } = await window.MAXX_SUPABASE
        .from('propostas')
        .insert(dados);

      if (error) throw error;
    }

    await carregarPropostas();
    fecharPropostaModal();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar proposta.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar proposta';
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

  await carregarSelects();
  await carregarPropostas();
})();