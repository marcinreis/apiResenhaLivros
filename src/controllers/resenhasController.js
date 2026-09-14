const resenhasService = require('../services/resenhasService');
const asyncHandler = require('../utils/asyncHandler');

// POST /resenhas
const criar = asyncHandler(async (req, res) => {
  const { livroId, usuarioId, nota, texto } = req.body;
  const resenha = await resenhasService.criarResenha({ livroId, usuarioId, nota, texto });
  res.status(201).json(resenha);
});

// GET /resenhas
const listarTodas = asyncHandler(async (req, res) => {
  const resenhas = await resenhasService.listarTodasResenhas();
  res.json(resenhas);
});

// GET /livros/:livroId/resenhas
const listarPorLivro = asyncHandler(async (req, res) => {
  const resenhas = await resenhasService.listarResenhasPorLivro(req.params.livroId);
  res.json(resenhas);
});

// GET /usuarios/:usuarioId/resenhas
const listarPorUsuario = asyncHandler(async (req, res) => {
  const resenhas = await resenhasService.listarResenhasPorUsuario(req.params.usuarioId);
  res.json(resenhas);
});

// GET /resenhas/:id
const obterPorId = asyncHandler(async (req, res) => {
  const resenha = await resenhasService.buscarResenhaPorId(req.params.id);
  res.json(resenha);
});

// PUT /resenhas/:id
const atualizar = asyncHandler(async (req, res) => {
  const { nota, texto } = req.body;
  const resenha = await resenhasService.atualizarResenha(req.params.id, { nota, texto });
  res.json(resenha);
});

// DELETE /resenhas/:id
const deletar = asyncHandler(async (req, res) => {
  await resenhasService.deletarResenha(req.params.id);
  res.status(204).send();
});

module.exports = { criar, listarTodas, listarPorLivro, listarPorUsuario, obterPorId, atualizar, deletar };
