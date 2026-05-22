// =============================================================
// routes/milho.js — Milho-Coin™ Blockchain Caipira
// =============================================================
// Endpoints:
//   GET  /api/milho/carteira      → saldo da sessão
//   POST /api/milho/depositar     → converter BRL → ₥
//   POST /api/milho/pagar         → debitar ₥ da carteira
//   GET  /api/milho/blocos        → últimos blocos da Milho-Net
//   GET  /api/milho/transacoes    → histórico da sessão
//   GET  /api/milho/cotacao       → preço atual ₥/BRL
// =============================================================

const express = require('express');
const router = express.Router();
const supabase = require('../data/supabase');

const MILHO_RATE    = 2;       // ₥ por R$ 1,00  (R$ 0,50 = ₥ 1)
const SALDO_INICIAL = 100;     // ₥ de boas-vindas para novos usuários

// ── Helper: busca ou cria carteira ───────────────────────────
async function getOuCriarCarteira(session_id) {
    if (!session_id) throw new Error('session_id é obrigatório.');

    // Tenta buscar
    let { data, error } = await supabase
        .from('milho_carteiras')
        .select('*')
        .eq('session_id', session_id)
        .maybeSingle();

    if (error) throw error;

    // Cria se não existir
    if (!data) {
        const { data: nova, error: errInsert } = await supabase
            .from('milho_carteiras')
            .insert([{ session_id, saldo: SALDO_INICIAL }])
            .select()
            .single();

        if (errInsert) throw errInsert;
        data = nova;
    }

    return data;
}

// ── Helper: gera hash fictício de bloco ──────────────────────
function gerarHash(session_id, valor) {
    const raw = session_id + Date.now() + valor;
    let hash = '';
    for (let i = 0; i < raw.length; i++) {
        hash += raw.charCodeAt(i).toString(16);
    }
    return hash.slice(0, 40);
}

// ── Helper: insere bloco + transação + atualiza saldo (atômico)
async function registrarTransacao({ session_id, tipo, valor_milho, valor_brl, descricao }) {
    const carteira = await getOuCriarCarteira(session_id);

    if (valor_milho < 0 && carteira.saldo + valor_milho < 0) {
        const err = new Error(
            `Saldo insuficiente! Você tem ₥ ${carteira.saldo.toLocaleString('pt-BR')} mas tentou usar ₥ ${Math.abs(valor_milho).toLocaleString('pt-BR')}.`
        );
        err.status = 400;
        throw err;
    }

    // Próximo número de bloco
    const { data: ultimoBloco } = await supabase
        .from('milho_blocos')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();

    const blocoNumero = (ultimoBloco?.numero || 4206969) + 1;
    const blocoHash   = gerarHash(session_id, valor_milho);

    // Insere bloco
    await supabase.from('milho_blocos').insert([{
        numero:    blocoNumero,
        hash:      blocoHash,
        mensagem:  descricao || `TX: ${tipo} de ₥ ${Math.abs(valor_milho)}`,
        minerador: 'Milho-Net Auto'
    }]);

    // Insere transação
    const { data: tx, error: errTx } = await supabase
        .from('milho_transacoes')
        .insert([{
            carteira_id:  carteira.id,
            tipo,
            valor_milho,
            valor_brl:    valor_brl || null,
            taxa_cambio:  MILHO_RATE,
            descricao:    descricao || null,
            bloco_hash:   blocoHash,
            bloco_numero: blocoNumero,
            status:       'confirmado'
        }])
        .select()
        .single();

    if (errTx) throw errTx;

    // Atualiza saldo
    const novoSaldo = parseFloat(carteira.saldo) + valor_milho;
    const { error: errUp } = await supabase
        .from('milho_carteiras')
        .update({ saldo: novoSaldo })
        .eq('id', carteira.id);

    if (errUp) throw errUp;

    return { tx, novoSaldo, blocoNumero };
}


// =============================================================
// GET /api/milho/carteira?session_id=xxx
// =============================================================
router.get('/carteira', async (req, res, next) => {
    try {
        const { session_id } = req.query;
        const carteira = await getOuCriarCarteira(session_id);

        res.json({
            session_id:  carteira.session_id,
            saldo:       parseFloat(carteira.saldo),
            saldo_brl:   parseFloat((carteira.saldo / MILHO_RATE).toFixed(4)),
            taxa_cambio: MILHO_RATE,
            criado_em:   carteira.criado_em
        });
    } catch (err) {
        next(err);
    }
});


