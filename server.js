const express = require('express');
const cors = require('cors');
// Importando nossos Middlewares customizados
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const app = express();

// Middlewares Globais
app.use(cors());
app.use(express.json());
// Nosso Middleware de Log!
app.use(logger);
// Rota de teste
app.get('/', (req, res) => {
    res.json({ mensagem: '🌽 Bem-vindo a API da Festa Junina!' });
});

// Importando rotas
const rotasCategorias = require('./routes/categorias');
const rotasProdutos = require('./routes/produtos');
const rotasPedidos = require('./routes/pedidos');

// Utilizando rotas
app.use('/api/categorias', rotasCategorias);
app.use('/api/produtos', rotasProdutos);
app.use('/api/pedidos', rotasPedidos);
// Tratamento de Rotas não encontradas (Erro 404)
app.use((req, res, next) => {
    res.status(404).json({ mensagem: "Rota não encontrada na API do Arraiá." });
});
// MIDDLEWARE DE ERROS GLOBAL (Sempre no final!)
app.use(errorHandler);

// Iniciar o servidor
const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log(`🚀 Servidor rodando!`);
    console.log(`🚀 Portal local: ${PORTA}`);
    console.log('🚀 ================================');
    console.log('');
    console.log('📋 Rotas disponíveis:');
    console.log(`   GET    /api/categorias`);
    console.log(`   POST   /api/categorias`);
    console.log(`   GET    /api/produtos`);
    console.log(`   GET    /api/produtos/:id`);
    console.log(`   POST   /api/produtos`);
    console.log(`   PUT    /api/produtos/:id`);
    console.log(`   DELETE /api/produtos/:id`);
     console.log(`   GET    /api/pedidos`);
      console.log(`   POST    /api/pedidos`);
    console.log('');
    console.log('💣 Rota de teste de erro:');
    console.log(`   GET   /api/produtos/erro-teste`);
    console.log('');
});

module.exports = app;