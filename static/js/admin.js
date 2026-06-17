/* ============================================================
   MAXX VEÍCULOS — ADMIN.JS
   Dashboard CRM · Supabase · Multiempresa
   ============================================================ */

const supabaseClient = window.MAXX_SUPABASE;
const BUCKET_VEICULOS = 'veiculos';

let empresaIdAtual = null;

const logoutBtn = document.getElementById('logoutBtn');
const logoutModal = document.getElementById('logoutModal');
const fecharLogoutModalBtn = document.getElementById('fecharLogoutModalBtn');
const cancelarLogoutBtn = document.getElementById('cancelarLogoutBtn');
const confirmarLogoutBtn = document.getElementById('confirmarLogoutBtn');

const statLeads = document.getElementById('statLeads');
const statLeadsHoje = document.getElementById('statLeadsHoje');
const statClientes = document.getElementById('statClientes');
const statPropostasAbertas = document.getElementById('statPropostasAbertas');
const statPropostasValor = document.getElementById('statPropostasValor');
const statVendasFechadas = document.getElementById('statVendasFechadas');
const statVendasValor = document.getElementById('statVendasValor');
const statConversao = document.getElementById('statConversao');
const statVeiculosAtivos = document.getElementById('statVeiculosAtivos');
const statVeiculosDisponiveis = document.getElementById('statVeiculosDisponiveis');

const funilNovos = document.getElementById('funilNovos');
const funilAtendimento = document.getElementById('funilAtendimento');
const funilPropostas = document.getElementById('funilPropostas');
const funilFechados = document.getElementById('funilFechados');

const listaLeadsRecentes = document.getElementById('listaLeadsRecentes');
const listaVeiculosDestaque = document.getElementById('listaVeiculosDestaque');

/* ==================== AUTH ==================== */

