// =============================================================
// routes/correio.js — Correio Elegante Digital
// =============================================================

const express = require('express');
const router = express.Router();
const supabase = require('../data/supabase');

// ── [GET] Listar correios recentes ───────────────────────────
// GET /api/correio
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('correio_elegante')
            .select('id, from_name, to_name, message, theme, anonymous, criado_em')
            .order('criado_em', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Oculta from_name se anônimo
        const resultado = data.map(c => ({
            ...c,
            from_name: c.anonymous ? null : c.from_name
        }));

        res.json(resultado);
    } catch (err) {
        next(err);
    }
});

// ── [POST] Enviar correio ────────────────────────────────────
// POST /api/correio
// Body: { to_name, from_name?, message?, theme?, anonymous? }
router.post('/', async (req, res, next) => {
    try {
        const { to_name, from_name, message, theme, anonymous } = req.body;

        if (!to_name || to_name.trim() === '') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O campo "to_name" é obrigatório. 💌'
            });
        }

        if (message && message.length > 140) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A mensagem deve ter no máximo 140 caracteres.'
            });
        }

        const temas = ['romantic', 'funny', 'friendship'];
        const temaValido = temas.includes(theme) ? theme : 'romantic';

        const { data, error } = await supabase
            .from('correio_elegante')
            .insert([{
                to_name:   to_name.trim(),
                from_name: anonymous ? null : (from_name?.trim() || null),
                message:   message?.trim() || null,
                theme:     temaValido,
                anonymous: Boolean(anonymous)
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            sucesso: true,
            mensagem: 'Correio enviado com sucesso! 💌',
            correio: data[0]
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
