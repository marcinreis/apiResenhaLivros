const crypto = require('crypto');
const usuarioModel = require('../models/usuarioModel');
const AppError = require('../utils/appError');
const validarId = require('../utils/validarId');

// Hash com salt usando scrypt (nativo do Node, sem dependência extra).
// Formato salvo: "salt:hash", ambos em hex.
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function criarUsuario({ nome, email, senha }) {
  const existente = await usuarioModel.buscarPorEmail(email);
  if (existente) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const senhaHash = hashSenha(senha);
  const novoId = await usuarioModel.criar({ nome, email, senhaHash });
  return { id: novoId, nome, email };
}

async function obterUsuarioPorId(id) {
  const idValido = validarId(id, 'id');
  const usuario = await usuarioModel.buscarPorId(idValido);
  if (!usuario) {
    throw new AppError('Usuário não encontrado', 404);
  }
  return usuario;
}

module.exports = {
  criarUsuario,
  obterUsuarioPorId,
  hashSenha,
};
