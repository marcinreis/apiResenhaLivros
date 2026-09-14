const livrosApiService = require('../services/livrosApiService');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// GET /livros/buscar?termo=...
// Busca livros na API externa (não salva ainda)
const buscar = asyncHandler(async (req, res) => {
  const { termo } = req.query;
  if (!termo || !termo.trim()) {
    throw new AppError('Parâmetro "termo" é obrigatório', 400);
  }

  const livros = await livrosApiService.buscarLivrosExternos(termo);
  res.json(livros);
});

// POST /livros
// Salva (ou retorna existente) um livro escolhido pelo usuário
const salvar = asyncHandler(async (req, res) => {
  const livro = await livrosApiService.salvarOuObterLivro(req.body);
  res.status(201).json(livro);
});

// GET /livros/:id
// Detalhes de um livro já salvo localmente
const obterPorId = asyncHandler(async (req, res) => {
  const livro = await livrosApiService.obterLivroPorId(req.params.id);
  res.json(livro);
});

module.exports = { buscar, salvar, obterPorId };
