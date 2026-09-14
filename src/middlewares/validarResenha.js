function validarCamposResenha(body, res) {
  const { nota, texto } = body;

  if (nota === undefined || nota === null) {
    res.status(400).json({ erro: 'O campo "nota" é obrigatório' });
    return false;
  }

  if (typeof nota !== 'number' || nota < 0 || nota > 5) {
    res.status(400).json({ erro: 'A nota deve ser um número entre 0 e 5' });
    return false;
  }

  if (!texto || texto.trim().length < 10) {
    res.status(400).json({ erro: 'O texto da resenha deve ter pelo menos 10 caracteres' });
    return false;
  }

  if (texto.length > 2000) {
    res.status(400).json({ erro: 'O texto da resenha não pode ultrapassar 2000 caracteres' });
    return false;
  }

  return true;
}

// POST /resenhas — exige também a referência ao livro e ao usuário
function validarCriacao(req, res, next) {
  const { livroId, usuarioId } = req.body;

  if (livroId === undefined || livroId === null) {
    return res.status(400).json({ erro: 'O campo "livroId" é obrigatório' });
  }

  if (usuarioId === undefined || usuarioId === null) {
    return res.status(400).json({ erro: 'O campo "usuarioId" é obrigatório' });
  }

  if (!validarCamposResenha(req.body, res)) return;

  next();
}

// PUT /resenhas/:id — livro e usuário não mudam, só nota/texto
function validarAtualizacao(req, res, next) {
  if (!validarCamposResenha(req.body, res)) return;

  next();
}

module.exports = { validarCriacao, validarAtualizacao };
