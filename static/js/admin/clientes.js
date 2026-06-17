/* ============================================================
   MAXX VEÍCULOS — CLIENTES.JS
   Supabase Auth · CRM Clientes · Multiempresa
   ============================================================ */

const supabaseClient = window.MAXX_SUPABASE;

let clientes = [];
let empresaIdAtual = null;

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

const logoutBtn = document.getElementById('logoutBtn');

const novoClienteBtn = document.getElementById('novoClienteBtn');
const clienteModal = document.getElementById('clienteModal');
const clienteForm = document.getElementById('clienteForm');

const fecharClienteModalBtn = document.getElementById('fecharClienteModalBtn');
const cancelarClienteBtn = document.getElementById('cancelarClienteBtn');
const clienteModalTitle = document.getElementById('clienteModalTitle');

const clientesTable = document.getElementById('clientesTable');
const clientesEmpty = document.getElementById('clientesEmpty');

const buscaClientes = document.getElementById('buscaClientes');
const filtroStatusCliente = document.getElementById('filtroStatusCliente');
const filtroOrigemCliente = document.getElementById('filtroOrigemCliente');
const filtroOrdemCliente = document.getElementById('filtroOrdemCliente');

const statTotalClientes = document.getElementById('statTotalClientes');
const statClientesAtivos = document.getElementById('statClientesAtivos');
const statClientesWhatsapp = document.getElementById('statClientesWhatsapp');

/* ==================== TEXTO / FORMATADORES ==================== */

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

