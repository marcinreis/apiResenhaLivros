const resenhaModel = require('../models/resenhaModel');
const livrosApiService = require('./livrosApiService');
const criarErro = require('../utils/criarErro');

// Converte a linha do banco para o formato da API
function formatarResenha(row) {
  return {
    id: row.id,
    livro: {
      id: row.livro_id_externo,
      titulo: row.livro_titulo,
      autores: row.livro_autor,
      capaUrl: row.livro_capa_url,
    },
    usuario: { id: row.usuario_id, usuario: row.usuario_nome },
    nota: row.nota,
    texto: row.texto,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

// Busca a resenha ou lança 404
async function obterResenhaOuFalhar(id) {
  const resenhaId = Number(id);
  const resenha = Number.isInteger(resenhaId) && resenhaId > 0
    ? await resenhaModel.buscarPorId(resenhaId)
    : null;

  if (!resenha) {
    throw criarErro(404, 'Resenha não encontrada');
  }
  return resenha;
}

// Busca a resenha e garante que ela pertence ao usuário logado
async function obterResenhaDoUsuario(id, usuarioId) {
  const resenha = await obterResenhaOuFalhar(id);
  if (resenha.usuario_id !== usuarioId) {
    throw criarErro(403, 'Você só pode alterar suas próprias resenhas');
  }
  return resenha;
}

// Cria uma resenha para um livro da API externa (uma por usuário em cada livro)
async function criarResenha({ livroIdExterno, usuarioId, nota, texto }) {
  const existente = await resenhaModel.buscarPorUsuarioELivro(usuarioId, livroIdExterno);
  if (existente) {
    throw criarErro(409, 'Você já fez uma resenha para este livro');
  }

  // Confirma que o livro existe e guarda título, autor e capa em cache
  const livro = await livrosApiService.buscarLivroPorIdExterno(livroIdExterno);

  const novoId = await resenhaModel.criar({
    usuarioId,
    livroIdExterno: livro.id,
    livroTitulo: livro.titulo,
    livroAutor: livro.autores,
    livroCapaUrl: livro.capaUrl,
    nota,
    texto: texto.trim(),
  });

  return formatarResenha(await resenhaModel.buscarPorId(novoId));
}

// Lista todas as resenhas
async function listarResenhas() {
  const rows = await resenhaModel.buscarTodas();
  return rows.map(formatarResenha);
}

// Busca uma resenha pelo ID
async function obterResenha(id) {
  return formatarResenha(await obterResenhaOuFalhar(id));
}

// Lista as resenhas de um livro junto com a média das notas
async function listarResenhasPorLivro(livroIdExterno) {
  const [rows, { media, total }] = await Promise.all([
    resenhaModel.buscarPorLivro(livroIdExterno),
    resenhaModel.calcularMediaPorLivro(livroIdExterno),
  ]);

  return {
    livroId: livroIdExterno,
    mediaNotas: media === null ? null : Number(Number(media).toFixed(2)),
    totalResenhas: Number(total),
    resenhas: rows.map(formatarResenha),
  };
}

// Atualiza uma resenha do usuário logado
async function atualizarResenha(id, usuarioId, { nota, texto }) {
  const resenha = await obterResenhaDoUsuario(id, usuarioId);
  await resenhaModel.atualizar(resenha.id, { nota, texto: texto.trim() });
  return formatarResenha(await resenhaModel.buscarPorId(resenha.id));
}

// Remove uma resenha do usuário logado
async function deletarResenha(id, usuarioId) {
  const resenha = await obterResenhaDoUsuario(id, usuarioId);
  await resenhaModel.deletar(resenha.id);
}

module.exports = {
  criarResenha,
  listarResenhas,
  obterResenha,
  listarResenhasPorLivro,
  atualizarResenha,
  deletarResenha,
};
