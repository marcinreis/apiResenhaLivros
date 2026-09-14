const resenhaModel = require('../models/resenhaModel');
const livroModel = require('../models/livroModel');
const usuarioModel = require('../models/usuarioModel');
const AppError = require('../utils/appError');
const validarId = require('../utils/validarId');

// Cria uma nova resenha, garantindo que o livro e o usuário referenciados existem
async function criarResenha({ livroId, usuarioId, nota, texto }) {
  if (typeof nota !== 'number' || nota < 0 || nota > 5) {
    throw new AppError('Nota deve estar entre 0 e 5', 400);
  }

  const livroIdValido = validarId(livroId, 'livroId');
  const usuarioIdValido = validarId(usuarioId, 'usuarioId');

  const livro = await livroModel.buscarPorId(livroIdValido);
  if (!livro) {
    throw new AppError('Livro não encontrado', 404);
  }

  const usuario = await usuarioModel.buscarPorId(usuarioIdValido);
  if (!usuario) {
    throw new AppError('Usuário não encontrado', 404);
  }

  const novoId = await resenhaModel.criar({ livroId: livroIdValido, usuarioId: usuarioIdValido, nota, texto });
  return { id: novoId, livroId: livroIdValido, usuarioId: usuarioIdValido, nota, texto };
}

// Lista todas as resenhas cadastradas
async function listarTodasResenhas() {
  return resenhaModel.buscarTodas();
}

// Lista todas as resenhas de um livro específico
async function listarResenhasPorLivro(livroId) {
  const id = validarId(livroId, 'livroId');
  return resenhaModel.buscarPorLivro(id);
}

// Lista todas as resenhas feitas por um usuário
async function listarResenhasPorUsuario(usuarioId) {
  const id = validarId(usuarioId, 'usuarioId');
  return resenhaModel.buscarPorUsuario(id);
}

// Busca uma resenha específica, lançando 404 se não existir
async function buscarResenhaPorId(id) {
  const idValido = validarId(id, 'id');
  const resenha = await resenhaModel.buscarPorId(idValido);
  if (!resenha) {
    throw new AppError('Resenha não encontrada', 404);
  }
  return resenha;
}

// Atualiza uma resenha existente
async function atualizarResenha(resenhaId, { nota, texto }) {
  await buscarResenhaPorId(resenhaId);

  if (typeof nota !== 'number' || nota < 0 || nota > 5) {
    throw new AppError('Nota deve estar entre 0 e 5', 400);
  }

  await resenhaModel.atualizar(resenhaId, { nota, texto });
  return { id: Number(resenhaId), nota, texto };
}

// Remove uma resenha existente
async function deletarResenha(resenhaId) {
  await buscarResenhaPorId(resenhaId);
  await resenhaModel.deletar(resenhaId);
}

module.exports = {
  criarResenha,
  listarTodasResenhas,
  listarResenhasPorLivro,
  listarResenhasPorUsuario,
  buscarResenhaPorId,
  atualizarResenha,
  deletarResenha,
};
