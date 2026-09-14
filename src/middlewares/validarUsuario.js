const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarUsuario(req, res, next) {
  const { nome, email, senha } = req.body;

  if (!nome || nome.trim().length < 2) {
    return res.status(400).json({ erro: 'O campo "nome" deve ter pelo menos 2 caracteres' });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido' });
  }

  if (!senha || senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
  }

  next();
}

module.exports = validarUsuario;
