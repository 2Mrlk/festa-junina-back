// =============================================================
// middlewares/errorHandler.js — Middleware de Tratamento de Erros
// =============================================================
// O que é este Middleware?
//   Um "plano B" para quando algo dá errado na API.
//   Sem ele, se uma rota jogar um erro (throw new Error), o Express
//   mostraria uma tela feia de erro para o usuário, ou pior: o servidor
//   poderia travar completamente (crash).
//
// Como funciona?
//   Este é um middleware ESPECIAL de erros. Toda vez que uma rota
//   chamar next(err) ou jogar um throw new Error(), o Express
//   pula todas as rotas normais e cai direto AQUI.
//   Assim conseguimos tratar o erro de forma elegante!
//
// Regra de ouro:
//   ⚠️ Middlewares de erro SEMPRE precisam ter EXATAMENTE 4 parâmetros!
//   Express identifica um middleware de erro pela assinatura (err, req, res, next).
//   Se tiver 3 parâmetros, ele trata como middleware NORMAL e não vai funcionar.
//
// Posição no server.js:
//   Deve ser o ÚLTIMO middleware registrado, depois de todas as rotas.
//   Assim ele captura erros de qualquer parte da aplicação.
//
// Fluxo visual de erro:
//   Rota com erro → [Error Handler Middleware] → JSON de erro → App Mobile
// =============================================================

// ─── Middleware de Erro com 4 parâmetros obrigatórios ─────────
//   err  = o objeto de erro (contém err.message, err.stack, etc.)
//   req  = a requisição original
//   res  = a resposta que vamos enviar
//   next = necessário para o Express reconhecer como middleware de erro
const errorHandlerMiddleware = (err, req, res, next) => {

    // Loga o erro no terminal do servidor para o DESENVOLVEDOR ver.
    // Isso não aparece para o usuário final, só no VS Code!
    console.error(`❌ Erro detectado: ${err.message}`);

    // Retorna uma resposta JSON com:
    //   - Status HTTP 500 (Internal Server Error — erro interno do servidor)
    //   - Um objeto JSON com informações do erro
    res.status(500).json({
        sucesso: false,
        mensagem: "Ops! Ocorreu um erro interno no servidor.",

        // ⚠️ ATENÇÃO: Em uma aplicação REAL, nunca exponha detalhes do erro
        // para o usuário (pode revelar informações sensíveis do servidor).
        // Aqui mandamos o detalhe apenas para fins DIDÁTICOS, para ver na tela!
        detalhe: err.message
    });
};

// ─── Exportação ───────────────────────────────────────────────
module.exports = errorHandlerMiddleware;