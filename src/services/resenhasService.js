const resenhaModel = require('../models/resenhaModel');
const livroModel = require('../models/livroModel');

// Cria uma nova resenha, garantindo que o livro referenciado existe
async function criarResenha({ livroId, usuarioId, nota, texto }) {
  if (nota < 0 || nota > 5) {
    const erro = new Error('Nota deve estar entre 0 e 5');
    erro.isOperational = true;
    throw erro;
  }

  const livro = await livroModel.buscarPorId(livroId);
  if (!livro) {
    const erro = new Error('Livro não encontrado');
    erro.isOperational = true;
    throw erro;
  }

  const novoId = await resenhaModel.criar({ livroId, usuarioId, nota, texto });
  return { id: novoId, livroId, usuarioId, nota, texto };
}

// Lista todas as resenhas de um livro específico
async function listarResenhasPorLivro(livroId) {
  return resenhaModel.buscarPorLivro(livroId);
}

// Lista todas as resenhas feitas por um usuário
async function listarResenhasPorUsuario(usuarioId) {
  return resenhaModel.buscarPorUsuario(usuarioId);
}

// Atualiza uma resenha existente
async function atualizarResenha(resenhaId, { nota, texto }) {
  if (nota !== undefined && (nota < 0 || nota > 5)) {
    const erro = new Error('Nota deve estar entre 0 e 5');
    erro.isOperational = true;
    throw erro;
  }

  await resenhaModel.atualizar(resenhaId, { nota, texto });
  return { id: resenhaId, nota, texto };
}

// Remove uma resenha
async function deletarResenha(resenhaId) {
  await resenhaModel.deletar(resenhaId);
}

module.exports = {
  criarResenha,
  listarResenhasPorLivro,
  listarResenhasPorUsuario,
  atualizarResenha,
  deletarResenha,
};