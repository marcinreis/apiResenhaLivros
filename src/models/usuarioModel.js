const db = require('../config/database');

async function buscarPorUsuario(usuario) {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
  return rows[0] || null;
}

async function criar({ usuario, senhaHash }) {
  const [result] = await db.query(
    'INSERT INTO usuarios (usuario, senha_hash) VALUES (?, ?)',
    [usuario, senhaHash]
  );
  return result.insertId;
}

module.exports = {
  buscarPorUsuario,
  criar,
};
