jest.mock('../../src/models/resenhaModel');
jest.mock('../../src/services/livrosApiService');

const resenhaModel = require('../../src/models/resenhaModel');
const livrosApiService = require('../../src/services/livrosApiService');
const resenhasService = require('../../src/services/resenhasService');

const TEXTO_VALIDO = 'Um texto de resenha com mais de dez caracteres.';

const LIVRO = { id: 'abc123', titulo: 'Dom Casmurro', autores: 'Machado de Assis', capaUrl: 'http://capa.jpg' };

// Linha como vem do banco (snake_case, com o nome do usuário do JOIN)
function linhaResenha(campos = {}) {
  return {
    id: 10,
    usuario_id: 2,
    usuario_nome: 'ana',
    livro_id_externo: 'abc123',
    livro_titulo: 'Dom Casmurro',
    livro_autor: 'Machado de Assis',
    livro_capa_url: 'http://capa.jpg',
    nota: 4,
    texto: TEXTO_VALIDO,
    criado_em: '2026-10-28T12:00:00.000Z',
    atualizado_em: '2026-10-28T12:00:00.000Z',
    ...campos,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('criarResenha', () => {
  it('cria a resenha guardando os dados do livro em cache', async () => {
    resenhaModel.buscarPorUsuarioELivro.mockResolvedValue(null);
    livrosApiService.buscarLivroPorIdExterno.mockResolvedValue(LIVRO);
    resenhaModel.criar.mockResolvedValue(10);
    resenhaModel.buscarPorId.mockResolvedValue(linhaResenha());

    const resultado = await resenhasService.criarResenha({
      livroIdExterno: 'abc123',
      usuarioId: 2,
      nota: 4,
      texto: `  ${TEXTO_VALIDO}  `,
    });

    expect(resenhaModel.criar).toHaveBeenCalledWith({
      usuarioId: 2,
      livroIdExterno: 'abc123',
      livroTitulo: 'Dom Casmurro',
      livroAutor: 'Machado de Assis',
      livroCapaUrl: 'http://capa.jpg',
      nota: 4,
      texto: TEXTO_VALIDO,
    });
    expect(resultado).toEqual({
      id: 10,
      livro: LIVRO,
      usuario: { id: 2, usuario: 'ana' },
      nota: 4,
      texto: TEXTO_VALIDO,
      criadoEm: '2026-10-28T12:00:00.000Z',
      atualizadoEm: '2026-10-28T12:00:00.000Z',
    });
  });

  it('rejeita com 409 quando o usuário já resenhou o livro', async () => {
    resenhaModel.buscarPorUsuarioELivro.mockResolvedValue({ id: 5 });

    await expect(
      resenhasService.criarResenha({ livroIdExterno: 'abc123', usuarioId: 2, nota: 4, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 409 });

    expect(livrosApiService.buscarLivroPorIdExterno).not.toHaveBeenCalled();
    expect(resenhaModel.criar).not.toHaveBeenCalled();
  });

  it('propaga o 404 quando o livro não existe na API externa', async () => {
    const erro = Object.assign(new Error('Livro não encontrado'), { status: 404, isOperational: true });
    resenhaModel.buscarPorUsuarioELivro.mockResolvedValue(null);
    livrosApiService.buscarLivroPorIdExterno.mockRejectedValue(erro);

    await expect(
      resenhasService.criarResenha({ livroIdExterno: 'xyz', usuarioId: 2, nota: 4, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 404 });

    expect(resenhaModel.criar).not.toHaveBeenCalled();
  });
});

describe('obterResenha', () => {
  it('retorna a resenha formatada quando encontrada', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(linhaResenha());

    const resenha = await resenhasService.obterResenha('10');

    expect(resenhaModel.buscarPorId).toHaveBeenCalledWith(10);
    expect(resenha).toMatchObject({ id: 10, nota: 4, usuario: { id: 2, usuario: 'ana' } });
  });

  it('lança 404 quando a resenha não existe', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(null);

    await expect(resenhasService.obterResenha(999)).rejects.toMatchObject({ status: 404 });
  });

  it.each(['abc', '0', '-1', '1.5'])('lança 404 para o id inválido "%s" sem consultar o banco', async (id) => {
    await expect(resenhasService.obterResenha(id)).rejects.toMatchObject({ status: 404 });
    expect(resenhaModel.buscarPorId).not.toHaveBeenCalled();
  });
});

describe('listarResenhasPorLivro', () => {
  it('devolve a média como número decimal', async () => {
    resenhaModel.buscarPorLivro.mockResolvedValue([linhaResenha({ nota: 4 }), linhaResenha({ id: 11, nota: 3 })]);
    // O mysql2 devolve AVG() como string
    resenhaModel.calcularMediaPorLivro.mockResolvedValue({ media: '3.5000', total: 2 });

    const resultado = await resenhasService.listarResenhasPorLivro('abc123');

    expect(resultado.livroId).toBe('abc123');
    expect(resultado.mediaNotas).toBe(3.5);
    expect(resultado.totalResenhas).toBe(2);
    expect(resultado.resenhas).toHaveLength(2);
  });

  it('arredonda a média para 2 casas', async () => {
    resenhaModel.buscarPorLivro.mockResolvedValue([]);
    resenhaModel.calcularMediaPorLivro.mockResolvedValue({ media: '3.3333', total: 3 });

    const resultado = await resenhasService.listarResenhasPorLivro('abc123');
    expect(resultado.mediaNotas).toBe(3.33);
  });

  it('devolve média nula quando o livro não tem resenhas', async () => {
    resenhaModel.buscarPorLivro.mockResolvedValue([]);
    resenhaModel.calcularMediaPorLivro.mockResolvedValue({ media: null, total: 0 });

    const resultado = await resenhasService.listarResenhasPorLivro('abc123');
    expect(resultado).toEqual({ livroId: 'abc123', mediaNotas: null, totalResenhas: 0, resenhas: [] });
  });
});

describe('atualizarResenha', () => {
  it('lança 404 ao atualizar resenha inexistente', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(null);

    await expect(
      resenhasService.atualizarResenha(999, 2, { nota: 3, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 404 });

    expect(resenhaModel.atualizar).not.toHaveBeenCalled();
  });

  it('lança 403 quando a resenha é de outro usuário', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(linhaResenha({ usuario_id: 2 }));

    await expect(
      resenhasService.atualizarResenha(10, 99, { nota: 3, texto: TEXTO_VALIDO })
    ).rejects.toMatchObject({ status: 403 });

    expect(resenhaModel.atualizar).not.toHaveBeenCalled();
  });

  it('atualiza e devolve a resenha atualizada', async () => {
    resenhaModel.buscarPorId
      .mockResolvedValueOnce(linhaResenha())
      .mockResolvedValueOnce(linhaResenha({ nota: 3 }));

    const resultado = await resenhasService.atualizarResenha(10, 2, { nota: 3, texto: TEXTO_VALIDO });

    expect(resenhaModel.atualizar).toHaveBeenCalledWith(10, { nota: 3, texto: TEXTO_VALIDO });
    expect(resultado.nota).toBe(3);
  });
});

describe('deletarResenha', () => {
  it('lança 404 ao deletar resenha inexistente', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(null);

    await expect(resenhasService.deletarResenha(999, 2)).rejects.toMatchObject({ status: 404 });
    expect(resenhaModel.deletar).not.toHaveBeenCalled();
  });

  it('lança 403 quando a resenha é de outro usuário', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(linhaResenha({ usuario_id: 2 }));

    await expect(resenhasService.deletarResenha(10, 99)).rejects.toMatchObject({ status: 403 });
    expect(resenhaModel.deletar).not.toHaveBeenCalled();
  });

  it('remove quando a resenha é do usuário', async () => {
    resenhaModel.buscarPorId.mockResolvedValue(linhaResenha());

    await resenhasService.deletarResenha(10, 2);

    expect(resenhaModel.deletar).toHaveBeenCalledWith(10);
  });
});
