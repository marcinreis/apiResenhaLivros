const axios = require('axios');
const livroModel = require('../models/livroModel');

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

// Busca livros na API externa por título ou autor
async function buscarLivrosExternos(termo) {
  const response = await axios.get(GOOGLE_BOOKS_URL, {
    params: { q: termo, maxResults: 10 },
  });

  return (response.data.items || []).map((item) => {
    const info = item.volumeInfo;
    return {
      googleId: item.id,
      titulo: info.title,
      autores: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
      isbn: info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier || null,
      capaUrl: info.imageLinks?.thumbnail || null,
      sinopse: info.description || null,
    };
  });
}

// Retorna o livro local se já existir (por ISBN), ou cria a partir dos dados externos
async function salvarOuObterLivro(livroExterno) {
  if (!livroExterno.isbn) {
    const erro = new Error('Livro sem ISBN não pode ser salvo');
    erro.isOperational = true;
    throw erro;
  }

  const existente = await livroModel.buscarPorIsbn(livroExterno.isbn);
  if (existente) return existente;

  const novoId = await livroModel.criar(livroExterno);
  return { id: novoId, ...livroExterno };
}

// Busca um livro salvo localmente pelo id
async function obterLivroPorId(id) {
  const livro = await livroModel.buscarPorId(id);
  if (!livro) {
    const erro = new Error('Livro não encontrado');
    erro.isOperational = true;
    throw erro;
  }
  return livro;
}

module.exports = {
  buscarLivrosExternos,
  salvarOuObterLivro,
  obterLivroPorId,
};