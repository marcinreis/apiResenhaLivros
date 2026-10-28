const db = require('../config/database');

// Traz junto o nome do autor da resenha
const SELECT_RESENHA = `
  SELECT r.*, u.usuario AS usuario_nome
  FROM resenhas r
  JOIN usuarios u ON u.id = r.usuario_id`;

async function criar({ usuarioId, livroIdExterno, livroTitulo, livroAutor, livroCapaUrl, nota, texto }) {
  const [result] = await db.query(
    `INSERT INTO resenhas
       (usuario_id, livro_id_externo, livro_titulo, livro_autor, livro_capa_url, nota, texto)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [usuarioId, livroIdExterno, livroTitulo, livroAutor, livroCapaUrl, nota, texto]
  );
  return result.insertId;
}

async function buscarTodas() {
  const [rows] = await db.query(`${SELECT_RESENHA} ORDER BY r.criado_em DESC, r.id DESC`);
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await db.query(`${SELECT_RESENHA} WHERE r.id = ?`, [id]);
  return rows[0] || null;
}

async function buscarPorLivro(livroIdExterno) {
  const [rows] = await db.query(
    `${SELECT_RESENHA} WHERE r.livro_id_externo = ? ORDER BY r.criado_em DESC, r.id DESC`,
    [livroIdExterno]
  );
  return rows;
}

async function buscarPorUsuarioELivro(usuarioId, livroIdExterno) {
  const [rows] = await db.query(
    'SELECT id FROM resenhas WHERE usuario_id = ? AND livro_id_externo = ?',
    [usuarioId, livroIdExterno]
  );
  return rows[0] || null;
}

// Média (decimal) e quantidade de notas de um livro
async function calcularMediaPorLivro(livroIdExterno) {
  const [rows] = await db.query(
    'SELECT AVG(nota) AS media, COUNT(*) AS total FROM resenhas WHERE livro_id_externo = ?',
    [livroIdExterno]
  );
  return rows[0];
}

async function atualizar(id, { nota, texto }) {
  await db.query('UPDATE resenhas SET nota = ?, texto = ? WHERE id = ?', [nota, texto, id]);
}

async function deletar(id) {
  await db.query('DELETE FROM resenhas WHERE id = ?', [id]);
}

module.exports = {
  criar,
  buscarTodas,
  buscarPorId,
  buscarPorLivro,
  buscarPorUsuarioELivro,
  calcularMediaPorLivro,
  atualizar,
  deletar,
};
