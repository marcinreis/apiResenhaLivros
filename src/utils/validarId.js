const AppError = require('./appError');

// Garante que um parâmetro de rota (string) é um inteiro positivo antes de ir para o banco
function validarId(valor, nomeCampo = 'id') {
  if (!/^\d+$/.test(String(valor))) {
    throw new AppError(`Parâmetro "${nomeCampo}" deve ser um número inteiro válido`, 400);
  }
  return Number(valor);
}

module.exports = validarId;
