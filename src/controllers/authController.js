const authService = require('../services/authService');

// POST /auth/registrar
async function registrar(req, res, next) {
  try {
    const { usuario, senha } = req.body || {};
    const novoUsuario = await authService.registrar({ usuario, senha });
    res.status(201).json(novoUsuario);
  } catch (erro) {
    next(erro);
  }
}

// POST /auth/login
async function login(req, res, next) {
  try {
    const { usuario, senha } = req.body || {};
    const resultado = await authService.login({ usuario, senha });
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

module.exports = { registrar, login };
