const livrosApiService = require('./livrosApiService');

// GET /livros/buscar?termo=...
// Busca livros na API externa (não salva ainda)
async function buscar(req, res) {
  try {
    const { termo } = req.query;
    if (!termo) {
      return res.status(400).json({ erro: 'Parâmetro "termo" é obrigatório' });
    }

    const livros = await livrosApiService.buscarLivrosExternos(termo);
    res.json(livros);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar livros na API externa' });
  }
}

// POST /livros
// Salva (ou retorna existente) um livro escolhido pelo usuário
async function salvar(req, res) {
  try {
    const livro = await livrosApiService.salvarOuObterLivro(req.body);
    res.status(201).json(livro);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

module.exports = { buscar, salvar };