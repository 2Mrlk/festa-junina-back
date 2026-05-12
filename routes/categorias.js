// =============================================================
// routes/categorias.js — Rotas de Categorias
// =============================================================
// O que são Rotas?
//   Rotas definem os "endereços" da nossa API e o que acontece
//   quando alguém acessa cada endereço.
//
// O que é um Router?
//   O express.Router() cria um mini-aplicativo Express com suas
//   próprias rotas. Assim mantemos o código organizado em arquivos
//   separados, em vez de colocar tudo no server.js.
//
// Prefixo de rotas:
//   No server.js, registramos este router em '/api/categorias'.
//   Então uma rota '/' aqui vira '/api/categorias' na URL final.
// =============================================================

const express = require('express');

// ─── Criação do Router ────────────────────────────────────────
// Router é um mini-servidor que gerencia apenas as rotas de categorias.
const router = express.Router();

// ─── Importação do banco de dados ────────────────────────────
// Importamos o objeto com os arrays de categorias e produtos.
// '../' volta uma pasta (de /routes para /aula6-backend)
// 'data/database' aponta para o nosso arquivo de banco de dados
const supabase = require('../data/supabase');

// ─── [GET] /api/categorias ────────────────────────────────────
// Retorna a lista completa de categorias do cardápio.
//
// Teste no Thunder Client:
//   Método: GET
//   URL: http://localhost:3000/api/categorias
//
// Resposta esperada:
//   [ { "id": 1, "nome": "Combinados" }, { "id": 2, "nome": "Temakis" }, ... ]
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            throw error;
        }
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// ─── [POST] /api/categorias ───────────────────────────────────
// Cria uma nova categoria no cardápio.
//
// Teste no Thunder Client:
//   Método: POST
//   URL: http://localhost:3000/api/categorias
//   Body (JSON): { "nome": "Sobremesas" }
//
// Resposta esperada (status 201 Created):
//   { "id": 4, "nome": "Sobremesas" }
router.post('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('categorias')
            .insert([{nome: req.body.nome}])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (err) {
        next(err);
    }
});

// ─── Exportação do Router ─────────────────────────────────────
// Exportamos o router para ser usado no server.js
module.exports = router;