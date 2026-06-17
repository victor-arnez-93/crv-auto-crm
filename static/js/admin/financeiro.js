/* ============================================================
   MAXX VEÍCULOS — FINANCEIRO.JS
   Financeiro Multiempresa
   ============================================================ */

let empresaIdAtual = null;
let lancamentos = [];
let clientes = [];
let veiculos = [];

async function protegerAdmin() {
  const { data } = await window.MAXX_SUPABASE.auth.getSession();

  if (!data.session) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function somenteNumeros(v) {
  return String(v || '').replace(/\D/g, '');
}

function formatarPrecoInput(valor) {
  const numeros = somenteNumeros(valor);

  if (!numeros) return '';

  return (Number(numeros) / 100).toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL'
    }
  );
}

function converterPreco(valor) {
  const numeros = somenteNumeros(valor);
  if (!numeros) return 0;
  return Number(numeros) / 100;
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL'
    }
  );
}

function dataBR(data) {
  if (!data) return '-';

  return new Date(data).toLocaleDateString('pt-BR');
}

document
  .getElementById('financeiroValor')
  ?.addEventListener('input', (e) => {
    e.target.value = formatarPrecoInput(e.target.value);
  });

async function carregarRelacionamentos() {
  const [clientesRes, veiculosRes] = await Promise.all([
    window.MAXX_SUPABASE
      .from('clientes')
      .select('id,nome')
      .eq('empresa_id', empresaIdAtual),

    window.MAXX_SUPABASE
      .from('veiculos')
      .select('id,marca,modelo,ano')
      .eq('empresa_id', empresaIdAtual)
  ]);

  clientes = clientesRes.data || [];
  veiculos = veiculosRes.data || [];

  preencherSelects();
}

function preencherSelects() {
  const clienteSelect = document.getElementById('financeiroCliente');
  const veiculoSelect = document.getElementById('financeiroVeiculo');

  clienteSelect.innerHTML =
    '<option value="">Nenhum cliente vinculado</option>';

  clientes.forEach((cliente) => {
    clienteSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${cliente.id}">${cliente.nome}</option>`
    );
  });

  veiculoSelect.innerHTML =
    '<option value="">Nenhum veículo vinculado</option>';

  veiculos.forEach((veiculo) => {
    veiculoSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${veiculo.id}">
        ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano || ''}
      </option>`
    );
  });
}

async function carregarLancamentos() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('financeiro_lancamentos')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  lancamentos = data || [];

  renderizarLancamentos();
}

function renderizarLancamentos() {
  const tabela = document.getElementById('financeiroTable');
  const vazio = document.getElementById('financeiroEmpty');

  tabela.innerHTML = '';

  if (!lancamentos.length) {
    vazio.style.display = 'block';
  } else {
    vazio.style.display = 'none';
  }

  let receitas = 0;
  let despesas = 0;

  lancamentos.forEach((item) => {
    if (item.tipo === 'receita') {
      receitas += Number(item.valor || 0);
    } else {
      despesas += Number(item.valor || 0);
    }

    tabela.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>
          <div class="financeiro-info">
            <strong>${item.descricao}</strong>
            <span>${item.forma_pagamento || '-'}</span>
          </div>
        </td>

        <td>
          <span class="financeiro-tipo ${item.tipo}">
            ${item.tipo}
          </span>
        </td>

        <td>${item.categoria}</td>

        <td class="financeiro-valor ${item.tipo}">
          ${moeda(item.valor)}
        </td>

        <td>${dataBR(item.data_lancamento)}</td>

        <td>${dataBR(item.data_vencimento)}</td>

        <td>
          <span class="financeiro-status ${item.pago ? 'pago' : 'pendente'}">
            ${item.pago ? 'Pago' : 'Pendente'}
          </span>
        </td>

        <td>
          <div class="admin-actions">
            <button class="admin-icon-btn"
              onclick="editarLancamento('${item.id}')">
              ✎
            </button>

            <button class="admin-icon-btn"
              onclick="excluirLancamento('${item.id}')">
              ×
            </button>
          </div>
        </td>
      </tr>
      `
    );
  });

  document.getElementById('statReceitas').textContent =
    moeda(receitas);

  document.getElementById('statDespesas').textContent =
    moeda(despesas);

  document.getElementById('statSaldo').textContent =
    moeda(receitas - despesas);
}

