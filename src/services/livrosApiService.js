const axios = require('axios');
const db = require('../config/database');

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

// Busca livros na API externa por título ou autor
async function buscarLivrosExternos(termo) {
  const response = await axios.get(GOOGLE_BOOKS_URL, {
    params: { q: termo, maxResults: 10 },
  });

  // Normaliza os dados retornados para o formato que nossa aplicação usa
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

// Verifica se o livro já existe no banco local (pelo ISBN)
async function buscarLivroLocalPorIsbn(isbn) {
  const [rows] = await db.query('SELECT * FROM livros WHERE isbn = ?', [isbn]);
  return rows[0] || null;
}

// Salva o livro localmente caso ainda não exista (cache)
async function salvarOuObterLivro(livroExterno) {
  if (!livroExterno.isbn) {
    throw new Error('Livro sem ISBN não pode ser salvo');
  }

  const existente = await buscarLivroLocalPorIsbn(livroExterno.isbn);
  if (existente) return existente;

  const [result] = await db.query(
    `INSERT INTO livros (google_id, titulo, autores, isbn, capa_url, sinopse)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      livroExterno.googleId,
      livroExterno.titulo,
      livroExterno.autores,
      livroExterno.isbn,
      livroExterno.capaUrl,
      livroExterno.sinopse,
    ]
  );

  return { id: result.insertId, ...livroExterno };
}

module.exports = {
  buscarLivrosExternos,
  buscarLivroLocalPorIsbn,
  salvarOuObterLivro,
};