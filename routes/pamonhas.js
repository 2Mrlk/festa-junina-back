// =============================================================
// routes/pamonhas.js — Pedidos de Pamonha (máx 500/pedido)
// =============================================================

const express = require('express');
const router = express.Router();
const supabase = require('../data/supabase');

const PRECO_UNIT = 8.00;
const QTD_MAX   = 500;

// ── [GET] Listar pedidos de pamonha ──────────────────────────
// GET /api/pamonhas
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('pedidos_pamonha')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// ── [POST] Criar pedido de pamonha ───────────────────────────
// POST /api/pamonhas
// Body: { quantidade, session_id?, observacao? }
router.post('/', async (req, res, next) => {
    try {
        const { quantidade, session_id, observacao } = req.body;
        const qty = parseInt(quantidade);

        if (!qty || qty < 1) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Quantidade inválida. Mínimo: 1 pamonha. 🌽'
            });
        }

        if (qty > QTD_MAX) {
            return res.status(400).json({
                sucesso: false,
                mensagem: `⚠️ A COZINHA TRAVOU! Limite é de ${QTD_MAX} pamonhas por pedido. Faça pedidos menores! 🍳💥`
            });
        }

        const { data, error } = await supabase
            .from('pedidos_pamonha')
            .insert([{
                quantidade: qty,
                preco_unit: PRECO_UNIT,
                session_id: session_id || null,
                observacao: observacao || null,
                status: 'confirmado'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            sucesso: true,
            mensagem: `${qty} pamonha${qty > 1 ? 's' : ''} pedida${qty > 1 ? 's' : ''}! 🌽`,
            pedido: data[0]
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
