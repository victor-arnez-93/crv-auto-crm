/* ============================================================
   MAXX VEÍCULOS — DOCUMENTOS.JS
   Supabase Auth · Documentos · Multiempresa
   ============================================================ */

let documentos = [];
let veiculos = [];
let empresaIdAtual = null;

const BUCKET_DOCUMENTOS = 'documentos';

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

const novoDocumentoBtn = document.getElementById('novoDocumentoBtn');
const documentoModal = document.getElementById('documentoModal');
const documentoForm = document.getElementById('documentoForm');
const documentoModalTitle = document.getElementById('documentoModalTitle');

const fecharDocumentoModalBtn = document.getElementById('fecharDocumentoModalBtn');
const cancelarDocumentoBtn = document.getElementById('cancelarDocumentoBtn');

const documentosTable = document.getElementById('documentosTable');
const documentosEmpty = document.getElementById('documentosEmpty');

const buscaDocumentos = document.getElementById('buscaDocumentos');
const filtroTipoDocumento = document.getElementById('filtroTipoDocumento');
const filtroVeiculoDocumento = document.getElementById('filtroVeiculoDocumento');
const filtroOrdemDocumento = document.getElementById('filtroOrdemDocumento');

const statTotalDocumentos = document.getElementById('statTotalDocumentos');
const statVeiculosDocumentos = document.getElementById('statVeiculosDocumentos');
const statDocumentosRecentes = document.getElementById('statDocumentosRecentes');

