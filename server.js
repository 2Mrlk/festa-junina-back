// ============================================================
//  festa-junina-back — server.js
//  Compatível com a estrutura original: rotas em /api/*
//  Vercel: vercel.json já redireciona /* → server.js
// ============================================================

const express = require('express');
const app = express();

// ── CORS manual (sem pacote extra) ───────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// ── Supabase ─────────────────────────────────────────────────
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    supabase = createClient(url, key);
  }
} catch (e) {
  console.error('Supabase init error:', e.message);
}

// ── Helpers ──────────────────────────────────────────────────
const ok  = (res, data)       => res.json(data);
const bad = (res, msg, code)  => res.status(code || 400).json({ error: msg });
const dbErr = (res, e)        => res.status(500).json({ error: e?.message || 'DB error' });

function requireDb(res) {
  if (!supabase) {
    res.status(503).json({ error: 'Banco não configurado. Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no Vercel.' });
    return false;
  }
  return true;
}

// ============================================================
//  HEALTH  — GET /health  e  GET /api/health
// ============================================================
async function handleHealth(req, res) {
  if (!supabase) {
    return res.status(503).json({
      status: 'degraded',
      error: 'SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados'
    });
  }
  try {
    const { error } = await supabase.from('milho_cotacoes').select('id').limit(1);
    if (error) throw error;
    ok(res, { status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: e.message });
  }
}
app.get('/health',     handleHealth);
app.get('/api/health', handleHealth);

// ============================================================
//  CORREIO ELEGANTE  — /api/correio
// ============================================================
app.get('/api/correio', async (req, res) => {
  if (!requireDb(res)) return;
  const { data, error } = await supabase
    .from('correio_elegante')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(20);
  if (error) return dbErr(res, error);
  ok(res, (data || []).map(c => ({ ...c, created_at: c.criado_em })));
});

app.post('/api/correio', async (req, res) => {
  if (!requireDb(res)) return;
  const { from_name, to_name, message, theme, anonymous } = req.body || {};
  if (!to_name) return bad(res, 'to_name é obrigatório');
  const { data, error } = await supabase
    .from('correio_elegante')
    .insert({
      from_name: from_name || null,
      to_name,
      message: message || null,
      theme: theme || 'romantic',
      anonymous: !!anonymous
    })
    .select().single();
  if (error) return dbErr(res, error);
  ok(res, data);
});

// ============================================================
//  PRODUTOS  — /api/produtos
// ============================================================
app.get('/api/produtos', async (req, res) => {
  if (!requireDb(res)) return;
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending: false });
  // tabela pode não existir ainda → retorna lista vazia
  if (error) return ok(res, []);
  ok(res, data || []);
});

// ============================================================
//  PEDIDOS  — /api/pedidos
// ============================================================
app.post('/api/pedidos', async (req, res) => {
  ok(res, { status: 'ok' });
});

// ============================================================
//  PAMONHAS  — /api/pamonha
// ============================================================
app.get('/api/pamonha', async (req, res) => {
  if (!requireDb(res)) return;
  const { session_id } = req.query;
  let q = supabase.from('pedidos_pamonha').select('*').order('criado_em', { ascending: false }).limit(50);
  if (session_id) q = q.eq('session_id', session_id);
  const { data, error } = await q;
  if (error) return dbErr(res, error);
  ok(res, data || []);
});

app.post('/api/pamonha', async (req, res) => {
  if (!requireDb(res)) return;
  const { session_id, quantidade, observacao } = req.body || {};
  const qty = parseInt(quantidade);
  if (!qty || qty < 1 || qty > 500) return bad(res, 'quantidade deve ser entre 1 e 500');
  const { data, error } = await supabase
    .from('pedidos_pamonha')
    .insert({ session_id: session_id || null, quantidade: qty, observacao: observacao || null })
    .select().single();
  if (error) return dbErr(res, error);
  ok(res, data);
});

// ============================================================
//  AGENDAMENTOS  — /api/agendamentos
// ============================================================
app.get('/api/agendamentos', async (req, res) => {
  if (!requireDb(res)) return;
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('status', 'confirmado')
    .order('horario', { ascending: true });
  if (error) return dbErr(res, error);
  ok(res, data || []);
});

