const db = require('../config/database');

// Cria uma nova resenha vinculada a um livro e a um usuário
async function criarResenha({ livroId, usuarioId, nota, texto }) {
  if (nota < 0 || nota > 5) {
    throw new Error('Nota deve estar entre 0 e 5');
  }

  const [result] = await db.query(
    `INSERT INTO resenhas (livro_id, usuario_id, nota, texto, criado_em)
     VALUES (?, ?, ?, ?, NOW())`,
    [livroId, usuarioId, nota, texto]
  );

  return { id: result.insertId, livroId, usuarioId, nota, texto };
}

// Lista todas as resenhas de um livro específico
async function listarResenhasPorLivro(livroId) {
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

// Lista todas as resenhas feitas por um usuário
async function listarResenhasPorUsuario(usuarioId) {
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

// Atualiza uma resenha existente (só o próprio autor deveria poder chamar isso)
async function atualizarResenha(resenhaId, { nota, texto }) {
  await db.query(
    `UPDATE resenhas SET nota = ?, texto = ? WHERE id = ?`,
    [nota, texto, resenhaId]
  );
  return { id: resenhaId, nota, texto };
}

// Remove uma resenha
async function deletarResenha(resenhaId) {
  await db.query('DELETE FROM resenhas WHERE id = ?', [resenhaId]);
}

module.exports = {
  criarResenha,
  listarResenhasPorLivro,
  listarResenhasPorUsuario,
  atualizarResenha,
  deletarResenha,
};