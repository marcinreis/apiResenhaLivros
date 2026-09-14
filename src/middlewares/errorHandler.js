function errorHandler(err, req, res, next) {
  console.error(err);

  // Erros conhecidos lançados pelos services (ex: "Nota deve estar entre 0 e 5")
  if (err.message && err.isOperational) {
    return res.status(400).json({ erro: err.message });
  }

  // Erro de chave duplicada no MySQL (ex: ISBN já cadastrado)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ erro: 'Registro já existe' });
  }

  // Erro de chave estrangeira (ex: livroId ou usuarioId inexistente)
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ erro: 'Referência inválida (livro ou usuário não encontrado)' });
  }

  // Qualquer outro erro não tratado
  res.status(500).json({ erro: 'Erro interno do servidor' });
}

module.exports = errorHandler;