function formatarCpfCnpj(valor) {
  const numeros = somenteNumeros(valor).slice(0, 14);

  if (numeros.length <= 11) {
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
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

function obterLinkWhatsapp(numero) {
  const numeros = somenteNumeros(numero);

  if (!numeros) return null;

  const numeroFinal = numeros.startsWith('55') ? numeros : `55${numeros}`;

  return `https://wa.me/${numeroFinal}`;
}

/* ==================== MÁSCARAS ==================== */

['clienteTelefone', 'clienteWhatsapp'].forEach((id) => {
  const campo = document.getElementById(id);

  campo?.addEventListener('input', () => {
    campo.value = formatarTelefone(campo.value);
  });
});

document.getElementById('clienteCpfCnpj')?.addEventListener('input', (event) => {
  event.target.value = formatarCpfCnpj(event.target.value);
});

document.getElementById('clienteNome')?.addEventListener('blur', (event) => {
  event.target.value = capitalizarTexto(event.target.value);
});

/* ==================== SUPABASE ==================== */

async function carregarClientes() {
  const { data, error } = await supabaseClient
    .from('clientes')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    alert('Erro ao carregar clientes.');
    return;
  }

  clientes = data || [];

  popularFiltroOrigem();
  renderizarClientes();
}

function obterDadosFormulario() {
  return {
    empresa_id: empresaIdAtual,
    nome: capitalizarTexto(document.getElementById('clienteNome').value),
    telefone: document.getElementById('clienteTelefone').value.trim(),
    whatsapp: document.getElementById('clienteWhatsapp').value.trim(),
    email: document.getElementById('clienteEmail').value.trim().toLowerCase(),
    cpf_cnpj: document.getElementById('clienteCpfCnpj').value.trim(),
    origem: document.getElementById('clienteOrigem').value.trim(),
    status: document.getElementById('clienteStatus').value,
    observacoes: document.getElementById('clienteObservacoes').value.trim(),
    updated_at: new Date().toISOString()
  };
}

/* ==================== MODAL ==================== */

function abrirClienteModal(cliente = null) {
  clienteForm.reset();
  document.getElementById('clienteId').value = '';

  if (cliente) {
    clienteModalTitle.textContent = 'Editar cliente';

    document.getElementById('clienteId').value = cliente.id;
    document.getElementById('clienteNome').value = cliente.nome || '';
    document.getElementById('clienteTelefone').value = cliente.telefone || '';
    document.getElementById('clienteWhatsapp').value = cliente.whatsapp || '';
    document.getElementById('clienteEmail').value = cliente.email || '';
    document.getElementById('clienteCpfCnpj').value = cliente.cpf_cnpj || '';
    document.getElementById('clienteOrigem').value = cliente.origem || '';
    document.getElementById('clienteStatus').value = cliente.status || 'ativo';
    document.getElementById('clienteObservacoes').value = cliente.observacoes || '';
  } else {
    clienteModalTitle.textContent = 'Novo cliente';
    document.getElementById('clienteStatus').value = 'ativo';
  }

  clienteModal.classList.add('open');
}

function fecharClienteModal() {
  clienteModal.classList.remove('open');
}

/* ==================== FILTROS ==================== */

function popularFiltroOrigem() {
  if (!filtroOrigemCliente) return;

  const origemAtual = filtroOrigemCliente.value;

  const origens = [...new Set(clientes.map((cliente) => cliente.origem).filter(Boolean))].sort();

  filtroOrigemCliente.innerHTML = '<option value="">Origem: Todas</option>';

  origens.forEach((origem) => {
    filtroOrigemCliente.insertAdjacentHTML(
      'beforeend',
      `<option value="${limparTextoHTML(origem)}">${limparTextoHTML(origem)}</option>`
    );
  });

  filtroOrigemCliente.value = origemAtual;
}

function obterClientesFiltrados() {
  const termo = buscaClientes?.value.trim().toLowerCase() || '';
  const status = filtroStatusCliente?.value || '';
  const origem = filtroOrigemCliente?.value || '';
  const ordem = filtroOrdemCliente?.value || 'recentes';

  let filtrados = clientes.filter((cliente) => {
    const texto = [
      cliente.nome,
      cliente.telefone,
      cliente.whatsapp,
      cliente.email,
      cliente.cpf_cnpj,
      cliente.origem,
      cliente.observacoes
    ].join(' ').toLowerCase();

    if (termo && !texto.includes(termo)) return false;
    if (status && cliente.status !== status) return false;
    if (origem && cliente.origem !== origem) return false;

    return true;
  });

  filtrados = ordenarClientes(filtrados, ordem);

  return filtrados;
}

function ordenarClientes(lista, ordem) {
  return [...lista].sort((a, b) => {
    if (ordem === 'nome') {
      return String(a.nome || '').localeCompare(String(b.nome || ''));
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

/* ==================== RENDER ==================== */

function renderizarClientes() {
  const filtrados = obterClientesFiltrados();

  clientesTable.innerHTML = '';
  clientesEmpty.style.display = filtrados.length ? 'none' : 'block';

  filtrados.forEach((cliente) => {
    const tr = document.createElement('tr');

    const whatsappLink = obterLinkWhatsapp(cliente.whatsapp);
    const contatoPrincipal = cliente.whatsapp || cliente.telefone || '-';

    tr.innerHTML = `
      <td>
        <div class="cliente-info">
          <strong>${limparTextoHTML(cliente.nome)}</strong>
          <span>${limparTextoHTML(cliente.email || 'Sem e-mail')}</span>
          ${
            cliente.observacoes
              ? `<span class="cliente-observacao-preview">${limparTextoHTML(cliente.observacoes)}</span>`
              : ''
          }
        </div>
      </td>

      <td>
        <div class="cliente-contato">
          ${
            whatsappLink
              ? `<a href="${whatsappLink}" target="_blank">${limparTextoHTML(contatoPrincipal)}</a>`
              : `<span>${limparTextoHTML(contatoPrincipal)}</span>`
          }
          <span>${limparTextoHTML(cliente.telefone || '')}</span>
        </div>
      </td>

      <td>
        <span class="cliente-origem">${limparTextoHTML(cliente.origem || 'Não informado')}</span>
      </td>

      <td>
        <span class="admin-pill ${cliente.status === 'ativo' ? 'ok' : 'off'}">
          ${limparTextoHTML(cliente.status || 'ativo')}
        </span>
      </td>

      <td>${formatarData(cliente.created_at)}</td>

      <td>
        <div class="admin-actions">
          <button class="admin-icon-btn" onclick="editarCliente('${cliente.id}')" title="Editar">✎</button>
          <button class="admin-icon-btn" onclick="excluirCliente('${cliente.id}')" title="Excluir">×</button>
        </div>
      </td>
    `;

    clientesTable.appendChild(tr);
  });

  atualizarStats();
}

function atualizarStats() {
  const total = clientes.length;
  const ativos = clientes.filter((cliente) => cliente.status === 'ativo').length;
  const comWhatsapp = clientes.filter((cliente) => !!cliente.whatsapp).length;

  statTotalClientes.textContent = total;
  statClientesAtivos.textContent = ativos;
  statClientesWhatsapp.textContent = comWhatsapp;
}

/* ==================== AÇÕES ==================== */

function editarCliente(id) {
  const cliente = clientes.find((item) => item.id === id);

  if (cliente) {
    abrirClienteModal(cliente);
  }
}

async function excluirCliente(id) {
  const cliente = clientes.find((item) => item.id === id);
  if (!cliente) return;

  const confirmar = confirm(`Excluir cliente ${cliente.nome}?`);
  if (!confirmar) return;

  const { error } = await supabaseClient
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    alert('Erro ao excluir cliente.');
    return;
  }

  await carregarClientes();
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

/* ==================== EVENTOS ==================== */

novoClienteBtn?.addEventListener('click', () => abrirClienteModal());

fecharClienteModalBtn?.addEventListener('click', fecharClienteModal);
cancelarClienteBtn?.addEventListener('click', fecharClienteModal);

clienteModal?.addEventListener('click', (event) => {
  if (event.target === clienteModal) {
    fecharClienteModal();
  }
});

[
  buscaClientes,
  filtroStatusCliente,
  filtroOrigemCliente,
  filtroOrdemCliente
].forEach((campo) => {
  campo?.addEventListener('input', renderizarClientes);
  campo?.addEventListener('change', renderizarClientes);
});

clienteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitBtn = clienteForm.querySelector('button[type="submit"]');
  const idAtual = document.getElementById('clienteId').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const dados = obterDadosFormulario();

    if (idAtual) {
      const { error } = await supabaseClient
        .from('clientes')
        .update(dados)
        .eq('id', idAtual);

      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from('clientes')
        .insert(dados);

      if (error) throw error;
    }

    await carregarClientes();
    fecharClienteModal();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar cliente.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar cliente';
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
})();