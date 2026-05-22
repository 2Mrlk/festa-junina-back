// =============================================================
// routes/agendamentos.js — Barraca do Beijo (Fila & Agendamento)
// =============================================================

const express = require('express');
const router = express.Router();
const supabase = require('../data/supabase');

const HORARIOS_VALIDOS = ['14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];

// ── [GET] Listar agendamentos / fila ─────────────────────────
// GET /api/agendamentos
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('agendamentos')
            .select('id, nome_usuario, horario, posicao_fila, status, criado_em')
            .eq('status', 'confirmado')
            .order('posicao_fila', { ascending: true });

        if (error) throw error;

        // Horários já ocupados
        const ocupados = data.map(a => a.horario.slice(0, 5));

        res.json({
            fila: data,
            total_fila: data.length,
            horarios_ocupados: ocupados,
            horarios_disponiveis: HORARIOS_VALIDOS.filter(h => !ocupados.includes(h))
        });
    } catch (err) {
        next(err);
    }
});

// ── [POST] Criar agendamento ─────────────────────────────────
// POST /api/agendamentos
// Body: { nome_usuario, horario, session_id? }
router.post('/', async (req, res, next) => {
    try {
        const { nome_usuario, horario, session_id } = req.body;

        if (!nome_usuario || !horario) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Campos "nome_usuario" e "horario" são obrigatórios.'
            });
        }

        if (!HORARIOS_VALIDOS.includes(horario)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: `Horário inválido. Escolha entre: ${HORARIOS_VALIDOS.join(', ')}`
            });
        }

        // Verifica se horário já está ocupado
        const { data: existente, error: errCheck } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('horario', horario)
            .eq('status', 'confirmado')
            .maybeSingle();

        if (errCheck) throw errCheck;

        if (existente) {
            return res.status(409).json({
                sucesso: false,
                mensagem: `O horário ${horario} já está ocupado! 😬 Escolha outro.`
            });
        }

        // Próxima posição na fila
        const { count, error: errCount } = await supabase
            .from('agendamentos')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'confirmado');

        if (errCount) throw errCount;

        const posicao = (count || 0) + 1;

        const { data, error } = await supabase
            .from('agendamentos')
            .insert([{
                nome_usuario: nome_usuario.trim(),
                horario,
                posicao_fila: posicao,
                session_id: session_id || null,
                status: 'confirmado'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            sucesso: true,
            mensagem: `Agendamento confirmado às ${horario}! 💋`,
            agendamento: data[0],
            posicao_fila: posicao
        });
    } catch (err) {
        next(err);
    }
});

// ── [DELETE] Cancelar agendamento ────────────────────────────
// DELETE /api/agendamentos/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .eq('id', id);

        if (error) throw error;

        res.json({ sucesso: true, mensagem: 'Agendamento cancelado.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
