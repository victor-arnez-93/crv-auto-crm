/* ============================================================
   MAXX VEÍCULOS — THEME.JS
   Header global · Tema · Sidebar · Logo dinâmica · Clima
   ============================================================ */

const MAXX_THEME_KEY = 'maxx_admin_theme';
const MAXX_SIDEBAR_KEY = 'maxx_admin_sidebar';

const MAXX_WEATHER_LAT = -23.35;
const MAXX_WEATHER_LON = -47.85;
const MAXX_WEATHER_CITY = 'Tatuí - SP';

function maxxThemeLogoUrl(path) {
  if (!path) return '../static/img/logo1.png';
  if (String(path).startsWith('http')) return path;

  const { data } = window.MAXX_SUPABASE.storage
    .from('logos')
    .getPublicUrl(path);

  return data.publicUrl;
}

function maxxThemeSaudacao() {
  const hora = new Date().getHours();

  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function maxxThemeHora() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function maxxThemeIniciais(nome = '') {
  const partes = String(nome || 'Usuário')
    .trim()
    .split(' ')
    .filter(Boolean);

  return partes
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U';
}

async function maxxThemeUsuario() {
  const { data } = await window.MAXX_SUPABASE.auth.getUser();
  const user = data?.user;

  return {
    email: user?.email || '',
    nome:
      user?.user_metadata?.name ||
      user?.user_metadata?.nome ||
      user?.email?.split('@')[0] ||
      'Usuário'
  };
}

function maxxThemeAplicarTemaInicial() {
  const tema = localStorage.getItem(MAXX_THEME_KEY) || 'dark';
  document.body.classList.toggle('admin-light', tema === 'light');
}

function maxxThemeAlternarTema() {
  const claro = document.body.classList.toggle('admin-light');

  localStorage.setItem(MAXX_THEME_KEY, claro ? 'light' : 'dark');

  const btn = document.getElementById('adminThemeToggle');
  if (btn) btn.textContent = claro ? '☀' : '☾';
}

function maxxThemeAplicarSidebarInicial() {
  const recolhida = localStorage.getItem(MAXX_SIDEBAR_KEY) === 'collapsed';
  document.body.classList.toggle('sidebar-collapsed', recolhida);
}

function maxxThemeAlternarSidebar() {
  const recolhida = document.body.classList.toggle('sidebar-collapsed');

  localStorage.setItem(
    MAXX_SIDEBAR_KEY,
    recolhida ? 'collapsed' : 'expanded'
  );
}

function maxxThemeAplicarCores(empresa) {
  const corPrimaria = empresa?.cor_primaria || '#ff3b2f';
  const corSecundaria = empresa?.cor_secundaria || '#111111';

  document.documentElement.style.setProperty('--dynamic-primary', corPrimaria);
  document.documentElement.style.setProperty('--dynamic-secondary', corSecundaria);

  document.documentElement.style.setProperty('--primary', corPrimaria);
  document.documentElement.style.setProperty('--primary-2', corPrimaria);
}

function maxxThemeAtualizarSidebar(empresa) {
  const sidebar = document.querySelector('.admin-sidebar');
  const logoImg = document.querySelector('.admin-logo img');

  if (!sidebar) return;

  if (logoImg) {
    logoImg.src = maxxThemeLogoUrl(empresa?.logo_url);
    logoImg.alt = empresa?.nome_fantasia || 'Logo da empresa';
  }

  if (!document.querySelector('.admin-sidebar-toggle')) {
    const toggle = document.createElement('button');

    toggle.type = 'button';
    toggle.className = 'admin-sidebar-toggle';
    toggle.innerHTML = '<span>‹</span>';
    toggle.title = 'Recolher menu';

    toggle.addEventListener('click', maxxThemeAlternarSidebar);

    sidebar.appendChild(toggle);
  }

  if (!document.querySelector('.admin-sidebar-footer')) {
    const footer = document.createElement('div');

    footer.className = 'admin-sidebar-footer';
    footer.innerHTML = `
      <small>Desenvolvido por</small>
      <a href="https://crvsolucoesti.com" target="_blank" rel="noopener">
        <img src="../static/img/logooficial.png" alt="CRV Soluções em TI">
      </a>
    `;

    sidebar.appendChild(footer);
  }
}

/* ==================== CLIMA ==================== */

function maxxWeatherIsDia() {
  const hora = new Date().getHours();
  return hora >= 6 && hora < 18;
}

function maxxWeatherIcon(code) {
  if (code >= 51 && code <= 82) return '../static/img/ico_chuva.png';
  if (code > 82) return '../static/img/ico_chuva.png';

  if (!maxxWeatherIsDia()) return '../static/img/ico_noite.png';

  if (code <= 1) return '../static/img/ico_dia.png';
  if (code <= 3) return '../static/img/ico_nublado.png';

  return '../static/img/ico_chuva.png';
}

function maxxWeatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 67) return '🌧️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function maxxWeatherCriarModal() {
  if (document.getElementById('adminWeatherModal')) return;

  const modal = document.createElement('div');
  modal.className = 'admin-weather-modal';
  modal.id = 'adminWeatherModal';

  modal.innerHTML = `
    <div class="admin-weather-card">
      <div class="admin-weather-head">
        <strong>${MAXX_WEATHER_CITY}</strong>
        <button type="button" id="adminWeatherClose">×</button>
      </div>

      <div class="admin-weather-days" id="adminWeatherDays">
        <p>Carregando previsão...</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.classList.remove('show');
    }
  });

  document.getElementById('adminWeatherClose')?.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

async function maxxWeatherCarregar() {
  const temp = document.getElementById('adminWeatherTemp');
  const icon = document.getElementById('adminWeatherIcon');
  const days = document.getElementById('adminWeatherDays');

  if (!temp || !icon) return;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${MAXX_WEATHER_LAT}&longitude=${MAXX_WEATHER_LON}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=America/Sao_Paulo&forecast_days=3`;

    const resp = await fetch(url);
    const data = await resp.json();

    temp.textContent = `${Math.round(data.current_weather.temperature)}°C`;
    icon.src = maxxWeatherIcon(data.current_weather.weathercode);

    const diasSemana = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

    if (days) {
      days.innerHTML = data.daily.time.map((dia, index) => {
        const dt = new Date(`${dia}T12:00:00`);
        const nome = index === 0 ? 'hoje' : diasSemana[dt.getDay()];
        const max = Math.round(data.daily.temperature_2m_max[index]);
        const min = Math.round(data.daily.temperature_2m_min[index]);
        const emoji = maxxWeatherEmoji(data.daily.weathercode[index]);

        return `
          <div class="admin-weather-day">
            <span>${nome}</span>
            <strong>${max}° / ${min}°</strong>
            <em>${emoji}</em>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar clima:', error);

    temp.textContent = '--°C';

    if (days) {
      days.innerHTML = '<p>Clima indisponível no momento.</p>';
    }
  }
}

/* ==================== HEADER ==================== */
async function maxxThemeCriarHeader(empresa) {
  if (document.querySelector('.admin-global-header')) return;

  const usuario = await maxxThemeUsuario();
  const temaAtual = localStorage.getItem(MAXX_THEME_KEY) || 'dark';

  const header = document.createElement('header');
  header.className = 'admin-global-header';

  header.innerHTML = `
    <button class="admin-mobile-menu-btn" id="adminMobileMenuBtn" type="button" title="Abrir menu">
      ☰
    </button>

    <div class="admin-global-brand">
      <div class="admin-global-brand-text">
        <strong>${maxxThemeSaudacao()}, ${empresa?.nome_fantasia || 'Revenda'}</strong>
        <span>Painel de gestão comercial</span>
      </div>
    </div>

    <div class="admin-global-search">
      <input id="adminGlobalSearch" type="search" placeholder="Buscar no painel...">
      <span>⌕</span>
    </div>

    <div class="admin-global-actions">
      <div class="admin-global-clock" id="adminGlobalClock">
        ${maxxThemeHora()}
      </div>

      <button class="admin-global-weather" id="adminWeatherBtn" type="button" title="Ver previsão">
        <img id="adminWeatherIcon" src="../static/img/ico_dia.png" alt="">
        <strong id="adminWeatherTemp">--°C</strong>
      </button>

      <button class="admin-theme-toggle" id="adminThemeToggle" type="button" title="Alternar tema">
        ${temaAtual === 'light' ? '☀' : '☾'}
      </button>

      <div class="admin-global-user">
        <div class="admin-global-avatar">
          ${maxxThemeIniciais(usuario.nome)}
        </div>

        <div>
          <strong>${usuario.nome}</strong>
          <span>${empresa?.perfil || 'Usuário'}</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(header);
  document.body.classList.add('has-admin-header');

  document
    .getElementById('adminThemeToggle')
    ?.addEventListener('click', maxxThemeAlternarTema);

  document
    .getElementById('adminWeatherBtn')
    ?.addEventListener('click', () => {
      maxxWeatherCriarModal();
      maxxWeatherCarregar();
      document.getElementById('adminWeatherModal')?.classList.add('show');
    });

  const mobileBtn = document.getElementById('adminMobileMenuBtn');

  if (!document.querySelector('.admin-mobile-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'admin-mobile-overlay';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => {
      document.querySelector('.admin-sidebar')?.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
  }

  mobileBtn?.addEventListener('click', () => {
    document.querySelector('.admin-sidebar')?.classList.add('mobile-open');
    document.querySelector('.admin-mobile-overlay')?.classList.add('show');
  });

  document.querySelectorAll('.admin-menu a, .admin-menu button').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.innerWidth > 1024) return;

      document.querySelector('.admin-sidebar')?.classList.remove('mobile-open');
      document.querySelector('.admin-mobile-overlay')?.classList.remove('show');
    });
  });

  setInterval(() => {
    const clock = document.getElementById('adminGlobalClock');
    if (clock) clock.textContent = maxxThemeHora();
  }, 1000);

  setInterval(maxxWeatherCarregar, 600000);

  document
    .getElementById('adminGlobalSearch')
    ?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      const termo = event.target.value.trim();
      if (!termo) return;

      const inputLocal =
        document.querySelector('#buscaAdmin') ||
        document.querySelector('#buscaClientes') ||
        document.querySelector('#buscaLeads') ||
        document.querySelector('#buscaPropostas') ||
        document.querySelector('#buscaFinanceiro');

      if (!inputLocal) return;

      inputLocal.value = termo;
      inputLocal.dispatchEvent(new Event('input'));
      inputLocal.dispatchEvent(new Event('change'));
    });

  maxxWeatherCriarModal();
  await maxxWeatherCarregar();
}

/* ==================== INIT ==================== */

async function iniciarThemeAdmin() {
  maxxThemeAplicarTemaInicial();
  maxxThemeAplicarSidebarInicial();

  const empresa = window.MAXX_EMPRESA || await window.carregarEmpresaAtual?.();

  if (!empresa) return;

  maxxThemeAplicarCores(empresa);
  maxxThemeAtualizarSidebar(empresa);
  await maxxThemeCriarHeader(empresa);
}

window.iniciarThemeAdmin = iniciarThemeAdmin;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(iniciarThemeAdmin, 300);
});