function limparTextoHTML(valor) {
  return String(valor || '').replace(/[&<>"']/g, (char) => ({
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

function obterNomeVeiculo(id) {
  const veiculo = veiculos.find((item) => item.id === id);
  if (!veiculo) return '';

  return `${veiculo.marca || ''} ${veiculo.modelo || ''} ${veiculo.ano || ''}`.trim();
}

function obterArquivoUrl(path) {
  if (!path) return '#';
  if (String(path).startsWith('http')) return path;

  const { data } = window.MAXX_SUPABASE.storage
    .from(BUCKET_DOCUMENTOS)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function carregarVeiculos() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('veiculos')
    .select('id, marca, modelo, ano, status, vendido')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  veiculos = data || [];

  const selects = [
    document.getElementById('documentoVeiculo'),
    filtroVeiculoDocumento
  ];

  selects.forEach((select) => {
    if (!select) return;

    const labelInicial = select === filtroVeiculoDocumento
      ? 'Veículo: Todos'
      : 'Selecione um veículo';

    select.innerHTML = `<option value="">${labelInicial}</option>`;

    veiculos.forEach((veiculo) => {
      select.insertAdjacentHTML(
        'beforeend',
        `<option value="${veiculo.id}">
          ${limparTextoHTML(obterNomeVeiculo(veiculo.id))}
        </option>`
      );
    });
  });
}

async function carregarDocumentos() {
  const { data, error } = await window.MAXX_SUPABASE
    .from('documentos_veiculo')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    alert('Erro ao carregar documentos.');
    return;
  }

  documentos = data || [];

  renderizarDocumentos();
}

function obterDocumentosFiltrados() {
  const termo = buscaDocumentos?.value.trim().toLowerCase() || '';
  const tipo = filtroTipoDocumento?.value || '';
  const veiculoId = filtroVeiculoDocumento?.value || '';
  const ordem = filtroOrdemDocumento?.value || 'recentes';

  let lista = documentos.filter((doc) => {
    const texto = [
      doc.nome,
      doc.tipo,
      doc.observacoes,
      obterNomeVeiculo(doc.veiculo_id)
    ].join(' ').toLowerCase();

    if (termo && !texto.includes(termo)) return false;
    if (tipo && doc.tipo !== tipo) return false;
    if (veiculoId && doc.veiculo_id !== veiculoId) return false;

    return true;
  });

  lista = [...lista].sort((a, b) => {
    if (ordem === 'nome') {
      return String(a.nome || '').localeCompare(String(b.nome || ''));
    }

    if (ordem === 'tipo') {
      return String(a.tipo || '').localeCompare(String(b.tipo || ''));
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return lista;
}

function renderizarDocumentos() {
  const lista = obterDocumentosFiltrados();

  documentosTable.innerHTML = '';
  documentosEmpty.style.display = lista.length ? 'none' : 'block';

  lista.forEach((doc) => {
    const tr = document.createElement('tr');
    const veiculoNome = obterNomeVeiculo(doc.veiculo_id);
    const arquivoUrl = obterArquivoUrl(doc.arquivo_url);

    tr.innerHTML = `
      <td>
        <div class="documento-info">
          <strong>${limparTextoHTML(doc.nome)}</strong>
          <span>${limparTextoHTML(doc.observacoes || 'Sem observações')}</span>
        </div>
      </td>

      <td>
        <span class="documento-tipo">${limparTextoHTML(doc.tipo)}</span>
      </td>

      <td>
        <div class="documento-veiculo">
          <strong>${limparTextoHTML(veiculoNome || 'Veículo não informado')}</strong>
        </div>
      </td>

      <td>
        <span class="documento-data">${formatarData(doc.created_at)}</span>
      </td>

      <td>
        <div class="admin-actions">
          <a class="admin-icon-btn" href="${arquivoUrl}" target="_blank" rel="noopener" title="Abrir">↗</a>
          <button class="admin-icon-btn" onclick="editarDocumento('${doc.id}')" title="Editar">✎</button>
          <button class="admin-icon-btn" onclick="excluirDocumento('${doc.id}')" title="Excluir">×</button>
        </div>
      </td>
    `;

    documentosTable.appendChild(tr);
  });

  atualizarStats();
}

function atualizarStats() {
  const total = documentos.length;

  const veiculosComDocs = new Set(
    documentos
      .map((doc) => doc.veiculo_id)
      .filter(Boolean)
  ).size;

  const hoje = new Date().toISOString().slice(0, 10);

  const recentes = documentos.filter((doc) => {
    return String(doc.created_at || '').slice(0, 10) === hoje;
  }).length;

  statTotalDocumentos.textContent = total;
  statVeiculosDocumentos.textContent = veiculosComDocs;
  statDocumentosRecentes.textContent = recentes;
}

function abrirDocumentoModal(doc = null) {
  documentoForm.reset();

  document.getElementById('documentoId').value = '';
  document.getElementById('documentoPreview').hidden = true;
  document.getElementById('documentoPreviewLink').href = '#';

  if (doc) {
    documentoModalTitle.textContent = 'Editar documento';

    document.getElementById('documentoId').value = doc.id;
    document.getElementById('documentoVeiculo').value = doc.veiculo_id || '';
    document.getElementById('documentoTipo').value = doc.tipo || '';
    document.getElementById('documentoNome').value = doc.nome || '';
    document.getElementById('documentoObservacoes').value = doc.observacoes || '';

    if (doc.arquivo_url) {
      document.getElementById('documentoPreview').hidden = false;
      document.getElementById('documentoPreviewLink').href = obterArquivoUrl(doc.arquivo_url);
    }
  } else {
    documentoModalTitle.textContent = 'Novo documento';
  }

  documentoModal.classList.add('open');
}

function fecharDocumentoModal() {
  documentoModal.classList.remove('open');
}

async function uploadDocumento(arquivo) {
  if (!arquivo) return null;

  const extensao = arquivo.name.split('.').pop();
  const nomeSeguro = arquivo.name
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();

  const caminho = `${empresaIdAtual}/${Date.now()}-${nomeSeguro}.${extensao}`;

  const { error } = await window.MAXX_SUPABASE.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(caminho, arquivo, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return caminho;
}

function obterDadosFormulario(arquivoUrlAtual = null) {
  return {
    empresa_id: empresaIdAtual,
    veiculo_id: document.getElementById('documentoVeiculo').value,
    tipo: document.getElementById('documentoTipo').value,
    nome: document.getElementById('documentoNome').value.trim(),
    arquivo_url: arquivoUrlAtual,
    observacoes: document.getElementById('documentoObservacoes').value.trim()
  };
}

function editarDocumento(id) {
  const doc = documentos.find((item) => item.id === id);
  if (doc) abrirDocumentoModal(doc);
}

async function excluirDocumento(id) {
  const doc = documentos.find((item) => item.id === id);
  if (!doc) return;

  const confirmar = confirm(`Excluir documento "${doc.nome}"?`);
  if (!confirmar) return;

  const { error } = await window.MAXX_SUPABASE
    .from('documentos_veiculo')
    .delete()
    .eq('id', id)
    .eq('empresa_id', empresaIdAtual);

  if (error) {
    console.error(error);
    alert('Erro ao excluir documento.');
    return;
  }

  await carregarDocumentos();
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

novoDocumentoBtn?.addEventListener('click', () => abrirDocumentoModal());

fecharDocumentoModalBtn?.addEventListener('click', fecharDocumentoModal);
cancelarDocumentoBtn?.addEventListener('click', fecharDocumentoModal);

documentoModal?.addEventListener('click', (event) => {
  if (event.target === documentoModal) fecharDocumentoModal();
});

[
  buscaDocumentos,
  filtroTipoDocumento,
  filtroVeiculoDocumento,
  filtroOrdemDocumento
].forEach((campo) => {
  campo?.addEventListener('input', renderizarDocumentos);
  campo?.addEventListener('change', renderizarDocumentos);
});

documentoForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitBtn = documentoForm.querySelector('button[type="submit"]');
  const idAtual = document.getElementById('documentoId').value;
  const arquivo = document.getElementById('documentoArquivo').files[0];

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const docAtual = documentos.find((item) => item.id === idAtual);
    let arquivoUrl = docAtual?.arquivo_url || null;

    if (arquivo) {
      arquivoUrl = await uploadDocumento(arquivo);
    }

    if (!arquivoUrl) {
      alert('Selecione um arquivo.');
      return;
    }

    const dados = obterDadosFormulario(arquivoUrl);

    if (idAtual) {
      const { error } = await window.MAXX_SUPABASE
        .from('documentos_veiculo')
        .update(dados)
        .eq('id', idAtual)
        .eq('empresa_id', empresaIdAtual);

      if (error) throw error;
    } else {
      const { error } = await window.MAXX_SUPABASE
        .from('documentos_veiculo')
        .insert(dados);

      if (error) throw error;
    }

    await carregarDocumentos();
    fecharDocumentoModal();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar documento.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar documento';
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

  await carregarVeiculos();
  await carregarDocumentos();
})();