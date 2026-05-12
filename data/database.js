// =============================================================
// data/database.js — Banco de Dados em Memória (Festa Junina)
// =============================================================

// ─── Tabela de Categorias ─────────────────────────────────────
// Categorias típicas de uma festa junina
let categorias = [
    { id: 1, nome: 'Comidas Típicas' },
    { id: 2, nome: 'Doces Juninos' },
    { id: 3, nome: 'Bebidas' }
];

// ─── Tabela de Produtos ───────────────────────────────────────
// Produtos adaptados para festa junina
let produtos = [
    {
        id: 1,
        categoriaId: 1,
        nome: 'Pamonha',
        descricao: 'Deliciosa pamonha de milho verde, cremosa e quentinha.',
        preco: 12.00,
        imagem: 'pamonha.png'
    },
    {
        id: 2,
        categoriaId: 1,
        nome: 'Milho Cozido',
        descricao: 'Milho verde cozido na manteiga, típico das festas juninas.',
        preco: 8.00,
        imagem: 'milho.png'
    },
    {
        id: 3,
        categoriaId: 2,
        nome: 'Canjica',
        descricao: 'Canjica doce com leite condensado, coco e amendoim.',
        preco: 10.00,
        imagem: 'canjica.png'
    },
    {
        id: 4,
        categoriaId: 2,
        nome: 'Pé de Moleque',
        descricao: 'Doce crocante de amendoim com rapadura.',
        preco: 7.00,
        imagem: 'pe-de-moleque.png'
    },
    {
        id: 5,
        categoriaId: 3,
        nome: 'Quentão',
        descricao: 'Bebida quente de gengibre, açúcar e especiarias.',
        preco: 15.00,
        imagem: 'quentao.png'
    },
    {
        id: 6,
        categoriaId: 3,
        nome: 'Vinho Quente',
        descricao: 'Vinho quente com frutas e especiarias.',
        preco: 18.00,
        imagem: 'vinho-quente.png'
    }
];

// ─── Exportação dos dados ─────────────────────────────────────
module.exports = { categorias, produtos };