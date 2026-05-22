const express = require('express');
const cors = require('cors');
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Middlewares Globais ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(logger);

// ── Rota raiz ───────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ mensagem: '🌽 Bem-vindo a API da Festa Junina!' });
});

// ── Rotas ───────────────────────────────────────────────────
app.use('/api/categorias',   require('./routes/categorias'));
app.use('/api/produtos',     require('./routes/produtos'));
app.use('/api/pedidos',      require('./routes/pedidos'));
app.use('/api/correio',      require('./routes/correio'));
app.use('/api/agendamentos', require('./routes/agendamentos'));
app.use('/api/pamonhas',     require('./routes/pamonhas'));
app.use('/api/milho',        require('./routes/milho'));

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ mensagem: 'Rota não encontrada na API do Arraiá.' });
});

// ── Error Handler (sempre por último) ───────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log('🚀 Servidor rodando!');
    console.log(`🚀 Portal local: ${PORTA}`);
    console.log('🚀 ================================');
    console.log('');
    console.log('📋 Rotas disponíveis:');
    console.log('   GET  POST        /api/categorias');
    console.log('   GET  POST PUT DELETE /api/produtos');
    console.log('   GET  POST        /api/pedidos');
    console.log('   GET  POST        /api/correio');
    console.log('   GET  POST DELETE /api/agendamentos');
    console.log('   GET  POST        /api/pamonhas');
    console.log('   GET              /api/milho/carteira');
    console.log('   POST             /api/milho/depositar');
    console.log('   POST             /api/milho/pagar');
    console.log('   GET              /api/milho/blocos');
    console.log('   GET              /api/milho/transacoes');
    console.log('');
});

module.exports = app;
