/* ============================================================
   CRV AUTO CRM — LOGIN.JS
   Entrar · Criar conta · Recuperar senha · Supabase Auth
   ============================================================ */

const supabaseClient = window.MAXX_SUPABASE;

const loginTabs = document.getElementById('loginTabs');
const tabButtons = document.querySelectorAll('[data-auth-tab]');
const panels = document.querySelectorAll('.auth-panel');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');
const resetForm = document.getElementById('resetForm');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');

const registerName = document.getElementById('registerName');
const registerCompany = document.getElementById('registerCompany');
const registerPhone = document.getElementById('registerPhone');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
const registerBtn = document.getElementById('registerBtn');

const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const forgotEmail = document.getElementById('forgotEmail');
const forgotBtn = document.getElementById('forgotBtn');

const resetPassword = document.getElementById('resetPassword');
const resetBtn = document.getElementById('resetBtn');

const loginAlert = document.getElementById('loginAlert');
const loginAlertText = document.getElementById('loginAlertText');

function showLoginMessage(message, type = 'error') {
  loginAlertText.textContent = message;
  loginAlert.classList.remove('show', 'success');
  void loginAlert.offsetWidth;

  if (type === 'success') {
    loginAlert.classList.add('success');
  }

  loginAlert.classList.add('show');
}

function hideLoginMessage() {
  loginAlert.classList.remove('show', 'success');
}

function setButtonLoading(button, loading, text = null) {
  if (!button) return;

  button.disabled = loading;
  button.classList.toggle('loading', loading);

  const textEl = button.querySelector('.login-btn-text');

  if (text && textEl) {
    textEl.textContent = text;
  }
}

function trocarPainel(nomePainel) {
  hideLoginMessage();

  panels.forEach((panel) => {
    panel.classList.remove('active');
  });

  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.authTab === nomePainel);
  });

  const panel = {
    login: loginForm,
    register: registerForm,
    forgot: forgotForm,
    reset: resetForm
  }[nomePainel];

  panel?.classList.add('active');

  if (loginTabs) {
    loginTabs.style.display = ['login', 'register'].includes(nomePainel) ? 'grid' : 'none';
  }
}

function capitalizarNome(valor) {
  return String(valor || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)([a-záàâãéèêíïóôõöúçñ])/g, (txt) => txt.toUpperCase());
}

function mascararTelefone(valor) {
  const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function obterRedirectUrl() {
  return `${window.location.origin}/admin/login.html`;
}

function obterMetadataUsuario(user) {
  return user?.user_metadata || user?.raw_user_meta_data || {};
}

async function buscarVinculoUsuario(userId) {
  const { data, error } = await supabaseClient
    .from('usuarios_empresa')
    .select('id, empresa_id, ativo')
    .eq('usuario_id', userId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Erro ao buscar vínculo:', error);
    return null;
  }

  return data;
}

async function criarEmpresaInicial(user) {
  const metadata = obterMetadataUsuario(user);

  const nomeResponsavel = capitalizarNome(metadata.nome || user.email?.split('@')[0] || 'Proprietário');
  const nomeEmpresa = capitalizarNome(metadata.empresa_nome || 'Nova empresa');
  const telefone = metadata.telefone || '';

  const { data: empresa, error: empresaError } = await supabaseClient
    .from('empresas')
    .insert({
      nome_fantasia: nomeEmpresa,
      razao_social: nomeEmpresa,
      telefone,
      email: user.email,
      ativo: true
    })
    .select('id')
    .single();

  if (empresaError) {
    throw empresaError;
  }

  const { error: vinculoError } = await supabaseClient
    .from('usuarios_empresa')
    .insert({
      empresa_id: empresa.id,
      usuario_id: user.id,
      nome: nomeResponsavel,
      email: user.email,
      perfil: 'proprietario',
      ativo: true
    });

  if (vinculoError) {
    throw vinculoError;
  }

  const { error: configError } = await supabaseClient
    .from('configuracoes_empresa')
    .insert({
      empresa_id: empresa.id
    });

  if (configError) {
    console.warn('Configuração inicial não criada:', configError);
  }

  return empresa;
}

async function garantirEmpresaUsuario() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (!user) return null;

  const vinculo = await buscarVinculoUsuario(user.id);

  if (vinculo) {
    return vinculo;
  }

  await criarEmpresaInicial(user);

  return buscarVinculoUsuario(user.id);
}

async function verificarSessaoAtual() {
  if (!supabaseClient) return;

  const url = new URL(window.location.href);
  const isRecovery = url.searchParams.get('recover') === 'true' || window.location.hash.includes('type=recovery');

  if (isRecovery) {
    trocarPainel('reset');
    showLoginMessage('Digite sua nova senha para concluir a recuperação.', 'success');
    return;
  }

  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    await garantirEmpresaUsuario();
    window.location.href = 'admin.html';
  }
}

document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;

    const isPassword = input.type === 'password';

    input.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? '🙈' : '👁';
    button.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
  });
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    trocarPainel(button.dataset.authTab);
  });
});

