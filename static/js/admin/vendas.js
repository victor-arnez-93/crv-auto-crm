/* ============================================================
   MAXX VEÍCULOS — VENDAS.JS
   Supabase Auth · Vendas · Multiempresa
   ============================================================ */

let vendas = [];
let clientes = [];
let veiculos = [];
let propostas = [];
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

const novaVendaBtn = document.getElementById('novaVendaBtn');
const vendaModal = document.getElementById('vendaModal');
const vendaForm = document.getElementById('vendaForm');
const vendaModalTitle = document.getElementById('vendaModalTitle');

const fecharVendaModalBtn = document.getElementById('fecharVendaModalBtn');
const cancelarVendaBtn = document.getElementById('cancelarVendaBtn');

const vendasTable = document.getElementById('vendasTable');
const vendasEmpty = document.getElementById('vendasEmpty');

const buscaVendas = document.getElementById('buscaVendas');
const filtroFormaPagamentoVenda = document.getElementById('filtroFormaPagamentoVenda');
const filtroStatusVenda = document.getElementById('filtroStatusVenda');
const filtroOrdemVenda = document.getElementById('filtroOrdemVenda');

const statTotalVendas = document.getElementById('statTotalVendas');
const statVendasMes = document.getElementById('statVendasMes');
const statTicketMedio = document.getElementById('statTicketMedio');

function limparTextoHTML(valor) {
  return String(valor || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function moedaParaNumero(valor) {
  const numeros = somenteNumeros(valor);
  return Number(numeros || 0) / 100;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarData(dataISO) {
  if (!dataISO) return '-';

  return new Date(`${dataISO}T12:00:00`).toLocaleDateString('pt-BR');
}

function obterNomeCliente(id) {
  const cliente = clientes.find((item) => item.id === id);
  return cliente?.nome || '';
}

function obterNomeVeiculo(id) {
  const veiculo = veiculos.find((item) => item.id === id);
  if (!veiculo) return '';
  return `${veiculo.marca || ''} ${veiculo.modelo || ''} ${veiculo.ano || ''}`.trim();
}

function obterTextoProposta(id) {
  const proposta = propostas.find((item) => item.id === id);
  if (!proposta) return '';

  const cliente = obterNomeCliente(proposta.cliente_id);
  const veiculo = obterNomeVeiculo(proposta.veiculo_id);
  const valor = formatarMoeda(proposta.valor_proposta || 0);

  return `${cliente || 'Cliente'} · ${veiculo || 'Veículo'} · ${valor}`;
}

/* ==================== MÁSCARAS ==================== */

document.getElementById('vendaValor')?.addEventListener('input', (event) => {
  const numero = moedaParaNumero(event.target.value);
  event.target.value = formatarMoeda(numero);
});

/* ==================== CARREGAMENTOS ==================== */

async function carregarClientes() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('clientes')
    .select('id, nome, telefone, whatsapp, email')
    .eq('empresa_id', empresaIdAtual)
    .order('nome', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  clientes = data || [];

  const select = document.getElementById('vendaCliente');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um cliente</option>';

  clientes.forEach((cliente) => {
    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${cliente.id}">${limparTextoHTML(cliente.nome)}</option>`
    );
  });
}

async function carregarVeiculos() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('veiculos')
    .select('id, marca, modelo, ano, preco, status, vendido, ativo')
    .eq('empresa_id', empresaIdAtual)
    .eq('ativo', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  veiculos = data || [];

  const select = document.getElementById('vendaVeiculo');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um veículo</option>';

  veiculos.forEach((veiculo) => {
    const vendido = veiculo.status === 'vendido' || veiculo.vendido === true;
    const status = vendido ? ' — Vendido' : '';

    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${veiculo.id}">${limparTextoHTML(`${obterNomeVeiculo(veiculo.id)}${status}`)}</option>`
    );
  });
}

async function carregarPropostas() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('propostas')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  propostas = data || [];

  const select = document.getElementById('vendaProposta');
  if (!select) return;

  select.innerHTML = '<option value="">Nenhuma proposta vinculada</option>';

  propostas.forEach((proposta) => {
    select.insertAdjacentHTML(
      'beforeend',
      `<option value="${proposta.id}">${limparTextoHTML(obterTextoProposta(proposta.id))}</option>`
    );
  });
}

async function carregarVendas() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('vendas')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('data_venda', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    alert('Erro ao carregar vendas.');
    return;
  }

  vendas = data || [];
  renderizarVendas();
}

/* ==================== FILTROS ==================== */

