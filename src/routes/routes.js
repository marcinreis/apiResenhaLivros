const express = require('express');
const router = express.Router();

const livrosController = require('../controllers/livrosController');
const resenhasController = require('../controllers/resenhasController');
const validarResenha = require('../middlewares/validarResenha');

// Rotas de livros
router.get('/livros/buscar', livrosController.buscar);
router.post('/livros', livrosController.salvar);
router.get('/livros/:livroId/resenhas', resenhasController.listarPorLivro);

// Rotas de resenhas
router.post('/resenhas', validarResenha, resenhasController.criar);
router.put('/resenhas/:id', validarResenha, resenhasController.atualizar);
router.delete('/resenhas/:id', resenhasController.deletar);

// Rotas de usuários
router.get('/usuarios/:usuarioId/resenhas', resenhasController.listarPorUsuario);

module.exports = router;