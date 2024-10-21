const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',              // Nome do usuário do banco
  host: 'localhost',          // Host do banco de dados
  database: 'xmania2',           // Nome atualizado do banco de dados
  password: 'admin',   // Senha do banco de dados
  port: 5432,                 // Porta padrão do PostgreSQL
});

module.exports = pool;