function obterVendasFiltradas() {
  const termo = buscaVendas?.value.trim().toLowerCase() || '';
  const forma = filtroFormaPagamentoVenda?.value || '';
  const status = filtroStatusVenda?.value || '';
  const ordem = filtroOrdemVenda?.value || 'recentes';

  let lista = vendas.filter((venda) => {
    const texto = [
      venda.vendedor,
      venda.forma_pagamento,
      venda.status,
      venda.observacoes,
      obterNomeCliente(venda.cliente_id),
      obterNomeVeiculo(venda.veiculo_id)
    ].join(' ').toLowerCase();

    if (termo && !texto.includes(termo)) return false;
    if (forma && venda.forma_pagamento !== forma) return false;
    if (status && venda.status !== status) return false;

    return true;
  });

  lista = [...lista].sort((a, b) => {
    if (ordem === 'valor-desc') return Number(b.valor_venda || 0) - Number(a.valor_venda || 0);
    if (ordem === 'valor-asc') return Number(a.valor_venda || 0) - Number(b.valor_venda || 0);
    if (ordem === 'data') return new Date(b.data_venda || 0) - new Date(a.data_venda || 0);

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return lista;
}

/* ==================== RENDER ==================== */

function renderizarVendas() {
  const lista = obterVendasFiltradas();

  vendasTable.innerHTML = '';
  vendasEmpty.style.display = lista.length ? 'none' : 'block';

  lista.forEach((venda) => {
    const tr = document.createElement('tr');

    const clienteNome = obterNomeCliente(venda.cliente_id);
    const veiculoNome = obterNomeVeiculo(venda.veiculo_id);

    tr.innerHTML = `
      <td>
        <div class="venda-info">
          <strong>${limparTextoHTML(venda.vendedor || 'Venda')}</strong>
          <span>${limparTextoHTML(venda.observacoes || 'Sem observações')}</span>
        </div>
      </td>

      <td>
        <div class="venda-cliente">
          <strong>${limparTextoHTML(clienteNome || 'Cliente não informado')}</strong>
        </div>
      </td>

      <td>
        <div class="venda-veiculo">
          <strong>${limparTextoHTML(veiculoNome || 'Veículo não informado')}</strong>
        </div>
      </td>

      <td>
        <span class="venda-valor">${formatarMoeda(venda.valor_venda)}</span>
      </td>

      <td>
        <span class="venda-pagamento">${limparTextoHTML(venda.forma_pagamento || '-')}</span>
      </td>

      <td>
        <span class="venda-status ${limparTextoHTML(venda.status || 'concluida')}">
          ${limparTextoHTML(venda.status === 'cancelada' ? 'Cancelada' : 'Concluída')}
        </span>
      </td>

      <td>
        <span class="venda-data">${formatarData(venda.data_venda)}</span>
      </td>

      <td>
        <div class="admin-actions">
          <button class="admin-icon-btn" onclick="editarVenda('${venda.id}')" title="Editar">✎</button>
          <button class="admin-icon-btn" onclick="excluirVenda('${venda.id}')" title="Excluir">×</button>
        </div>
      </td>
    `;

    vendasTable.appendChild(tr);
  });

  atualizarStats();
}

function atualizarStats() {
  const vendasConcluidas = vendas.filter((venda) => venda.status !== 'cancelada');

  const total = vendasConcluidas.reduce((soma, venda) => {
    return soma + Number(venda.valor_venda || 0);
  }, 0);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const vendasMes = vendasConcluidas.filter((venda) => {
    if (!venda.data_venda) return false;
    const data = new Date(`${venda.data_venda}T12:00:00`);
    return data.getFullYear() === anoAtual && data.getMonth() === mesAtual;
  });

  const ticket = vendasConcluidas.length
    ? total / vendasConcluidas.length
    : 0;

  statTotalVendas.textContent = formatarMoeda(total);
  statVendasMes.textContent = vendasMes.length;
  statTicketMedio.textContent = formatarMoeda(ticket);
}

/* ==================== MODAL ==================== */

function abrirVendaModal(venda = null) {
  vendaForm.reset();

  document.getElementById('vendaId').value = '';
  document.getElementById('vendaData').value = new Date().toISOString().slice(0, 10);
  document.getElementById('vendaStatus').value = 'concluida';
  document.getElementById('vendaAtualizarEstoque').checked = true;
  document.getElementById('vendaGerarFinanceiro').checked = true;

  if (venda) {
    vendaModalTitle.textContent = 'Editar venda';

    document.getElementById('vendaId').value = venda.id;
    document.getElementById('vendaCliente').value = venda.cliente_id || '';
    document.getElementById('vendaVeiculo').value = venda.veiculo_id || '';
    document.getElementById('vendaProposta').value = venda.proposta_id || '';
    document.getElementById('vendaValor').value = formatarMoeda(venda.valor_venda || 0);
    document.getElementById('vendaFormaPagamento').value = venda.forma_pagamento || '';
    document.getElementById('vendaData').value = venda.data_venda || new Date().toISOString().slice(0, 10);
    document.getElementById('vendaVendedor').value = venda.vendedor || '';
    document.getElementById('vendaStatus').value = venda.status || 'concluida';
    document.getElementById('vendaObservacoes').value = venda.observacoes || '';

    document.getElementById('vendaAtualizarEstoque').checked = false;
    document.getElementById('vendaGerarFinanceiro').checked = false;
  } else {
    vendaModalTitle.textContent = 'Nova venda';
  }

  vendaModal.classList.add('open');
}

function fecharVendaModal() {
  vendaModal.classList.remove('open');
}

function obterDadosFormulario() {
  return {
    empresa_id: empresaIdAtual,
    cliente_id: document.getElementById('vendaCliente').value || null,
    veiculo_id: document.getElementById('vendaVeiculo').value || null,
    proposta_id: document.getElementById('vendaProposta').value || null,
    valor_venda: moedaParaNumero(document.getElementById('vendaValor').value),
    forma_pagamento: document.getElementById('vendaFormaPagamento').value,
    vendedor: document.getElementById('vendaVendedor').value.trim(),
    status: document.getElementById('vendaStatus').value,
    data_venda: document.getElementById('vendaData').value,
    observacoes: document.getElementById('vendaObservacoes').value.trim()
  };
}

/* ==================== AÇÕES INTEGRADAS ==================== */

async function marcarVeiculoVendido(veiculoId) {
  if (!veiculoId) return;

  const { error } = await window.MAXX_SUPABASE
    .from('veiculos')
    .update({
      vendido: true,
      status: 'vendido',
      updated_at: new Date().toISOString()
    })
    .eq('id', veiculoId)
    .eq('empresa_id', empresaIdAtual);

  if (error) throw error;
}

async function atualizarPropostaVendida(propostaId) {
  if (!propostaId) return;

  const { error } = await window.MAXX_SUPABASE
    .from('propostas')
    .update({
      status: 'vendida',
      updated_at: new Date().toISOString()
    })
    .eq('id', propostaId)
    .eq('empresa_id', empresaIdAtual);

  if (error) throw error;
}

async function gerarReceitaFinanceira(venda) {
  const { error } = await window.MAXX_SUPABASE
    .from('financeiro_lancamentos')
    .insert({
      empresa_id: empresaIdAtual,
      veiculo_id: venda.veiculo_id,
      cliente_id: venda.cliente_id,
      proposta_id: venda.proposta_id,
      tipo: 'receita',
      categoria: 'Venda de veículo',
      descricao: `Venda - ${obterNomeVeiculo(venda.veiculo_id) || 'Veículo'}`,
      valor: venda.valor_venda,
      data_lancamento: venda.data_venda,
      data_vencimento: venda.data_venda,
      pago: true,
      forma_pagamento: venda.forma_pagamento,
      observacoes: venda.observacoes
    });

  if (error) throw error;
}

/* ==================== CRUD ==================== */

function editarVenda(id) {
  const venda = vendas.find((item) => item.id === id);
  if (venda) abrirVendaModal(venda);
}

async function excluirVenda(id) {
  const venda = vendas.find((item) => item.id === id);
  if (!venda) return;

  const confirmar = confirm('Excluir esta venda?');
  if (!confirmar) return;

  const { error } = await window.MAXX_SUPABASE
    .from('vendas')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaIdAtual);

  if (error) {
    console.error(error);
    alert('Erro ao excluir venda.');
    return;
  }

  await carregarVendas();
}

vendaForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitBtn = vendaForm.querySelector('button[type="submit"]');
  const idAtual = document.getElementById('vendaId').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const dados = obterDadosFormulario();

    if (idAtual) {
      const { error } = await window.MAXX_SUPABASE
        .from('vendas')
        .update(dados)
        .eq('id', idAtual)
        .eq('empresa_id', empresaIdAtual);

      if (error) throw error;
    } else {
      const { error } = await window.MAXX_SUPABASE
        .from('vendas')
        .insert(dados);

      if (error) throw error;

      if (document.getElementById('vendaAtualizarEstoque').checked && dados.status === 'concluida') {
        await marcarVeiculoVendido(dados.veiculo_id);
      }

      if (dados.proposta_id && dados.status === 'concluida') {
        await atualizarPropostaVendida(dados.proposta_id);
      }

      if (document.getElementById('vendaGerarFinanceiro').checked && dados.status === 'concluida') {
        await gerarReceitaFinanceira(dados);
      }
    }

    await carregarVeiculos();
    await carregarPropostas();
    await carregarVendas();

    fecharVendaModal();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar venda.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar venda';
  }
});

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

novaVendaBtn?.addEventListener('click', () => abrirVendaModal());

fecharVendaModalBtn?.addEventListener('click', fecharVendaModal);
cancelarVendaBtn?.addEventListener('click', fecharVendaModal);

vendaModal?.addEventListener('click', (event) => {
  if (event.target === vendaModal) fecharVendaModal();
});

[
  buscaVendas,
  filtroFormaPagamentoVenda,
  filtroStatusVenda,
  filtroOrdemVenda
].forEach((campo) => {
  campo?.addEventListener('input', renderizarVendas);
  campo?.addEventListener('change', renderizarVendas);
});

document.getElementById('vendaProposta')?.addEventListener('change', () => {
  const propostaId = document.getElementById('vendaProposta').value;
  const proposta = propostas.find((item) => item.id === propostaId);

  if (!proposta) return;

  document.getElementById('vendaCliente').value = proposta.cliente_id || '';
  document.getElementById('vendaVeiculo').value = proposta.veiculo_id || '';

  if (proposta.valor_proposta) {
    document.getElementById('vendaValor').value = formatarMoeda(proposta.valor_proposta);
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

  await carregarClientes();
  await carregarVeiculos();
  await carregarPropostas();
  await carregarVendas();
})();