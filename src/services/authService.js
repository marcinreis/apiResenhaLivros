const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');
const criarErro = require('../utils/criarErro');

const USUARIO_REGEX = /^[a-zA-Z0-9_.]{3,50}$/;

function validarCredenciais(usuario, senha) {
  if (typeof usuario !== 'string' || !USUARIO_REGEX.test(usuario)) {
    throw criarErro(400, 'O usuário deve ter de 3 a 50 caracteres (letras, números, "_" ou ".")');
  }
  if (typeof senha !== 'string' || senha.length < 6) {
    throw criarErro(400, 'A senha deve ter pelo menos 6 caracteres');
  }
}

// Cadastra um novo usuário com a senha criptografada
async function registrar({ usuario, senha }) {
  validarCredenciais(usuario, senha);

  const existente = await usuarioModel.buscarPorUsuario(usuario);
  if (existente) {
    throw criarErro(409, 'Este usuário já está cadastrado');
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const novoId = await usuarioModel.criar({ usuario, senhaHash });
  return { id: novoId, usuario };
}

// Confere usuário e senha e devolve um token JWT
async function login({ usuario, senha }) {
  if (typeof usuario !== 'string' || typeof senha !== 'string') {
    throw criarErro(400, 'Informe usuário e senha');
  }

  const encontrado = await usuarioModel.buscarPorUsuario(usuario);
  const senhaConfere = encontrado && (await bcrypt.compare(senha, encontrado.senha_hash));
  if (!senhaConfere) {
    throw criarErro(401, 'Usuário ou senha inválidos');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado no .env');
  }

  const token = jwt.sign(
    { id: encontrado.id, usuario: encontrado.usuario },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return { token, usuario: { id: encontrado.id, usuario: encontrado.usuario } };
}

module.exports = {
  registrar,
  login,
};
