// Evita repetir try/catch em cada controller: qualquer rejeição da Promise
// cai automaticamente no errorHandler central via next(erro).
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
