jest.mock('../../src/models/resenhaModel');
jest.mock('../../src/models/livroModel');
jest.mock('../../src/models/usuarioModel');

const resenhaModel = require('../../src/models/resenhaModel');
const livroModel = require('../../src/models/livroModel');
const usuarioModel = require('../../src/models/usuarioModel');
const resenhasService = require('../../src/services/resenhasService');

const TEXTO_VALIDO = 'Um texto de resenha com mais de dez caracteres.';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('criarResenha', () => {
  it('cria a resenha quando livro e usuário existem e a nota é válida', async () => {
    livroModel.buscarPorId.mockResolvedValue({ id: 1, titulo: 'Livro X' });
    usuarioModel.buscarPorId.mockResolvedValue({ id: 2, nome: 'Fulano' });
    resenhaModel.criar.mockResolvedValue(10);

    const resultado = await resenhasService.criarResenha({
      livroId: 1,
      usuarioId: 2,
      nota: 4.5,
      texto: TEXTO_VALIDO,
    });

    expect(resultado).toEqual({ id: 10, livroId: 1, usuarioId: 2, nota: 4.5, texto: TEXTO_VALIDO });
    expect(resenhaModel.criar).toHaveBeenCalledWith({
      livroId: 1,
      usuarioId: 2,
      nota: 4.5,
      texto: TEXTO_VALIDO,
    });
  });

  it('rejeita nota fora do intervalo permitido', async () => {
    await expect(
      resenhasService.criarResenha({ livroId: 1, usuarioId: 2, nota: 6, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 400 });

    expect(resenhaModel.criar).not.toHaveBeenCalled();
  });

  it('rejeita livroId em formato inválido', async () => {
    await expect(
      resenhasService.criarResenha({ livroId: 'abc', usuarioId: 2, nota: 4, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejeita quando o livro não existe', async () => {
    livroModel.buscarPorId.mockResolvedValue(null);

    await expect(
      resenhasService.criarResenha({ livroId: 999, usuarioId: 2, nota: 4, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('Livro') });
  });

  it('rejeita quando o usuário não existe', async () => {
    livroModel.buscarPorId.mockResolvedValue({ id: 1 });
    usuarioModel.buscarPorId.mockResolvedValue(null);

    await expect(
      resenhasService.criarResenha({ livroId: 1, usuarioId: 999, nota: 4, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('Usuário') });
  });
});

describe('buscarResenhaPorId', () => {
  it('lança 404 quando a resenha não existe', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(null);

    await expect(resenhasService.buscarResenhaPorId(999)).rejects.toMatchObject({ status: 404 });
  });

  it('retorna a resenha quando encontrada', async () => {
    resenhaModel.buscarPorId.mockResolvedValue({ id: 1, nota: 5 });

    await expect(resenhasService.buscarResenhaPorId(1)).resolves.toEqual({ id: 1, nota: 5 });
  });
});

describe('atualizarResenha', () => {
  it('lança 404 ao atualizar resenha inexistente', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(null);

    await expect(
      resenhasService.atualizarResenha(999, { nota: 3, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 404 });

    expect(resenhaModel.atualizar).not.toHaveBeenCalled();
  });

  it('atualiza quando a resenha existe', async () => {
    resenhaModel.buscarPorId.mockResolvedValue({ id: 1 });
    resenhaModel.atualizar.mockResolvedValue();

    const resultado = await resenhasService.atualizarResenha(1, { nota: 3, texto: TEXTO_VALIDO });

    expect(resultado).toEqual({ id: 1, nota: 3, texto: TEXTO_VALIDO });
    expect(resenhaModel.atualizar).toHaveBeenCalledWith(1, { nota: 3, texto: TEXTO_VALIDO });
  });
});

describe('deletarResenha', () => {
  it('lança 404 ao deletar resenha inexistente', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(null);

    await expect(resenhasService.deletarResenha(999)).rejects.toMatchObject({ status: 404 });
    expect(resenhaModel.deletar).not.toHaveBeenCalled();
  });

  it('remove quando a resenha existe', async () => {
    resenhaModel.buscarPorId.mockResolvedValue({ id: 1 });
    resenhaModel.deletar.mockResolvedValue();

    await resenhasService.deletarResenha(1);

    expect(resenhaModel.deletar).toHaveBeenCalledWith(1);
  });
});
