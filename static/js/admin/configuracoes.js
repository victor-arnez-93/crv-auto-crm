/* ============================================================
   MAXX VEÍCULOS — CONFIGURAÇÕES.JS
   Empresa · Sub-abas · Cards editáveis · Tema preset · Logo
   ============================================================ */

const BUCKET_LOGOS = 'logos';

const TEMAS_VISUAIS = {
  vermelho: {
    cor_primaria: '#ff3b2f',
    cor_secundaria: '#111111'
  },
  azul: {
    cor_primaria: '#1282ff',
    cor_secundaria: '#071b3a'
  },
  cinza: {
    cor_primaria: '#9ca3af',
    cor_secundaria: '#18181b'
  },
  premium: {
    cor_primaria: '#d4a843',
    cor_secundaria: '#111111'
  }
};

let empresaIdAtual = null;
let empresaAtualDados = null;
let configuracaoAtual = null;
let logoAtual = null;
let temaSelecionado = 'vermelho';
let cardsEditando = new Set();

/* ==================== AUTH ==================== */

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

/* ==================== HELPERS ==================== */

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarTelefone(valor) {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (!numeros) return '';

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function formatarCnpj(valor) {
  return somenteNumeros(valor)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatarCep(valor) {
  return somenteNumeros(valor)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
}

function mostrarToast(mensagem = 'Configurações salvas com sucesso.') {
  let toast = document.querySelector('.config-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'config-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = mensagem;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

function obterUrlPublicaLogo(path) {
  if (!path) return '';

  if (String(path).startsWith('http')) return path;

  const { data } = window.MAXX_SUPABASE.storage
    .from(BUCKET_LOGOS)
    .getPublicUrl(path);

  return data.publicUrl;
}

function detectarTemaPorCor(corPrimaria) {
  const cor = String(corPrimaria || '').toLowerCase();

  const encontrado = Object.entries(TEMAS_VISUAIS).find(([, tema]) => {
    return tema.cor_primaria.toLowerCase() === cor;
  });

  return encontrado?.[0] || 'vermelho';
}

function aplicarTemaPresetVisual(preset) {
  const tema = TEMAS_VISUAIS[preset] || TEMAS_VISUAIS.vermelho;

  document.documentElement.style.setProperty('--dynamic-primary', tema.cor_primaria);
  document.documentElement.style.setProperty('--dynamic-secondary', tema.cor_secundaria);

  document.documentElement.style.setProperty('--primary', tema.cor_primaria);
  document.documentElement.style.setProperty('--primary-2', tema.cor_primaria);

  document.querySelectorAll('.config-theme-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.themePreset === preset);
  });
}

function atualizarBarraSalvar() {
  const salvarBtn = document.getElementById('salvarConfigBtn');
  const titulo = document.getElementById('configStatusTitle');
  const texto = document.getElementById('configStatusText');

  const editando = cardsEditando.size > 0;

  if (salvarBtn) salvarBtn.disabled = !editando;

  if (titulo) {
    titulo.textContent = editando
      ? 'Alterações liberadas'
      : 'Configurações bloqueadas';
  }

  if (texto) {
    texto.textContent = editando
      ? 'Revise os campos editados e salve para aplicar no sistema.'
      : 'Clique em editar no card que deseja alterar.';
  }
}

/* ==================== ABAS ==================== */

function iniciarAbas() {
  document.querySelectorAll('.config-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const alvo = tab.dataset.tab;

      document.querySelectorAll('.config-tab').forEach((item) => {
        item.classList.toggle('active', item === tab);
      });

      document.querySelectorAll('.config-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `tab${alvo.charAt(0).toUpperCase()}${alvo.slice(1)}`);
      });
    });
  });
}

/* ==================== LOCK / EDIT ==================== */

function bloquearTodosCards() {
  document.querySelectorAll('[data-config-card]').forEach((card) => {
    const cardName = card.dataset.configCard;

    card.classList.add('is-locked');
    card.classList.remove('is-editing');

    card.querySelectorAll('[data-card-field]').forEach((campo) => {
      campo.disabled = true;
    });

    const btn = document.querySelector(`[data-edit-card="${cardName}"]`);
    if (btn) btn.textContent = 'Editar';
  });

  cardsEditando.clear();
  atualizarBarraSalvar();
}

