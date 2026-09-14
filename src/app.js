require('dotenv').config();

const express = require('express');
const routes = require('./routes');
const errorHandler = require('./errorHandler');

const app = express();

// Middlewares globais
app.use(express.json());

// Rotas principais da API
app.use('/api', routes);

// Rota de verificação simples (útil para checar se o servidor está no ar)
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API de livros e resenhas rodando' });
});

// Middleware de erro deve ser o último a ser registrado
app.use(errorHandler);

// Tratamento de rota não encontrada (404)
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;