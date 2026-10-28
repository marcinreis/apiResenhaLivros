function errorHandler(err, req, res, next) {
  // Erros esperados lançados pelos services (ex: "Resenha não encontrada")
  if (err.isOperational) {
    return res.status(err.status || 400).json({ erro: err.message });
  }

  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  // Erro de chave duplicada no MySQL (ex: usuário ou resenha já cadastrados)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ erro: 'Registro já existe' });
  }

  // Erro de chave estrangeira (ex: usuário inexistente)
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ erro: 'Referência inválida' });
  }

  // Qualquer outro erro não tratado: loga e não expõe detalhes ao cliente
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
}

module.exports = errorHandler;
