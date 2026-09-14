const usuariosService = require('../services/usuariosService');
const asyncHandler = require('../utils/asyncHandler');

// POST /usuarios
const criar = asyncHandler(async (req, res) => {
  const { nome, email, senha } = req.body;
  const usuario = await usuariosService.criarUsuario({ nome, email, senha });
  res.status(201).json(usuario);
});

// GET /usuarios/:id
const obterPorId = asyncHandler(async (req, res) => {
  const usuario = await usuariosService.obterUsuarioPorId(req.params.id);
  res.json(usuario);
});

module.exports = { criar, obterPorId };
