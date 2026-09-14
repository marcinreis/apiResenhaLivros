require('dotenv').config();

const express = require('express');
const routes = require('./routes/routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globais
app.use(express.json());

// Rotas principais da API
app.use('/api', routes);

// Rota de verificação simples
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API de livros e resenhas rodando' });
});

// Tratamento de rota não encontrada (404)
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Middleware de erro deve ser o último a ser registrado
app.use(errorHandler);

module.exports = app;