const express = require('express');
const router = express.Router();

const livrosController = require('../controllers/livrosController');
const resenhasController = require('../controllers/resenhasController');
const usuariosController = require('../controllers/usuariosController');
const { validarCriacao: validarCriacaoResenha, validarAtualizacao: validarAtualizacaoResenha } = require('../middlewares/validarResenha');
const validarUsuario = require('../middlewares/validarUsuario');

// Rotas de livros
// (a rota estática "/buscar" precisa vir antes de "/:id" para não ser capturada por ela)
router.get('/livros/buscar', livrosController.buscar);
router.post('/livros', livrosController.salvar);
router.get('/livros/:id', livrosController.obterPorId);
router.get('/livros/:livroId/resenhas', resenhasController.listarPorLivro);

// Rotas de resenhas
router.get('/resenhas', resenhasController.listarTodas);
router.get('/resenhas/:id', resenhasController.obterPorId);
router.post('/resenhas', validarCriacaoResenha, resenhasController.criar);
router.put('/resenhas/:id', validarAtualizacaoResenha, resenhasController.atualizar);
router.delete('/resenhas/:id', resenhasController.deletar);

// Rotas de usuários
router.post('/usuarios', validarUsuario, usuariosController.criar);
router.get('/usuarios/:id', usuariosController.obterPorId);
router.get('/usuarios/:usuarioId/resenhas', resenhasController.listarPorUsuario);

module.exports = router;
