const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if(!supabaseUrl || !supabaseKey){
    console.error('SUPABASE_URL ou SUPABASE_KEY não foi encontrado no .env')
}

const supabase = createClient(supabaseUrl, supabaseKey);
module.exports = supabase;