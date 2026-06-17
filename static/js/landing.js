/* ============================================================
   CRV AUTO CRM — LANDING.JS
   Landing pública · Pré-login provisório
   ============================================================ */

const openPreLogin = document.getElementById('openPreLogin');
const openPreLoginTop = document.getElementById('openPreLoginTop');
const closePreLogin = document.getElementById('closePreLogin');
const preLoginModal = document.getElementById('preLoginModal');
const preLoginForm = document.getElementById('preLoginForm');
const preLoginEmail = document.getElementById('preLoginEmail');
const preLoginPassword = document.getElementById('preLoginPassword');
const preLoginAlert = document.getElementById('preLoginAlert');

const PRE_LOGIN_EMAIL = 'admin@sistema.com';
const PRE_LOGIN_PASSWORD = 'admin1234';

function abrirPreLogin() {
  preLoginModal.classList.add('open');
  preLoginAlert.classList.remove('show');

  setTimeout(() => {
    preLoginEmail.focus();
  }, 100);
}

function fecharPreLogin() {
  preLoginModal.classList.remove('open');
  preLoginForm.reset();
  preLoginAlert.classList.remove('show');
}

openPreLogin?.addEventListener('click', abrirPreLogin);
openPreLoginTop?.addEventListener('click', abrirPreLogin);
closePreLogin?.addEventListener('click', fecharPreLogin);

preLoginModal?.addEventListener('click', (event) => {
  if (event.target === preLoginModal) {
    fecharPreLogin();
  }
});

preLoginForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const email = preLoginEmail.value.trim().toLowerCase();
  const password = preLoginPassword.value;

  if (email !== PRE_LOGIN_EMAIL || password !== PRE_LOGIN_PASSWORD) {
    preLoginAlert.classList.add('show');
    preLoginPassword.value = '';
    preLoginPassword.focus();
    return;
  }

  sessionStorage.setItem('crv_auto_prelogin', 'ok');
  window.location.href = 'admin/login.html';
});

/* ==================== PARTÍCULAS ==================== */

const canvas = document.getElementById('landingParticles');
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

    const total = window.innerWidth < 768 ? 34 : 76;

    for (let i = 0; i < total; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        size: Math.random() * 1.9 + 0.4,
        alpha: Math.random() * 0.42 + 0.08
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