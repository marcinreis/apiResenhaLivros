const db = require('../config/database');

async function criar({ livroId, usuarioId, nota, texto }) {
  const [result] = await db.query(
    `INSERT INTO resenhas (livro_id, usuario_id, nota, texto, criado_em)
     VALUES (?, ?, ?, ?, NOW())`,
    [livroId, usuarioId, nota, texto]
  );
  return result.insertId;
}

async function buscarPorLivro(livroId) {
  const [rows] = await db.query(
    `SELECT r.*, u.nome AS usuario_nome
     FROM resenhas r
     JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.livro_id = ?
     ORDER BY r.criado_em DESC`,
    [livroId]
  );
  return rows;
}

async function buscarPorUsuario(usuarioId) {
  const [rows] = await db.query(
    `SELECT r.*, l.titulo AS livro_titulo
     FROM resenhas r
     JOIN livros l ON l.id = r.livro_id
     WHERE r.usuario_id = ?
     ORDER BY r.criado_em DESC`,
    [usuarioId]
  );
  return rows;
}

async function atualizar(id, { nota, texto }) {
  await db.query('UPDATE resenhas SET nota = ?, texto = ? WHERE id = ?', [nota, texto, id]);
}

async function deletar(id) {
  await db.query('DELETE FROM resenhas WHERE id = ?', [id]);
}

module.exports = {
  criar,
  buscarPorLivro,
  buscarPorUsuario,
  atualizar,
  deletar,
};