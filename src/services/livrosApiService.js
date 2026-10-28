const axios = require('axios');
const criarErro = require('../utils/criarErro');

const googleBooks = axios.create({
  baseURL: 'https://www.googleapis.com/books/v1/volumes',
  timeout: 5000,
});

// A API key é opcional; sem ela o limite de requisições é menor
function parametrosPadrao() {
  return process.env.GOOGLE_BOOKS_API_KEY ? { key: process.env.GOOGLE_BOOKS_API_KEY } : {};
}

// Converte um volume da Google Books para o formato da nossa API
function formatarLivro(item) {
  const info = item.volumeInfo || {};
  const isbn13 = info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier;
  const isbn10 = info.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier;

  return {
    id: item.id,
    titulo: info.title || 'Sem título',
    autores: info.authors ? info.authors.join(', ') : 'Autor desconhecido',
    isbn: isbn13 || isbn10 || null,
    capaUrl: info.imageLinks?.thumbnail || null,
    sinopse: info.description || null,
  };
}

// Converte falhas da Google Books em erros da nossa API
function traduzirErroApi(erro, mensagemPadrao) {
  if (erro.response?.status === 429) {
    return criarErro(503, 'Limite de requisições da API externa de livros atingido, tente mais tarde');
  }
  return criarErro(502, mensagemPadrao);
}

// Busca livros na API externa por título ou autor
async function buscarLivrosExternos(termo) {
  try {
    const response = await googleBooks.get('', {
      params: { q: termo, maxResults: 10, ...parametrosPadrao() },
    });
    return (response.data.items || []).map(formatarLivro);
  } catch (erro) {
    throw traduzirErroApi(erro, 'Erro ao buscar livros na API externa');
  }
}

// Busca os detalhes de um livro pelo ID da Google Books
async function buscarLivroPorIdExterno(id) {
  try {
    const response = await googleBooks.get(`/${encodeURIComponent(id)}`, {
      params: parametrosPadrao(),
    });
    return formatarLivro(response.data);
  } catch (erro) {
    // A Google Books responde 404 (ou 503) para IDs que não existem
    const status = erro.response?.status;
    if (status === 404 || status === 503) {
      throw criarErro(404, 'Livro não encontrado');
    }
    throw traduzirErroApi(erro, 'Erro ao buscar livro na API externa');
  }
}

module.exports = {
  buscarLivrosExternos,
  buscarLivroPorIdExterno,
};
