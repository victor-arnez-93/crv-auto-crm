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

function montarMensagemWhatsappLead(lead) {
  const nome = lead.nome || '';
  const veiculo = obterNomeVeiculo(lead.veiculo_id);
  const mensagemCliente = lead.mensagem || '';

  let msg = `Olá ${nome}, tudo bem? Recebemos seu interesse`;

  if (veiculo) {
    msg += ` no veículo ${veiculo}`;
  }

  msg += '.';

  if (mensagemCliente) {
    msg += `\n\nVi sua mensagem:\n"${mensagemCliente}"`;
  }

  msg += '\n\nPosso te passar mais detalhes, valor e condições?';

  return msg;
}

function obterLinkWhatsapp(lead) {
  const numeros = somenteNumeros(lead?.telefone);
  if (!numeros) return null;

  const numeroFinal = numeros.startsWith('55') ? numeros : `55${numeros}`;

  return `https://wa.me/${numeroFinal}?text=${encodeURIComponent(montarMensagemWhatsappLead(lead))}`;
}

function iconWhatsapp() {
  return `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path fill="currentColor" d="M16.04 3C8.86 3 3.03 8.82 3.03 15.98c0 2.3.6 4.55 1.75 6.53L3 29l6.65-1.74a12.9 12.9 0 0 0 6.39 1.68h.01c7.17 0 13-5.82 13-12.98C29.05 8.82 23.22 3 16.04 3Zm0 23.75h-.01a10.72 10.72 0 0 1-5.46-1.5l-.39-.23-3.94 1.03 1.05-3.84-.25-.4a10.73 10.73 0 0 1-1.65-5.83c0-5.95 4.85-10.8 10.82-10.8 2.89 0 5.6 1.13 7.64 3.17a10.72 10.72 0 0 1 3.17 7.63c0 5.96-4.85 10.77-10.98 10.77Zm5.92-8.08c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.25-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.86-1.61-1.92-1.8-2.24-.19-.33-.02-.5.14-.66.15-.15.32-.38.49-.57.16-.19.22-.33.32-.55.11-.22.06-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.15 1.33 3.37c.16.22 2.3 3.51 5.58 4.92.78.34 1.39.54 1.86.69.78.25 1.5.21 2.06.13.63-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.14-.3-.22-.62-.38Z"/>
    </svg>
  `;
}

function montarObservacaoClienteDoLead(lead) {
  const veiculo = obterNomeVeiculo(lead.veiculo_id);
  const partes = [];

  partes.push('Cliente convertido a partir de lead.');

  if (veiculo) {
    partes.push(`Veículo de interesse: ${veiculo}.`);
  }

  if (lead.mensagem) {
    partes.push(`Mensagem enviada no site: "${lead.mensagem}".`);
  }

  if (lead.observacoes) {
    partes.push(`Observações do lead: ${lead.observacoes}`);
  }

  return partes.join('\n');
}

async function converterLeadEmCliente(id) {
  const lead = leads.find((item) => item.id === id);
  if (!lead) return;

  if (lead.cliente_id) {
    alert('Este lead já está vinculado a um cliente.');
    return;
  }

  const telefoneLimpo = somenteNumeros(lead.telefone);
  const emailLimpo = String(lead.email || '').trim().toLowerCase();

  try {
    let clienteExistente = null;

    if (telefoneLimpo || emailLimpo) {
      let query = window.MAXX_SUPABASE
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaIdAtual)
        .limit(1);

      if (emailLimpo && telefoneLimpo) {
        query = query.or(`email.eq.${emailLimpo},telefone.eq.${lead.telefone},whatsapp.eq.${lead.telefone}`);
      } else if (emailLimpo) {
        query = query.eq('email', emailLimpo);
      } else {
        query = query.or(`telefone.eq.${lead.telefone},whatsapp.eq.${lead.telefone}`);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      clienteExistente = data;
    }

    let clienteId = clienteExistente?.id || null;

    if (!clienteId) {
      const { data: novoCliente, error: clienteError } = await window.MAXX_SUPABASE
        .from('clientes')
        .insert({
          empresa_id: empresaIdAtual,
          nome: capitalizarTexto(lead.nome),
          telefone: lead.telefone || null,
          whatsapp: lead.telefone || null,
          email: emailLimpo || null,
          origem: lead.origem || 'Site',
          status: 'ativo',
          observacoes: montarObservacaoClienteDoLead(lead)
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      clienteId = novoCliente.id;
    }

    const { error: leadError } = await window.MAXX_SUPABASE
      .from('leads')
      .update({
        cliente_id: clienteId,
        etapa: lead.etapa === 'novo' ? 'negociacao' : lead.etapa,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)
      .eq('empresa_id', empresaIdAtual);

    if (leadError) throw leadError;

    await carregarLeads();

    alert('Lead convertido em cliente com sucesso.');
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao converter lead em cliente.');
  }
}

function criarPropostaLead(id) {
  const lead = leads.find(item => item.id === id);

  if (!lead) return;

  const params = new URLSearchParams();

  if (lead.cliente_id) {
    params.set('cliente_id', lead.cliente_id);
  }

  params.set('lead_id', lead.id);

  if (lead.veiculo_id) {
    params.set('veiculo_id', lead.veiculo_id);
  }

  window.location.href =
    `propostas.html?${params.toString()}`;
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

    const whatsappLink = obterLinkWhatsapp(lead);
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
          <span>${limparTextoHTML(lead.telefone || '-')}</span>
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
          ${
            whatsappLink
              ? `<a class="admin-icon-btn lead-whatsapp-action" href="${whatsappLink}" target="_blank" rel="noopener" title="Responder no WhatsApp">${iconWhatsapp()}</a>`
              : ''
          }
            ${
    lead.cliente_id
  ? `
      <button
        class="admin-icon-btn lead-proposta-action"
        onclick="criarPropostaLead('${lead.id}')"
        title="Criar proposta"
      >
        $
      </button>
    `
  : `
      <button
        class="admin-icon-btn lead-convert-action"
        onclick="converterLeadEmCliente('${lead.id}')"
        title="Converter em cliente"
      >
        👤
      </button>
    `
}
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