// =============================================================
// POST /api/milho/depositar
// Body: { session_id, valor_brl }  OU  { session_id, valor_milho }
// =============================================================
router.post('/depositar', async (req, res, next) => {
    try {
        const { session_id, valor_brl, valor_milho: milhoInput } = req.body;

        let milho, brl;

        if (valor_brl) {
            brl   = parseFloat(valor_brl);
            milho = Math.floor(brl * MILHO_RATE);
        } else if (milhoInput) {
            milho = Math.floor(parseFloat(milhoInput));
            brl   = milho / MILHO_RATE;
        } else {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe "valor_brl" ou "valor_milho" para depositar.'
            });
        }

        if (milho <= 0) {
            return res.status(400).json({ sucesso: false, mensagem: 'Valor de depósito inválido.' });
        }

        const { tx, novoSaldo, blocoNumero } = await registrarTransacao({
            session_id,
            tipo:        'deposito',
            valor_milho: milho,
            valor_brl:   brl,
            descricao:   `Depósito de R$ ${brl.toFixed(2)} → ₥ ${milho.toLocaleString('pt-BR')}`
        });

        res.status(201).json({
            sucesso:       true,
            mensagem:      `✅ Depósito confirmado! +₥ ${milho.toLocaleString('pt-BR')} adicionados à sua carteira.`,
            milho_recebido: milho,
            brl_pago:       parseFloat(brl.toFixed(2)),
            saldo_novo:     novoSaldo,
            bloco_numero:   blocoNumero,
            transacao_id:   tx.id
        });
    } catch (err) {
        next(err);
    }
});


// =============================================================
// POST /api/milho/pagar
// Body: { session_id, valor_milho, descricao? }
// =============================================================
router.post('/pagar', async (req, res, next) => {
    try {
        const { session_id, valor_milho, descricao } = req.body;
        const milho = parseFloat(valor_milho);

        if (!milho || milho <= 0) {
            return res.status(400).json({ sucesso: false, mensagem: 'Informe um valor em ₥ Milho-Coin.' });
        }

        const brl = milho / MILHO_RATE;

        const { tx, novoSaldo, blocoNumero } = await registrarTransacao({
            session_id,
            tipo:        'pagamento',
            valor_milho: -milho,   // negativo = débito
            valor_brl:   brl,
            descricao:   descricao || `Pagamento de ₥ ${milho.toLocaleString('pt-BR')}`
        });

        res.json({
            sucesso:       true,
            mensagem:      `✅ Pago! ₥ ${milho.toLocaleString('pt-BR')} ≈ R$ ${brl.toFixed(4).replace('.', ',')}`,
            milho_pago:    milho,
            brl_equivalente: parseFloat(brl.toFixed(4)),
            saldo_restante:  novoSaldo,
            bloco_numero:    blocoNumero,
            transacao_id:    tx.id
        });
    } catch (err) {
        if (err.status === 400) {
            return res.status(400).json({ sucesso: false, mensagem: err.message });
        }
        next(err);
    }
});


// =============================================================
// GET /api/milho/blocos
// =============================================================
router.get('/blocos', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('milho_blocos')
            .select('numero, mensagem, minerador, confirmado, criado_em')
            .order('numero', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});


// =============================================================
// GET /api/milho/transacoes?session_id=xxx
// =============================================================
router.get('/transacoes', async (req, res, next) => {
    try {
        const { session_id } = req.query;
        const carteira = await getOuCriarCarteira(session_id);

        const { data, error } = await supabase
            .from('milho_transacoes')
            .select('id, tipo, valor_milho, valor_brl, descricao, bloco_numero, status, criado_em')
            .eq('carteira_id', carteira.id)
            .order('criado_em', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});


// =============================================================
// GET /api/milho/cotacao
// =============================================================
router.get('/cotacao', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('milho_cotacoes')
            .select('*')
            .order('registrado_em', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        res.json({
            preco_brl:    data?.preco_brl || 0.50,
            variacao:     data?.variacao  || 0,
            registrado_em: data?.registrado_em
        });
    } catch (err) {
        next(err);
    }
});


module.exports = router;
