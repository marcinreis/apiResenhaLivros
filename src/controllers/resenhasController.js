const resenhasService = require('./resenhasService');

// POST /resenhas
async function criar(req, res) {
  try {
    const { livroId, usuarioId, nota, texto } = req.body;
    const resenha = await resenhasService.criarResenha({ livroId, usuarioId, nota, texto });
    res.status(201).json(resenha);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

// GET /livros/:livroId/resenhas
async function listarPorLivro(req, res) {
  try {
    const resenhas = await resenhasService.listarResenhasPorLivro(req.params.livroId);
    res.json(resenhas);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar resenhas do livro' });
  }
}

// GET /usuarios/:usuarioId/resenhas
async function listarPorUsuario(req, res) {
  try {
    const resenhas = await resenhasService.listarResenhasPorUsuario(req.params.usuarioId);
    res.json(resenhas);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar resenhas do usuário' });
  }
}

// PUT /resenhas/:id
async function atualizar(req, res) {
  try {
    const { nota, texto } = req.body;
    const resenha = await resenhasService.atualizarResenha(req.params.id, { nota, texto });
    res.json(resenha);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
}

// DELETE /resenhas/:id
async function deletar(req, res) {
  try {
    await resenhasService.deletarResenha(req.params.id);
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao deletar resenha' });
  }
}

module.exports = { criar, listarPorLivro, listarPorUsuario, atualizar, deletar };