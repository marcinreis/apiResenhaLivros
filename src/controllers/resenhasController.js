const resenhasService = require('../services/resenhasService');

// POST /livros/:id/resenhas
async function criar(req, res, next) {
  try {
    const { nota, texto } = req.body;
    const resenha = await resenhasService.criarResenha({
      livroIdExterno: req.params.id,
      usuarioId: req.usuario.id,
      nota,
      texto,
    });
    res.status(201).json(resenha);
  } catch (erro) {
    next(erro);
  }
}

// GET /resenhas
async function listar(req, res, next) {
  try {
    const resenhas = await resenhasService.listarResenhas();
    res.json(resenhas);
  } catch (erro) {
    next(erro);
  }
}

// GET /resenhas/:id
async function detalhar(req, res, next) {
  try {
    const resenha = await resenhasService.obterResenha(req.params.id);
    res.json(resenha);
  } catch (erro) {
    next(erro);
  }
}

// GET /livros/:id/resenhas
async function listarPorLivro(req, res, next) {
  try {
    const resultado = await resenhasService.listarResenhasPorLivro(req.params.id);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

// PUT /resenhas/:id
async function atualizar(req, res, next) {
  try {
    const { nota, texto } = req.body;
    const resenha = await resenhasService.atualizarResenha(req.params.id, req.usuario.id, { nota, texto });
    res.json(resenha);
  } catch (erro) {
    next(erro);
  }
}

// DELETE /resenhas/:id
async function deletar(req, res, next) {
  try {
    await resenhasService.deletarResenha(req.params.id, req.usuario.id);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
}

module.exports = { criar, listar, detalhar, listarPorLivro, atualizar, deletar };
