// =============================================================
// routes/produtos.js — Rotas de Produtos (CRUD Completo)
// =============================================================

const express = require('express');
let router = express.Router();
let supabase = require('../data/supabase');


// =============================================================
// ── ROTA DE TESTE DE ERRO ─────────────────────────────────────
// =============================================================
router.get('/erro-teste', (req, res) => {
    throw new Error("O servidor do Arraiá tropeçou 🌽🔥");
});


// =============================================================
// ── [GET] LISTAR PRODUTOS ─────────────────────────────────────
// =============================================================
// Exemplos:
// GET /api/produtos
// GET /api/produtos?categoriaId=1
// =============================================================
router.get('/', async (req, res, next) => {

    try {

        const { categoriaId } = req.query;

        let consulta = supabase
            .from('produtos')
            .select('*');

        if (categoriaId) {
            consulta = consulta.eq('categoria_id', categoriaId);
        }

        const { data, error } = await consulta
            .order('id', { ascending: true });

        if (error) throw error;

        res.json(data);

    } catch (err) {
        next(err);
    }
});


// =============================================================
// ── [GET] BUSCAR PRODUTO POR ID ───────────────────────────────
// =============================================================
router.get('/:id', async (req, res, next) => {

    try {

        const { id } = req.params;

        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;

        if (data) {

            res.json(data);

        } else {

            res.status(404).json({
                mensagem: 'Produto não encontrado 🌽'
            });

        }

    } catch (err) {
        next(err);
    }
});


// =============================================================
// ── [POST] CRIAR NOVO PRODUTO ─────────────────────────────────
// =============================================================
// Exemplo:
// {
//   "categoria_id": 1,
//   "nome": "Canjica",
//   "descricao": "Canjica cremosa com canela",
//   "preco": 12,
//   "imagem": "canjica.webp"
// }
// =============================================================
router.post('/', async (req, res, next) => {

    try {

        const { data, error } = await supabase
            .from('produtos')
            .insert([req.body])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);

    } catch (err) {
        next(err);
    }
});


// =============================================================
// ── [PUT] ATUALIZAR PRODUTO ───────────────────────────────────
// =============================================================
router.put('/:id', async (req, res, next) => {

    try {

        const { id } = req.params;

        const { data, error } = await supabase
            .from('produtos')
            .update(req.body)
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data && data.length > 0) {

            res.json(data[0]);

        } else {

            res.status(404).json({
                mensagem: 'Produto não encontrado 🌽'
            });

        }

    } catch (err) {
        next(err);
    }
});


// =============================================================
// ── [DELETE] REMOVER PRODUTO ──────────────────────────────────
// =============================================================
router.delete('/:id', async (req, res, next) => {

    try {

        const { id } = req.params;

        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            mensagem: 'Produto removido do arraiá com sucesso 🌽🔥'
        });

    } catch (err) {
        next(err);
    }
});


// ─── Exportação do Router ─────────────────────────────────────
module.exports = router;