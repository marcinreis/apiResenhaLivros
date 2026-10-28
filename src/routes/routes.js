const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const livrosController = require('../controllers/livrosController');
const resenhasController = require('../controllers/resenhasController');
const autenticar = require('../middlewares/autenticar');
const validarResenha = require('../middlewares/validarResenha');

// Rotas de autenticação
router.post('/auth/registrar', authController.registrar);
router.post('/auth/login', authController.login);

// Rotas de livros (via API externa)
router.get('/livros', livrosController.buscar);
router.get('/livros/:id', livrosController.detalhar);
router.get('/livros/:id/resenhas', resenhasController.listarPorLivro);
router.post('/livros/:id/resenhas', autenticar, validarResenha, resenhasController.criar);

// Rotas de resenhas
router.get('/resenhas', resenhasController.listar);
router.get('/resenhas/:id', resenhasController.detalhar);
router.put('/resenhas/:id', autenticar, validarResenha, resenhasController.atualizar);
router.delete('/resenhas/:id', autenticar, resenhasController.deletar);

module.exports = router;
