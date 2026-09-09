require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,   // máximo de conexões simultâneas no pool
    queueLimit: 0          // 0 = fila ilimitada de requisições aguardando conexão livre
});

module.exports = pool;