app.post('/api/agendamentos', async (req, res) => {
  if (!requireDb(res)) return;
  const { session_id, nome_usuario, horario } = req.body || {};
  if (!nome_usuario || !horario) return bad(res, 'nome_usuario e horario são obrigatórios');

  // Verifica se horário já ocupado
  const { data: exist } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('horario', horario)
    .eq('status', 'confirmado')
    .limit(1);
  if (exist && exist.length > 0) return bad(res, 'Horário já ocupado', 409);

  const { count } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmado');

  const { data, error } = await supabase
    .from('agendamentos')
    .insert({ session_id: session_id || null, nome_usuario, horario, posicao_fila: (count || 0) + 1 })
    .select().single();
  if (error) return dbErr(res, error);
  ok(res, data);
});

app.delete('/api/agendamentos/:id', async (req, res) => {
  if (!requireDb(res)) return;
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', req.params.id);
  if (error) return dbErr(res, error);
  ok(res, { status: 'cancelado' });
});

// ============================================================
//  MILHO-COIN  — /api/milho/*
// ============================================================
app.get('/api/milho/cotacao', async (req, res) => {
  if (!requireDb(res)) return;
  const { data, error } = await supabase
    .from('milho_cotacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(1).single();
  if (error) return ok(res, { preco_brl: 0.50, variacao: 0 });
  ok(res, data);
});

app.get('/api/milho/blocos', async (req, res) => {
  if (!requireDb(res)) return;
  const { data, error } = await supabase
    .from('milho_blocos')
    .select('*')
    .order('numero', { ascending: false })
    .limit(10);
  if (error) return dbErr(res, error);
  ok(res, data || []);
});

app.get('/api/milho/carteira', async (req, res) => {
  if (!requireDb(res)) return;
  const { session_id } = req.query;
  if (!session_id) return bad(res, 'session_id obrigatório');

  let { data } = await supabase
    .from('milho_carteiras')
    .select('*')
    .eq('session_id', session_id)
    .single();

  if (!data) {
    const ins = await supabase
      .from('milho_carteiras')
      .insert({ session_id, saldo: 100 })
      .select().single();
    if (ins.error) return dbErr(res, ins.error);
    data = ins.data;
  }
  ok(res, data);
});

app.post('/api/milho/transacao', async (req, res) => {
  if (!requireDb(res)) return;
  const { session_id, tipo, valor_milho, valor_brl, descricao } = req.body || {};
  if (!session_id || !tipo || !valor_milho) return bad(res, 'session_id, tipo e valor_milho são obrigatórios');

  let { data: carteira } = await supabase
    .from('milho_carteiras')
    .select('*')
    .eq('session_id', session_id)
    .single();
  if (!carteira) return bad(res, 'Carteira não encontrada', 404);

  let novoSaldo = Number(carteira.saldo);
  if (tipo === 'deposito' || tipo === 'bonus') {
    novoSaldo += Number(valor_milho);
  } else if (tipo === 'pagamento') {
    if (novoSaldo < Number(valor_milho)) return bad(res, 'Saldo insuficiente', 402);
    novoSaldo -= Number(valor_milho);
  }

  const { error: updErr } = await supabase
    .from('milho_carteiras')
    .update({ saldo: novoSaldo })
    .eq('id', carteira.id);
  if (updErr) return dbErr(res, updErr);

  const { data: tx, error: txErr } = await supabase
    .from('milho_transacoes')
    .insert({ carteira_id: carteira.id, tipo, valor_milho, valor_brl: valor_brl || null, descricao: descricao || null })
    .select().single();
  if (txErr) return dbErr(res, txErr);

  ok(res, { transacao: tx, saldo: novoSaldo });
});

app.get('/api/milho/transacoes', async (req, res) => {
  if (!requireDb(res)) return;
  const { session_id } = req.query;
  if (!session_id) return bad(res, 'session_id obrigatório');
  const { data: carteira } = await supabase
    .from('milho_carteiras')
    .select('id')
    .eq('session_id', session_id)
    .single();
  if (!carteira) return ok(res, []);
  const { data, error } = await supabase
    .from('milho_transacoes')
    .select('*')
    .eq('carteira_id', carteira.id)
    .order('criado_em', { ascending: false })
    .limit(20);
  if (error) return dbErr(res, error);
  ok(res, data || []);
});

// ============================================================
//  FALLBACK
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada` });
});

// ── Start (local) ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));

module.exports = app;
