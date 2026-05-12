const express = require('express');
const router = express.Router();
const supabase = require('../data/supabase');

//rota para listar todos os pedidos (GET)
router.get('/', async (req, res, next) => {
    try{
        const {data, error} = await supabase
        .from('pedidos')
        .select('*')
        .order('id', {ascending: false});
        if(error) throw error;
        res.json(data);
    }catch (err){
        next(err);
    }
});

//rota para receber e criar um novo pedido (POST)
router.post('/', async (req, res, next) =>{
    try{
        const{data, error} = await supabase
        .from('pedidos')
        .insert([req.body])
        .select();
        if(error) throw error;
        res.status(201).json({
            sucesso:true,
            mensagem:'Pedido recebido com sucesso!',
            pedido: data[0]
        });
    }catch (err){
        next(err);
    }
});

module.exports = router;