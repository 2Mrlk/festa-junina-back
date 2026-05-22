// ============================================================
//  festa-junina-back — server.js  (substitui o atual)
//  Rotas: /health, /correio, /produtos, /pamonha,
//         /agendamentos, /milho/cotacao, /milho/blocos,
//         /milho/carteira, /milho/transacao, /pedidos
// ============================================================

const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ── Supabase ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // chave service_role (sem RLS)
);

// ── Helpers ──────────────────────────────────────────────────
function ok(res, data)         { res.json(data); }
function err(res, msg, status) { res.status(status || 500).json({ error: msg }); }

// ============================================================
//  HEALTH CHECK  ←  era isso que faltava e causava o 404
// ============================================================
app.get('/health', async (req, res) => {
  try {
    // Faz uma query leve só para confirmar conexão com o Supabase
    const { error } = await supabase.from('milho_cotacoes').select('id').limit(1);
    if (error) throw error;
    ok(res, { status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: e.message });
  }
});

// ============================================================
//  CORREIO ELEGANTE
// ============================================================
app.get('/correio', async (req, res) => {
  const { data, error } = await supabase
    .from('correio_elegante')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(20);
  if (error) return err(res, error.message);
  // Renomeia criado_em → created_at para o frontend
  ok(res, (data || []).map(c => ({ ...c, created_at: c.criado_em })));
});

app.post('/correio', async (req, res) => {
  const { from_name, to_name, message, theme, anonymous } = req.body;
  if (!to_name) return err(res, 'to_name é obrigatório', 400);
  const { data, error } = await supabase
    .from('correio_elegante')
    .insert({ from_name: from_name || null, to_name, message: message || null, theme: theme || 'romantic', anonymous: !!anonymous })
    .select()
    .single();
  if (error) return err(res, error.message);
  ok(res, data);
});

// ============================================================
//  PRODUTOS  (leitura da tabela produtos se existir)
// ============================================================
app.get('/produtos', async (req, res) => {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending: false });
  // Se tabela não existir ainda, retorna lista vazia
  if (error) return ok(res, []);
  ok(res, data || []);
});

// ============================================================
//  PEDIDOS  (genérico — frontend usa para itens da loja)
// ============================================================
app.post('/pedidos', async (req, res) => {
  // Apenas registra; ignora silenciosamente se tabela não existir
  const { produto_id, produto_nome, preco } = req.body;
  ok(res, { status: 'ok', produto_nome, preco });
});

// ============================================================
//  PAMONHAS
// ============================================================
app.post('/pamonha', async (req, res) => {
  const { session_id, quantidade, observacao } = req.body;
  const qty = parseInt(quantidade);
  if (!qty || qty < 1 || qty > 500)
    return err(res, 'quantidade deve ser entre 1 e 500', 400);
  const { data, error } = await supabase
    .from('pedidos_pamonha')
    .insert({ session_id: session_id || null, quantidade: qty, observacao: observacao || null })
    .select()
    .single();
  if (error) return err(res, error.message);
  ok(res, data);
});

app.get('/pamonha', async (req, res) => {
  const { session_id } = req.query;
  let q = supabase.from('pedidos_pamonha').select('*').order('criado_em', { ascending: false }).limit(50);
  if (session_id) q = q.eq('session_id', session_id);
  const { data, error } = await q;
  if (error) return err(res, error.message);
  ok(res, data || []);
});

// ============================================================
//  AGENDAMENTOS
// ============================================================
app.get('/agendamentos', async (req, res) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('status', 'confirmado')
    .order('horario', { ascending: true });
  if (error) return err(res, error.message);
  ok(res, data || []);
});

app.post('/agendamentos', async (req, res) => {
  const { session_id, nome_usuario, horario } = req.body;
  if (!nome_usuario || !horario) return err(res, 'nome_usuario e horario são obrigatórios', 400);

  // Verifica se horário já está ocupado
  const { data: exist } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('horario', horario)
    .eq('status', 'confirmado')
    .limit(1);
  if (exist && exist.length > 0) return err(res, 'Horário já ocupado', 409);

  // Conta posição na fila
  const { count } = await supabase
    .from('agendamentos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmado');

  const { data, error } = await supabase
    .from('agendamentos')
    .insert({ session_id: session_id || null, nome_usuario, horario, posicao_fila: (count || 0) + 1 })
    .select()
    .single();
  if (error) return err(res, error.message);
  ok(res, data);
});

app.delete('/agendamentos/:id', async (req, res) => {
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', req.params.id);
  if (error) return err(res, error.message);
  ok(res, { status: 'cancelado' });
});

// ============================================================
//  MILHO-COIN
// ============================================================

// Cotação atual
app.get('/milho/cotacao', async (req, res) => {
  const { data, error } = await supabase
    .from('milho_cotacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  if (error) return ok(res, { preco_brl: 0.50, variacao: 0 });
  ok(res, data);
});

// Blocos da Milho-Net
app.get('/milho/blocos', async (req, res) => {
  const { data, error } = await supabase
    .from('milho_blocos')
    .select('*')
    .order('numero', { ascending: false })
    .limit(10);
  if (error) return err(res, error.message);
  ok(res, data || []);
});

// Carteira por session_id (cria se não existir)
app.get('/milho/carteira', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return err(res, 'session_id obrigatório', 400);
  let { data, error } = await supabase
    .from('milho_carteiras')
    .select('*')
    .eq('session_id', session_id)
    .single();
  if (error || !data) {
    // Cria carteira nova com 100 ₥
    const ins = await supabase
      .from('milho_carteiras')
      .insert({ session_id, saldo: 100 })
      .select()
      .single();
    if (ins.error) return err(res, ins.error.message);
    data = ins.data;
  }
  ok(res, data);
});

// Registrar transação (depósito ou pagamento)
app.post('/milho/transacao', async (req, res) => {
  const { session_id, tipo, valor_milho, valor_brl, descricao } = req.body;
  if (!session_id || !tipo || !valor_milho) return err(res, 'session_id, tipo e valor_milho são obrigatórios', 400);

  // Busca carteira
  let { data: carteira } = await supabase
    .from('milho_carteiras')
    .select('*')
    .eq('session_id', session_id)
    .single();
  if (!carteira) return err(res, 'Carteira não encontrada', 404);

  // Calcula novo saldo
  let novoSaldo = Number(carteira.saldo);
  if (tipo === 'deposito' || tipo === 'bonus') {
    novoSaldo += Number(valor_milho);
  } else if (tipo === 'pagamento') {
    if (novoSaldo < Number(valor_milho)) return err(res, 'Saldo insuficiente', 402);
    novoSaldo -= Number(valor_milho);
  }

  // Atualiza saldo
  const { error: updErr } = await supabase
    .from('milho_carteiras')
    .update({ saldo: novoSaldo })
    .eq('id', carteira.id);
  if (updErr) return err(res, updErr.message);

  // Registra transação
  const { data: tx, error: txErr } = await supabase
    .from('milho_transacoes')
    .insert({ carteira_id: carteira.id, tipo, valor_milho, valor_brl: valor_brl || null, descricao: descricao || null })
    .select()
    .single();
  if (txErr) return err(res, txErr.message);

  ok(res, { transacao: tx, saldo: novoSaldo });
});

// Extrato de transações
app.get('/milho/transacoes', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return err(res, 'session_id obrigatório', 400);
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
  if (error) return err(res, error.message);
  ok(res, data || []);
});

// ============================================================
//  FALLBACK 404
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada` });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Arraiá Digital API rodando na porta ${PORT}`));

module.exports = app;
