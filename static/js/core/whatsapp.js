// static/js/core/whatsapp.js
// Núcleo de Atendimento/WhatsApp (agnóstico de provedor) — multiempresa + RLS.
// Depende: window.MAXX_SUPABASE + SQL da Etapa 1 (tabela `interacoes`, função usuario_empresa_id()).
(function (global) {

  function db() {
    const c = global.MAXX_SUPABASE;
    if (!c) throw new Error('window.MAXX_SUPABASE não encontrado — carregue supabase.js antes.');
    return c;
  }

  let _empresaId = null;
  async function empresaId() {
    if (_empresaId) return _empresaId;
    const { data, error } = await db().rpc('usuario_empresa_id');
    if (error) throw error;
    return (_empresaId = data);
  }

  function somenteNumeros(v){ return String(v || '').replace(/\D/g, ''); }
  function normalizarTelefone(tel){ let n = somenteNumeros(tel); if (!n) return ''; if (n.length <= 11) n = '55' + n; return n; }
  function linkWhatsApp(tel, msg){ const n = normalizarTelefone(tel); if (!n) return ''; return 'https://wa.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : ''); }

  async function registrarInteracao({ lead_id=null, cliente_id=null, veiculo_id=null, canal='whatsapp', sentido='saida', mensagem='' }) {
    const empresa_id = await empresaId();
    let uid = null;
    try { const r = await db().auth.getUser(); uid = r && r.data && r.data.user ? r.data.user.id : null; } catch (_) {}
    const { data, error } = await db().from('interacoes')
      .insert({ empresa_id, lead_id, cliente_id, veiculo_id, canal, sentido, mensagem, user_id: uid })
      .select().single();
    if (error) throw error;
    return data; // trigger atualiza leads.ultimo_contato_at
  }

  async function abrirEAtender({ telefone, mensagem='', lead_id=null, cliente_id=null, veiculo_id=null }) {
    const url = linkWhatsApp(telefone, mensagem);
    if (url) global.open(url, '_blank', 'noopener');
    try { await registrarInteracao({ lead_id, cliente_id, veiculo_id, mensagem }); }
    catch (e) { console.warn('Interação não registrada:', e.message); }
    return url;
  }

  async function listarInteracoes({ lead_id=null, cliente_id=null, limit=50 }) {
    let q = db().from('interacoes').select('*').order('created_at', { ascending:false }).limit(limit);
    if (lead_id) q = q.eq('lead_id', lead_id);
    if (cliente_id) q = q.eq('cliente_id', cliente_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function agendarFollowUp(lead_id, { proximo_contato_at=null, temperatura=null }) {
    const patch = {};
    if (proximo_contato_at !== null) patch.proximo_contato_at = proximo_contato_at;
    if (temperatura !== null) patch.temperatura = temperatura;
    const { data, error } = await db().from('leads').update(patch).eq('id', lead_id).select().single();
    if (error) throw error;
    return data;
  }

  async function moverEtapa(lead_id, novaEtapa) {
    const { data, error } = await db().from('leads').update({ etapa: novaEtapa }).eq('id', lead_id).select().single();
    if (error) throw error;
    return data;
  }

  async function enviarViaProvedor() {
    throw new Error('Envio automático requer Edge Function (Etapa 1B). Por ora use abrirEAtender().');
  }

  global.WhatsAppCRM = { empresaId, somenteNumeros, normalizarTelefone, linkWhatsApp, registrarInteracao, abrirEAtender, listarInteracoes, agendarFollowUp, moverEtapa, enviarViaProvedor };
})(window);