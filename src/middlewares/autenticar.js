const jwt = require('jsonwebtoken');
const criarErro = require('../utils/criarErro');

// Exige o header "Authorization: Bearer <token>" e coloca o usuário logado em req.usuario
function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    return next(criarErro(401, 'Token de autenticação não informado'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, usuario: payload.usuario };
    next();
  } catch (erro) {
    next(criarErro(401, 'Token inválido ou expirado'));
  }
}

module.exports = autenticar;
