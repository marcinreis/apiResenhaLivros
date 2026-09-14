const axios = require('axios');
const livroModel = require('../models/livroModel');
const AppError = require('../utils/appError');
const validarId = require('../utils/validarId');

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

// Busca livros na API externa por título ou autor (não salva nada localmente)
async function buscarLivrosExternos(termo) {
  let response;
  try {
    response = await axios.get(GOOGLE_BOOKS_URL, {
      params: { q: termo, maxResults: 10 },
    });
  } catch (erro) {
    throw new AppError('Falha ao consultar a API externa de livros (Google Books)', 502);
  }

  return (response.data.items || []).map((item) => {
    const info = item.volumeInfo || {};
    const identificadores = info.industryIdentifiers || [];
    const isbn13 = identificadores.find((i) => i.type === 'ISBN_13')?.identifier;
    const isbn10 = identificadores.find((i) => i.type === 'ISBN_10')?.identifier;

    return {
      googleId: item.id,
      titulo: info.title || 'Título desconhecido',
      autores: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
      isbn: isbn13 || isbn10 || null,
      capaUrl: info.imageLinks?.thumbnail || null,
      sinopse: info.description || null,
    };
  });
}

// Retorna o livro local se já existir (por ISBN ou googleId), ou cria a partir dos dados externos
async function salvarOuObterLivro(livroExterno) {
  const { isbn, googleId, titulo } = livroExterno || {};

  if (!titulo) {
    throw new AppError('Campo "titulo" é obrigatório', 400);
  }

  if (!isbn && !googleId) {
    throw new AppError('Informe ao menos "isbn" ou "googleId" para salvar o livro', 400);
  }

  let existente = null;
  if (isbn) {
    existente = await livroModel.buscarPorIsbn(isbn);
  }
  if (!existente && googleId) {
    existente = await livroModel.buscarPorGoogleId(googleId);
  }
  if (existente) {
    return existente;
  }

  const novoId = await livroModel.criar(livroExterno);
  return { id: novoId, ...livroExterno };
}

// Busca um livro salvo localmente pelo id
async function obterLivroPorId(id) {
  const idValido = validarId(id, 'id');
  const livro = await livroModel.buscarPorId(idValido);
  if (!livro) {
    throw new AppError('Livro não encontrado', 404);
  }
  return livro;
}

module.exports = {
  buscarLivrosExternos,
  salvarOuObterLivro,
  obterLivroPorId,
};
