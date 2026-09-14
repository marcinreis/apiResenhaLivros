jest.mock('axios');
jest.mock('../../src/models/livroModel');

const axios = require('axios');
const livroModel = require('../../src/models/livroModel');
const livrosApiService = require('../../src/services/livrosApiService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('buscarLivrosExternos', () => {
  it('mapeia os itens retornados pela Google Books API', async () => {
    axios.get.mockResolvedValue({
      data: {
        items: [
          {
            id: 'abc123',
            volumeInfo: {
              title: 'Dom Casmurro',
              authors: ['Machado de Assis'],
              industryIdentifiers: [{ type: 'ISBN_13', identifier: '9781234567897' }],
              imageLinks: { thumbnail: 'http://capa.jpg' },
              description: 'Sinopse...',
            },
          },
        ],
      },
    });

    const resultado = await livrosApiService.buscarLivrosExternos('dom casmurro');

    expect(resultado).toEqual([
      {
        googleId: 'abc123',
        titulo: 'Dom Casmurro',
        autores: 'Machado de Assis',
        isbn: '9781234567897',
        capaUrl: 'http://capa.jpg',
        sinopse: 'Sinopse...',
      },
    ]);
  });

  it('usa ISBN_10 quando ISBN_13 não está disponível', async () => {
    axios.get.mockResolvedValue({
      data: {
        items: [
          {
            id: 'x',
            volumeInfo: { title: 'T', industryIdentifiers: [{ type: 'ISBN_10', identifier: '123456' }] },
          },
        ],
      },
    });

    const [livro] = await livrosApiService.buscarLivrosExternos('t');
    expect(livro.isbn).toBe('123456');
  });

  it('retorna lista vazia quando a API não encontra nenhum item', async () => {
    axios.get.mockResolvedValue({ data: {} });

    await expect(livrosApiService.buscarLivrosExternos('inexistente')).resolves.toEqual([]);
  });

  it('propaga falha da API externa como erro operacional 502', async () => {
    axios.get.mockRejectedValue(new Error('timeout'));

    await expect(livrosApiService.buscarLivrosExternos('x')).rejects.toMatchObject({ status: 502 });
  });
});

describe('salvarOuObterLivro', () => {
  it('retorna livro existente pelo isbn sem criar novo', async () => {
    livroModel.buscarPorIsbn.mockResolvedValue({ id: 7, isbn: '123' });

    const resultado = await livrosApiService.salvarOuObterLivro({ isbn: '123', titulo: 'X' });

    expect(resultado).toEqual({ id: 7, isbn: '123' });
    expect(livroModel.criar).not.toHaveBeenCalled();
  });

  it('cria um novo livro quando não existe localmente (por isbn nem googleId)', async () => {
    livroModel.buscarPorIsbn.mockResolvedValue(null);
    livroModel.buscarPorGoogleId.mockResolvedValue(null);
    livroModel.criar.mockResolvedValue(42);

    const resultado = await livrosApiService.salvarOuObterLivro({ isbn: '999', googleId: 'g1', titulo: 'Y' });

    expect(resultado.id).toBe(42);
    expect(livroModel.criar).toHaveBeenCalledWith({ isbn: '999', googleId: 'g1', titulo: 'Y' });
  });

  it('reaproveita livro existente pelo googleId quando não há isbn', async () => {
    livroModel.buscarPorGoogleId.mockResolvedValue({ id: 3, googleId: 'g1' });

    const resultado = await livrosApiService.salvarOuObterLivro({ googleId: 'g1', titulo: 'Z' });

    expect(resultado).toEqual({ id: 3, googleId: 'g1' });
    expect(livroModel.criar).not.toHaveBeenCalled();
  });

  it('rejeita quando não há isbn nem googleId', async () => {
    await expect(livrosApiService.salvarOuObterLivro({ titulo: 'Sem identificadores' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rejeita quando não há título', async () => {
    await expect(livrosApiService.salvarOuObterLivro({ isbn: '123' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('obterLivroPorId', () => {
  it('lança 404 quando o livro não existe', async () => {
    livroModel.buscarPorId.mockResolvedValue(null);

    await expect(livrosApiService.obterLivroPorId(999)).rejects.toMatchObject({ status: 404 });
  });

  it('lança 400 quando o id não é numérico', async () => {
    await expect(livrosApiService.obterLivroPorId('abc')).rejects.toMatchObject({ status: 400 });
  });
});