function alternarEdicaoCard(cardName) {
  const card = document.querySelector(`[data-config-card="${cardName}"]`);
  const btn = document.querySelector(`[data-edit-card="${cardName}"]`);

  if (!card) return;

  const editando = cardsEditando.has(cardName);

  if (editando) {
    cardsEditando.delete(cardName);
    card.classList.add('is-locked');
    card.classList.remove('is-editing');

    card.querySelectorAll('[data-card-field]').forEach((campo) => {
      campo.disabled = true;
    });

    if (btn) btn.textContent = 'Editar';
  } else {
    cardsEditando.add(cardName);
    card.classList.remove('is-locked');
    card.classList.add('is-editing');

    card.querySelectorAll('[data-card-field]').forEach((campo) => {
      campo.disabled = false;
    });

    if (btn) btn.textContent = 'Bloquear';
  }

  atualizarBarraSalvar();
}

function iniciarCardsEditaveis() {
  document.querySelectorAll('[data-edit-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      alternarEdicaoCard(btn.dataset.editCard);
    });
  });

  bloquearTodosCards();
}

/* ==================== LOGO ==================== */

function atualizarPreviewLogo(pathOuUrl) {
  const previewWrap = document.getElementById('logoPreviewWrap');
  const previewImg = document.getElementById('logoPreview');

  const url = obterUrlPublicaLogo(pathOuUrl);

  if (!url) {
    previewWrap?.classList.remove('has-logo');
    previewImg?.removeAttribute('src');
    return;
  }

  previewImg.src = url;
  previewWrap?.classList.add('has-logo');
}

async function uploadLogo() {
  const input = document.getElementById('logoEmpresa');
  const file = input?.files?.[0];

  if (!file) return logoAtual;

  const ext = file.name.split('.').pop();
  const nomeArquivo = `${empresaIdAtual}/logo-${Date.now()}.${ext}`;

  const { error } = await window.MAXX_SUPABASE.storage
    .from(BUCKET_LOGOS)
    .upload(nomeArquivo, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error(error);
    throw new Error('Erro ao enviar logo.');
  }

  return nomeArquivo;
}

/* ==================== MÁSCARAS / EVENTOS ==================== */

function aplicarMascaraCampos() {
  ['telefoneEmpresa', 'whatsappEmpresa'].forEach((id) => {
    const campo = document.getElementById(id);

    campo?.addEventListener('input', () => {
      campo.value = formatarTelefone(campo.value);
    });
  });

  document.getElementById('cnpj')?.addEventListener('input', (event) => {
    event.target.value = formatarCnpj(event.target.value);
  });

  document.getElementById('cepEmpresa')?.addEventListener('input', (event) => {
    event.target.value = formatarCep(event.target.value);
  });

  document.getElementById('logoEmpresa')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const urlLocal = URL.createObjectURL(file);
    const previewWrap = document.getElementById('logoPreviewWrap');
    const previewImg = document.getElementById('logoPreview');

    previewImg.src = urlLocal;
    previewWrap?.classList.add('has-logo');
  });

  document.querySelectorAll('.config-theme-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (card.disabled) return;

      const preset = card.dataset.themePreset;

      temaSelecionado = preset;
      aplicarTemaPresetVisual(preset);
    });
  });
}

/* ==================== CARREGAR DADOS ==================== */

async function carregarDadosEmpresa() {
  const { data: empresa, error: empresaError } = await window.MAXX_SUPABASE
    .from('empresas')
    .select('*')
    .eq('id', empresaIdAtual)
    .single();

  if (empresaError) {
    console.error(empresaError);
    alert('Erro ao carregar dados da empresa.');
    return;
  }

  const { data: config, error: configError } = await window.MAXX_SUPABASE
    .from('configuracoes_empresa')
    .select('*')
    .eq('empresa_id', empresaIdAtual)
    .maybeSingle();

  if (configError) {
    console.error(configError);
    alert('Erro ao carregar configurações.');
    return;
  }

  empresaAtualDados = empresa;
  configuracaoAtual = config || {};
  logoAtual = empresa.logo_url || null;
  temaSelecionado = detectarTemaPorCor(empresa.cor_primaria);

  preencherFormulario();
  aplicarTemaPresetVisual(temaSelecionado);
  bloquearTodosCards();
}

function preencherFormulario() {
  document.getElementById('nomeFantasia').value = empresaAtualDados.nome_fantasia || '';
  document.getElementById('razaoSocial').value = empresaAtualDados.nome || '';
  document.getElementById('cnpj').value = empresaAtualDados.cnpj || '';
  document.getElementById('emailEmpresa').value = empresaAtualDados.email || '';
  document.getElementById('telefoneEmpresa').value = empresaAtualDados.telefone || '';
  document.getElementById('whatsappEmpresa').value = empresaAtualDados.whatsapp || '';
  document.getElementById('enderecoEmpresa').value = empresaAtualDados.endereco || '';
  document.getElementById('cidadeEmpresa').value = empresaAtualDados.cidade || '';
  document.getElementById('estadoEmpresa').value = empresaAtualDados.estado || '';
  document.getElementById('cepEmpresa').value = empresaAtualDados.cep || '';

  document.getElementById('instagramEmpresa').value = configuracaoAtual.instagram || '';
  document.getElementById('facebookEmpresa').value = configuracaoAtual.facebook || '';
  document.getElementById('horarioEmpresa').value = configuracaoAtual.horario_atendimento || '';
  document.getElementById('mensagemWhatsapp').value = configuracaoAtual.mensagem_whatsapp || '';
  document.getElementById('sitePublico').checked = configuracaoAtual.site_publico !== false;

  atualizarPreviewLogo(logoAtual);
}

