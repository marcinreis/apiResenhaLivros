const livrosApiService = require('../services/livrosApiService');

// GET /livros?busca=...
// Busca livros na API externa por título ou autor
async function buscar(req, res, next) {
  try {
    const { busca } = req.query;
    if (!busca || !busca.trim()) {
      return res.status(400).json({ erro: 'Parâmetro "busca" é obrigatório' });
    }

    const livros = await livrosApiService.buscarLivrosExternos(busca.trim());
    res.json(livros);
  } catch (erro) {
    next(erro);
  }
}

// GET /livros/:id
// Detalhes de um livro pelo ID da API externa
async function detalhar(req, res, next) {
  try {
    const livro = await livrosApiService.buscarLivroPorIdExterno(req.params.id);
    res.json(livro);
  } catch (erro) {
    next(erro);
  }
}

module.exports = { buscar, detalhar };
