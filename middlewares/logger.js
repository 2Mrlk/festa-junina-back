// =============================================================
// middlewares/logger.js — Middleware de Log (Supervisão)
// =============================================================
// O que é um Middleware?
//   Pense num Middleware como um SEGURANÇA ou SUPERVISORA na entrada
//   de um restaurante. Toda requisição que chega ao servidor passa
//   por ele ANTES de chegar na rota de destino.
//
//   O Middleware pode:
//     1. Olhar a requisição ("Quem está pedindo?")
//     2. Alterar a requisição ou a resposta
//     3. Barrar a requisição ("Você não tem permissão!")
//     4. Deixar passar (chamando next())
//
// O que este Middleware faz?
//   Anota no terminal (console) a HORA e a ROTA acessada toda vez
//   que alguém fizer um pedido à API. Muito útil para depuração!
//
// Fluxo visual:
//   App Mobile → [Logger Middleware] → Rota → Resposta
// =============================================================

// ─── Definição do Middleware de Log ───────────────────────────
// Um middleware do Express sempre recebe 3 parâmetros:
//   req  = objeto da requisição (o "pedido" que chegou)
//   res  = objeto da resposta (o que vamos devolver)
//   next = função que manda a requisição continuar para o próximo passo
const loggerMiddleware = (req, res, next) => {

    // Pegamos a hora atual e formatamos como string legível (ex: "10:30:45")
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

    // Mostramos no terminal:
    //   - O método HTTP (GET, POST, PUT, DELETE)
    //   - A URL da rota acessada (ex: /api/produtos)
    // Template string com ${} para inserir as variáveis na mensagem
    console.log(`[${horaAtual}] 📋 Requisição recebida: ${req.method} ${req.url}`);

    // ⚠️ MUITO IMPORTANTE: next() é obrigatório!
    // Sem chamar next(), a requisição fica presa aqui e o app trava.
    // É next() que faz a requisição continuar o caminho até a rota certa.
    next();
};

// ─── Exportação ───────────────────────────────────────────────
// Exportamos a função para que o server.js possa importar e usar.
module.exports = loggerMiddleware;