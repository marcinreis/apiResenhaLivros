function validarResenha(req, res, next) {
  const { nota, texto } = req.body;

  if (nota === undefined || nota === null) {
    return res.status(400).json({ erro: 'O campo "nota" é obrigatório' });
  }

  if (typeof nota !== 'number' || nota < 0 || nota > 5) {
    return res.status(400).json({ erro: 'A nota deve ser um número entre 0 e 5' });
  }

  if (!texto || texto.trim().length < 10) {
    return res.status(400).json({ erro: 'O texto da resenha deve ter pelo menos 10 caracteres' });
  }

  if (texto.length > 2000) {
    return res.status(400).json({ erro: 'O texto da resenha não pode ultrapassar 2000 caracteres' });
  }

  // Passou na validação, segue para o controller
  next();
}

module.exports = validarResenha;