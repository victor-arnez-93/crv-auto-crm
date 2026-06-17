/* ============================================================
   EMPRESA.JS
   Empresa ativa do usuário logado
   ============================================================ */

let empresaAtual = null;

async function carregarEmpresaAtual() {
  if (!window.MAXX_SUPABASE) {
    console.error('Supabase não inicializado.');
    return null;
  }

  const { data, error } = await window.MAXX_SUPABASE
    .from('usuarios_empresa')
    .select(`
      empresa_id,
      perfil,
      empresas (
        id,
        nome,
        nome_fantasia,
        slug,
        logo_url,
        cor_primaria,
        cor_secundaria
      )
    `)
    .single();

  if (error) {
    console.error('Erro ao carregar empresa:', error);
    return null;
  }

  empresaAtual = {
    ...data.empresas,
    perfil: data.perfil
  };

  window.MAXX_EMPRESA = empresaAtual;

  return empresaAtual;
}

function obterEmpresaId() {
  return window.MAXX_EMPRESA?.id || null;
}

window.carregarEmpresaAtual = carregarEmpresaAtual;
window.obterEmpresaId = obterEmpresaId;

async function carregarEmpresaPublica(slug = 'maxx-veiculos') {
  if (!window.MAXX_SUPABASE) {
    console.error('Supabase não inicializado.');
    return null;
  }

  const { data, error } = await window.MAXX_SUPABASE
    .from('empresas')
    .select(`
      id,
      nome,
      nome_fantasia,
      slug,
      logo_url,
      cor_primaria,
      cor_secundaria
    `)
    .eq('slug', slug)
    .eq('ativa', true)
    .single();

  if (error) {
    console.error('Erro ao carregar empresa pública:', error);
    return null;
  }

  window.MAXX_EMPRESA_PUBLICA = data;
  return data;
}

window.carregarEmpresaPublica = carregarEmpresaPublica;