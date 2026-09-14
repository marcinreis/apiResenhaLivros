const db = require('../config/database');

async function buscarPorIsbn(isbn) {
  const [rows] = await db.query('SELECT * FROM livros WHERE isbn = ?', [isbn]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const [rows] = await db.query('SELECT * FROM livros WHERE id = ?', [id]);
  return rows[0] || null;
}

async function criar({ googleId, titulo, autores, isbn, capaUrl, sinopse }) {
  const [result] = await db.query(
    `INSERT INTO livros (google_id, titulo, autores, isbn, capa_url, sinopse)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [googleId, titulo, autores, isbn, capaUrl, sinopse]
  );
  return result.insertId;
}

module.exports = {
  buscarPorIsbn,
  buscarPorId,
  criar,
};