forgotPasswordBtn?.addEventListener('click', () => {
  trocarPainel('forgot');
  forgotEmail.value = emailInput.value.trim();
});

backToLoginBtn?.addEventListener('click', () => {
  trocarPainel('login');
});

registerName?.addEventListener('blur', () => {
  registerName.value = capitalizarNome(registerName.value);
});

registerCompany?.addEventListener('blur', () => {
  registerCompany.value = capitalizarNome(registerCompany.value);
});

registerPhone?.addEventListener('input', () => {
  registerPhone.value = mascararTelefone(registerPhone.value);
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    showLoginMessage('Supabase não carregou. Verifique os scripts no login.html.');
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  hideLoginMessage();

  if (!email || !password) {
    showLoginMessage('Preencha e-mail e senha para acessar o painel.');
    return;
  }

  setButtonLoading(loginBtn, true);

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setButtonLoading(loginBtn, false);
    passwordInput.value = '';
    passwordInput.focus();

    showLoginMessage('E-mail ou senha incorretos, ou e-mail ainda não confirmado.');
    return;
  }

  try {
    await garantirEmpresaUsuario();

    setButtonLoading(loginBtn, false, 'Acesso liberado');

    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 450);
  } catch (error) {
    console.error(error);
    setButtonLoading(loginBtn, false);
    showLoginMessage('Login feito, mas não foi possível preparar a empresa. Verifique as policies no Supabase.');
  }
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    showLoginMessage('Supabase não carregou.');
    return;
  }

  const nome = capitalizarNome(registerName.value);
  const empresaNome = capitalizarNome(registerCompany.value);
  const telefone = mascararTelefone(registerPhone.value);
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const passwordConfirm = registerPasswordConfirm.value;

  hideLoginMessage();

  if (!nome || !empresaNome || !telefone || !email || !password || !passwordConfirm) {
    showLoginMessage('Preencha todos os campos para criar sua conta.');
    return;
  }

  if (password.length < 6) {
    showLoginMessage('A senha precisa ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== passwordConfirm) {
    showLoginMessage('As senhas não conferem.');
    return;
  }

  setButtonLoading(registerBtn, true);

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: obterRedirectUrl(),
      data: {
        nome,
        empresa_nome: empresaNome,
        telefone
      }
    }
  });

  if (error) {
    setButtonLoading(registerBtn, false);
    showLoginMessage(error.message || 'Não foi possível criar a conta.');
    return;
  }

  const sessionAtiva = Boolean(data?.session);

  if (sessionAtiva && data?.user) {
    try {
      await garantirEmpresaUsuario();

      setButtonLoading(registerBtn, false, 'Conta criada');

      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 650);

      return;
    } catch (error) {
      console.error(error);
      setButtonLoading(registerBtn, false);
      showLoginMessage('Conta criada, mas não foi possível criar a empresa. Verifique as policies.');
      return;
    }
  }

  setButtonLoading(registerBtn, false);

  registerForm.reset();
  trocarPainel('login');

  showLoginMessage('Conta criada. Confirme seu e-mail antes de entrar no painel.', 'success');
});

forgotForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = forgotEmail.value.trim();

  hideLoginMessage();

  if (!email) {
    showLoginMessage('Informe o e-mail cadastrado.');
    return;
  }

  setButtonLoading(forgotBtn, true);

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${obterRedirectUrl()}?recover=true`
  });

  setButtonLoading(forgotBtn, false);

  if (error) {
    showLoginMessage('Não foi possível enviar o e-mail de recuperação.');
    return;
  }

  trocarPainel('login');
  showLoginMessage('Enviamos o link de recuperação para seu e-mail.', 'success');
});

resetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const novaSenha = resetPassword.value;

  hideLoginMessage();

  if (!novaSenha || novaSenha.length < 6) {
    showLoginMessage('A nova senha precisa ter pelo menos 6 caracteres.');
    return;
  }

  setButtonLoading(resetBtn, true);

  const { error } = await supabaseClient.auth.updateUser({
    password: novaSenha
  });

  setButtonLoading(resetBtn, false);

  if (error) {
    showLoginMessage('Não foi possível atualizar a senha. Abra novamente o link recebido por e-mail.');
    return;
  }

  await supabaseClient.auth.signOut();

  window.history.replaceState({}, document.title, 'login.html');

  resetForm.reset();
  trocarPainel('login');
  showLoginMessage('Senha atualizada. Entre usando sua nova senha.', 'success');
});

verificarSessaoAtual();

/* ==================== PARTÍCULAS ==================== */

const canvas = document.getElementById('loginParticles');
const ctx = canvas?.getContext('2d');

if (canvas && ctx) {
  let width = 0;
  let height = 0;
  const particles = [];

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles.length = 0;

    const total = window.innerWidth < 768 ? 34 : 72;

    for (let i = 0; i < total; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.45 + 0.08
      });
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = '#ff3b2f';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }

  resizeCanvas();
  createParticles();
  drawParticles();

  window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles();
  });
}