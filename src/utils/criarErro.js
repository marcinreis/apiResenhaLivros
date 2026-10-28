// Cria um erro esperado (de regra de negócio), com o status HTTP que deve ser devolvido.
// O errorHandler usa a flag isOperational para saber que pode mostrar a mensagem ao cliente.
function criarErro(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  erro.isOperational = true;
  return erro;
}

module.exports = criarErro;