async function protegerAdmin() {
  if (!supabaseClient) {
    window.location.href = 'login.html';
    return false;
  }

  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

/* ==================== FORMATADORES ==================== */

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatarDataCurta(dataISO) {
  if (!dataISO) return 'Sem data';

  return new Date(dataISO).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

function normalizarStatus(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function obterUrlPublicaFoto(path) {
  if (!path) return '../static/img/placeholder-carro.jpg';
  if (String(path).startsWith('http')) return path;

  const { data } = supabaseClient.storage
    .from(BUCKET_VEICULOS)
    .getPublicUrl(path);

  return data.publicUrl;
}

function obterNomeLead(lead) {
  return lead.nome || lead.nome_cliente || lead.cliente_nome || 'Lead sem nome';
}

function obterContatoLead(lead) {
  return lead.telefone || lead.whatsapp || lead.email || 'Sem contato informado';
}

function obterVeiculoLead(lead) {
  return lead.veiculo_interesse || lead.veiculo || lead.modelo || lead.mensagem || 'Interesse não informado';
}

/* ==================== SUPABASE HELPERS ==================== */

async function buscarTabela(nomeTabela, select = '*') {
  const { data, error } = await supabaseClient
    .from(nomeTabela)
    .select(select)
    .eq('empresa_id', empresaIdAtual);

  if (error) {
    console.warn(`Erro ao carregar ${nomeTabela}:`, error);
    return [];
  }

  return data || [];
}

async function buscarLeads() {
  const { data, error } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Erro ao carregar leads:', error);
    return [];
  }

  return data || [];
}

async function buscarVeiculosDestaque() {
  const { data, error } = await supabaseClient
    .from('veiculos')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .eq('ativo', true)
    .eq('vendido', false)
    .order('destaque', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.warn('Erro ao carregar veículos:', error);
    return [];
  }

  return data || [];
}

/* ==================== CÁLCULOS ==================== */

function calcularLeadsHoje(leads) {
  const hoje = new Date().toISOString().slice(0, 10);

  return leads.filter((lead) => {
    return String(lead.created_at || '').slice(0, 10) === hoje;
  }).length;
}

function calcularPropostasAbertas(propostas) {
  return propostas.filter((proposta) => {
    const status = normalizarStatus(proposta.status);

    return ![
      'vendida',
      'vendido',
      'fechada',
      'fechado',
      'aprovada',
      'aprovado',
      'perdida',
      'perdido',
      'cancelada',
      'cancelado'
    ].includes(status);
  });
}

function calcularVendasFechadas(propostas, financeiro) {
  const propostasFechadas = propostas.filter((proposta) => {
    const status = normalizarStatus(proposta.status);

    return [
      'vendida',
      'vendido',
      'fechada',
      'fechado',
      'aprovada',
      'aprovado'
    ].includes(status);
  });

  const financeiroVendas = financeiro.filter((lancamento) => {
    const tipo = normalizarStatus(lancamento.tipo);
    const categoria = normalizarStatus(lancamento.categoria);
    const status = normalizarStatus(lancamento.status);

    return (
      tipo === 'receita' &&
      status !== 'cancelado' &&
      (
        categoria.includes('venda') ||
        categoria.includes('veiculo') ||
        categoria.includes('proposta')
      )
    );
  });

  return {
    quantidade: Math.max(propostasFechadas.length, financeiroVendas.length),
    valor:
      somarValores(propostasFechadas, ['valor_total', 'valor', 'preco', 'valor_proposta']) ||
      somarValores(financeiroVendas, ['valor', 'valor_total'])
  };
}

function somarValores(lista, campos) {
  return lista.reduce((soma, item) => {
    const campoEncontrado = campos.find((campo) => item[campo] !== undefined && item[campo] !== null);
    return soma + Number(campoEncontrado ? item[campoEncontrado] : 0);
  }, 0);
}

function calcularFunil(leads, propostas) {
  const novos = leads.filter((lead) => {
    const status = normalizarStatus(lead.etapa || lead.status);
    return !status || ['novo', 'recebido', 'pendente'].includes(status);
  }).length;

  const atendimento = leads.filter((lead) => {
    const status = normalizarStatus(lead.etapa || lead.status);
    return ['atendimento', 'em atendimento', 'contato', 'em contato', 'negociacao', 'negociação'].includes(status);
  }).length;

  const propostasQtd = propostas.length;

  const fechados = propostas.filter((proposta) => {
    const status = normalizarStatus(proposta.status);
    return ['vendida', 'vendido', 'fechada', 'fechado', 'aprovada', 'aprovado'].includes(status);
  }).length;

  return {
    novos,
    atendimento,
    propostas: propostasQtd,
    fechados
  };
}

/* ==================== RENDER ==================== */

function renderizarLeadsRecentes(leads) {
  if (!listaLeadsRecentes) return;

  const recentes = leads.slice(0, 5);

  if (!recentes.length) {
    listaLeadsRecentes.innerHTML = `
      <div class="dashboard-empty">
        Nenhum lead recebido ainda.
      </div>
    `;
    return;
  }

  listaLeadsRecentes.innerHTML = recentes.map((lead) => {
    const status = lead.status || 'Novo';

    return `
      <div class="dashboard-lead-item">
        <div>
          <strong>${obterNomeLead(lead)}</strong>
          <span>${obterContatoLead(lead)} • ${obterVeiculoLead(lead)}</span>
        </div>

        <div>
          <small>${formatarDataCurta(lead.created_at)}</small>
          <span class="dashboard-status">${status}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderizarVeiculosDestaque(veiculos) {
  if (!listaVeiculosDestaque) return;

  if (!veiculos.length) {
    listaVeiculosDestaque.innerHTML = `
      <div class="dashboard-empty">
        Nenhum veículo ativo disponível no estoque.
      </div>
    `;
    return;
  }

  listaVeiculosDestaque.innerHTML = veiculos.map((veiculo) => {
    const titulo = `${veiculo.marca || ''} ${veiculo.modelo || ''}`.trim() || 'Veículo';
    const detalhe = [veiculo.ano, veiculo.cambio, veiculo.combustivel].filter(Boolean).join(' • ');

    return `
      <div class="dashboard-car-item">
        <img class="dashboard-car-img" src="${obterUrlPublicaFoto(veiculo.foto_capa)}" alt="">

        <div class="dashboard-car-info">
          <strong>${titulo}</strong>
          <span>${detalhe || 'Sem detalhes'}</span>
          <em>${formatarMoeda(veiculo.preco)}</em>
        </div>
      </div>
    `;
  }).join('');
}

function atualizarDashboard(dados) {
  const {
    leads,
    clientes,
    propostas,
    financeiro,
    veiculos,
    veiculosDestaque
  } = dados;

  const propostasAbertas = calcularPropostasAbertas(propostas);
  const vendas = calcularVendasFechadas(propostas, financeiro);
  const funil = calcularFunil(leads, propostas);

  const leadsHoje = calcularLeadsHoje(leads);
  const veiculosAtivos = veiculos.filter((veiculo) => veiculo.ativo !== false).length;
  const veiculosDisponiveis = veiculos.filter((veiculo) => veiculo.ativo !== false && !veiculo.vendido).length;

  const valorPropostasAbertas = somarValores(propostasAbertas, [
    'valor_total',
    'valor',
    'preco',
    'valor_proposta'
  ]);

  const conversao = leads.length
    ? Math.round((vendas.quantidade / leads.length) * 100)
    : 0;

  statLeads.textContent = leads.length;
  statLeadsHoje.textContent = `${leadsHoje} hoje`;

  statClientes.textContent = clientes.length;

  statPropostasAbertas.textContent = propostasAbertas.length;
  statPropostasValor.textContent = formatarMoeda(valorPropostasAbertas);

  statVendasFechadas.textContent = vendas.quantidade;
  statVendasValor.textContent = formatarMoeda(vendas.valor);

  statConversao.textContent = `${conversao}%`;

  statVeiculosAtivos.textContent = veiculosAtivos;
  statVeiculosDisponiveis.textContent = `${veiculosDisponiveis} disponíveis`;

  funilNovos.textContent = funil.novos;
  funilAtendimento.textContent = funil.atendimento;
  funilPropostas.textContent = funil.propostas;
  funilFechados.textContent = funil.fechados;

  renderizarLeadsRecentes(leads);
  renderizarVeiculosDestaque(veiculosDestaque);
}

/* ==================== CARREGAMENTO ==================== */

async function carregarDashboard() {
  const [
    leads,
    clientes,
    propostas,
    financeiro,
    veiculos,
    veiculosDestaque
  ] = await Promise.all([
    buscarLeads(),
    buscarTabela('clientes'),
    buscarTabela('propostas'),
    buscarTabela('financeiro_lancamentos'),
    buscarTabela('veiculos'),
    buscarVeiculosDestaque()
  ]);

  atualizarDashboard({
    leads,
    clientes,
    propostas,
    financeiro,
    veiculos,
    veiculosDestaque
  });
}

/* ==================== LOGOUT ==================== */

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
  if (event.target === logoutModal) {
    fecharLogoutModal();
  }
});

confirmarLogoutBtn?.addEventListener('click', async () => {
  confirmarLogoutBtn.disabled = true;
  confirmarLogoutBtn.textContent = 'Saindo...';

  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

/* ==================== INIT ==================== */

(async () => {
  const ok = await protegerAdmin();

  if (!ok) return;

  const empresa = await carregarEmpresaAtual();

  if (!empresa) {
    console.error('Nenhuma empresa vinculada ao usuário.');
    return;
  }

  empresaIdAtual = empresa.id;

  await carregarDashboard();
})();