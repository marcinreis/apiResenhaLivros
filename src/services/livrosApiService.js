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

const TENTATIVAS_EXTRAS = 2;
const ESPERA_ENTRE_TENTATIVAS_MS = 500;

// Falhas passageiras: Google fora do ar (5xx) ou sem resposta (timeout/rede)
function falhaTemporaria(erro) {
  const status = erro.response?.status;
  return status === undefined || status >= 500;
}

// Faz o GET repetindo a chamada em falhas passageiras
async function getComRetentativa(url, config, tentativasRestantes = TENTATIVAS_EXTRAS) {
  try {
    return await googleBooks.get(url, config);
  } catch (erro) {
    if (tentativasRestantes === 0 || !falhaTemporaria(erro)) throw erro;
    await new Promise((resolve) => setTimeout(resolve, ESPERA_ENTRE_TENTATIVAS_MS));
    return getComRetentativa(url, config, tentativasRestantes - 1);
  }
}

// Converte falhas da Google Books em erros da nossa API
function traduzirErroApi(erro, mensagemPadrao) {
  if (erro.response?.status === 429) {
    return criarErro(503, 'Limite de requisições da API externa de livros atingido, tente mais tarde');
  }
  if (falhaTemporaria(erro)) {
    return criarErro(503, 'API externa de livros indisponível no momento, tente novamente');
  }
  return criarErro(502, mensagemPadrao);
}

// Busca livros na API externa por título ou autor
async function buscarLivrosExternos(termo) {
  try {
    const response = await getComRetentativa('', {
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
    const response = await getComRetentativa(`/${encodeURIComponent(id)}`, {
      params: parametrosPadrao(),
    });
    return formatarLivro(response.data);
  } catch (erro) {
    if (erro.response?.status === 404) {
      throw criarErro(404, 'Livro não encontrado');
    }
    throw traduzirErroApi(erro, 'Erro ao buscar livro na API externa');
  }
}

module.exports = {
  buscarLivrosExternos,
  buscarLivroPorIdExterno,
};
