const db = require('../config/database');

async function criar({ nome, email, senhaHash }) {
  const [result] = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)`,
    [nome, email, senhaHash]
  );
  return result.insertId;
}

async function buscarPorId(id) {
  const [rows] = await db.query(
    'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function buscarPorEmail(email) {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return rows[0] || null;
}

module.exports = {
  criar,
  buscarPorId,
  buscarPorEmail,
};