function abrirModal(item = null) {
  document.getElementById('financeiroForm').reset();

  document.getElementById('financeiroId').value = '';

  if (item) {
    document.getElementById('financeiroModalTitle').textContent =
      'Editar lançamento';

    document.getElementById('financeiroId').value = item.id;
    document.getElementById('financeiroTipo').value = item.tipo;
    document.getElementById('financeiroCategoria').value = item.categoria;
    document.getElementById('financeiroDescricao').value = item.descricao;

    document.getElementById('financeiroValor').value =
      formatarPrecoInput(String(Math.round(item.valor * 100)));

    document.getElementById('financeiroDataLancamento').value =
      item.data_lancamento || '';

    document.getElementById('financeiroDataVencimento').value =
      item.data_vencimento || '';

    document.getElementById('financeiroFormaPagamento').value =
      item.forma_pagamento || '';

    document.getElementById('financeiroCliente').value =
      item.cliente_id || '';

    document.getElementById('financeiroVeiculo').value =
      item.veiculo_id || '';

    document.getElementById('financeiroPago').checked =
      item.pago || false;

    document.getElementById('financeiroObservacoes').value =
      item.observacoes || '';
  }

  document.getElementById('financeiroModal')
    .classList.add('open');
}

function fecharModal() {
  document.getElementById('financeiroModal')
    .classList.remove('open');
}

async function excluirLancamento(id) {
  if (!confirm('Excluir lançamento?')) return;

  await window.MAXX_SUPABASE
    .from('financeiro_lancamentos')
    .delete()
    .eq('id', id);

  carregarLancamentos();
}

function editarLancamento(id) {
  const item = lancamentos.find(
    l => l.id === id
  );

  if (item) abrirModal(item);
}

window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;

document
  .getElementById('novoLancamentoBtn')
  ?.addEventListener('click', () => abrirModal());

document
  .getElementById('cancelarFinanceiroBtn')
  ?.addEventListener('click', fecharModal);

document
  .getElementById('fecharFinanceiroModalBtn')
  ?.addEventListener('click', fecharModal);

document
  .getElementById('financeiroForm')
  ?.addEventListener('submit', async (e) => {

    e.preventDefault();

    const id = document.getElementById('financeiroId').value;

    const payload = {
      empresa_id: empresaIdAtual,
      tipo: document.getElementById('financeiroTipo').value,
      categoria: document.getElementById('financeiroCategoria').value,
      descricao: document.getElementById('financeiroDescricao').value,
      valor: converterPreco(document.getElementById('financeiroValor').value),
      data_lancamento: document.getElementById('financeiroDataLancamento').value,
      data_vencimento: document.getElementById('financeiroDataVencimento').value || null,
      forma_pagamento: document.getElementById('financeiroFormaPagamento').value,
      cliente_id: document.getElementById('financeiroCliente').value || null,
      veiculo_id: document.getElementById('financeiroVeiculo').value || null,
      pago: document.getElementById('financeiroPago').checked,
      observacoes: document.getElementById('financeiroObservacoes').value
    };

    if (id) {
      await window.MAXX_SUPABASE
        .from('financeiro_lancamentos')
        .update(payload)
        .eq('id', id);
    } else {
      await window.MAXX_SUPABASE
        .from('financeiro_lancamentos')
        .insert(payload);
    }

    fecharModal();
    carregarLancamentos();
  });

(async () => {
  const ok = await protegerAdmin();

  if (!ok) return;

  const empresa = await carregarEmpresaAtual();

  if (!empresa) return;

  empresaIdAtual = empresa.id;

  await carregarRelacionamentos();
  await carregarLancamentos();
})();