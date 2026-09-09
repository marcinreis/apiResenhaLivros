const express = require('express');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globais
app.use(express.json()); // permite receber JSON no corpo das requisições

// Rotas da aplicação
app.use('/', routes);

// Rota não encontrada (nenhuma rota acima bateu)
app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
});

// Tratamento centralizado de erros (sempre por último)
app.use(errorHandler);

module.exports = app;