/* ==================== SALVAR ==================== */

async function salvarConfiguracoes(event) {
  event.preventDefault();

  if (!cardsEditando.size) {
    mostrarToast('Clique em editar antes de salvar alterações.');
    return;
  }

  const submitBtn = document.getElementById('salvarConfigBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';

  try {
    const logoPath = await uploadLogo();
    const tema = TEMAS_VISUAIS[temaSelecionado] || TEMAS_VISUAIS.vermelho;

    const dadosEmpresa = {
      nome_fantasia: document.getElementById('nomeFantasia').value.trim(),
      nome: document.getElementById('razaoSocial').value.trim(),
      cnpj: document.getElementById('cnpj').value.trim(),
      email: document.getElementById('emailEmpresa').value.trim().toLowerCase(),
      telefone: document.getElementById('telefoneEmpresa').value.trim(),
      whatsapp: document.getElementById('whatsappEmpresa').value.trim(),
      endereco: document.getElementById('enderecoEmpresa').value.trim(),
      cidade: document.getElementById('cidadeEmpresa').value.trim(),
      estado: document.getElementById('estadoEmpresa').value.trim(),
      cep: document.getElementById('cepEmpresa').value.trim(),
      cor_primaria: tema.cor_primaria,
      cor_secundaria: tema.cor_secundaria,
      logo_url: logoPath,
      updated_at: new Date().toISOString()
    };

    const dadosConfig = {
      empresa_id: empresaIdAtual,
      site_publico: document.getElementById('sitePublico').checked,
      whatsapp_padrao: document.getElementById('whatsappEmpresa').value.trim(),
      mensagem_whatsapp: document.getElementById('mensagemWhatsapp').value.trim(),
      instagram: document.getElementById('instagramEmpresa').value.trim(),
      facebook: document.getElementById('facebookEmpresa').value.trim(),
      horario_atendimento: document.getElementById('horarioEmpresa').value.trim(),
      updated_at: new Date().toISOString()
    };

    const { error: empresaError } = await window.MAXX_SUPABASE
      .from('empresas')
      .update(dadosEmpresa)
      .eq('id', empresaIdAtual);

    if (empresaError) throw empresaError;

    const { error: configError } = await window.MAXX_SUPABASE
      .from('configuracoes_empresa')
      .upsert(dadosConfig, {
        onConflict: 'empresa_id'
      });

    if (configError) throw configError;

    logoAtual = logoPath;
    empresaAtualDados = {
      ...empresaAtualDados,
      ...dadosEmpresa
    };

    configuracaoAtual = {
      ...configuracaoAtual,
      ...dadosConfig
    };

    window.MAXX_EMPRESA = {
      ...window.MAXX_EMPRESA,
      ...dadosEmpresa,
      id: empresaIdAtual
    };

    atualizarPreviewLogo(logoAtual);
    aplicarTemaPresetVisual(temaSelecionado);

    const logoSidebar = document.querySelector('.admin-logo img');
    if (logoSidebar && logoAtual) {
      logoSidebar.src = obterUrlPublicaLogo(logoAtual);
    }

    bloquearTodosCards();
    mostrarToast('Configurações salvas com sucesso.');
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar configurações.');
  } finally {
    submitBtn.textContent = 'Salvar alterações';
    atualizarBarraSalvar();
  }
}

/* ==================== LOGOUT MODAL ==================== */

const logoutBtn = document.getElementById('logoutBtn');
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

  await window.MAXX_SUPABASE.auth.signOut();
  window.location.href = 'login.html';
});

/* ==================== INIT ==================== */

document.getElementById('configForm')?.addEventListener('submit', salvarConfiguracoes);

(async () => {
  iniciarAbas();
  iniciarCardsEditaveis();
  aplicarMascaraCampos();

  const ok = await protegerAdmin();

  if (!ok) return;

  const empresa = await carregarEmpresaAtual();

  if (!empresa) {
    alert('Nenhuma empresa vinculada ao usuário.');
    return;
  }

  empresaIdAtual = empresa.id;

  await carregarDadosEmpresa();
})();