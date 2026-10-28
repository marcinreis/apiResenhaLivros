// O service usa axios.create(), então o mock devolve uma instância com get controlável
jest.mock('axios', () => {
  const get = jest.fn();
  return { create: jest.fn(() => ({ get })), mockGet: get };
});

const { mockGet } = require('axios');
const livrosApiService = require('../../src/services/livrosApiService');

const VOLUME = {
  id: 'abc123',
  volumeInfo: {
    title: 'Dom Casmurro',
    authors: ['Machado de Assis'],
    industryIdentifiers: [{ type: 'ISBN_13', identifier: '9781234567897' }],
    imageLinks: { thumbnail: 'http://capa.jpg' },
    description: 'Sinopse...',
  },
};

// Simula um erro HTTP do axios com o status informado
function erroHttp(status) {
  const erro = new Error(`HTTP ${status}`);
  erro.response = { status };
  return erro;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GOOGLE_BOOKS_API_KEY;
});

describe('buscarLivrosExternos', () => {
  it('mapeia os itens retornados pela Google Books API', async () => {
    mockGet.mockResolvedValue({ data: { items: [VOLUME] } });

    const resultado = await livrosApiService.buscarLivrosExternos('dom casmurro');

    expect(resultado).toEqual([
      {
        id: 'abc123',
        titulo: 'Dom Casmurro',
        autores: 'Machado de Assis',
        isbn: '9781234567897',
        capaUrl: 'http://capa.jpg',
        sinopse: 'Sinopse...',
      },
    ]);
    expect(mockGet).toHaveBeenCalledWith('', { params: { q: 'dom casmurro', maxResults: 10 } });
  });

  it('usa ISBN_10 quando ISBN_13 não está disponível', async () => {
    mockGet.mockResolvedValue({
      data: {
        items: [{ id: 'x', volumeInfo: { title: 'T', industryIdentifiers: [{ type: 'ISBN_10', identifier: '123456' }] } }],
      },
    });

    const [livro] = await livrosApiService.buscarLivrosExternos('t');
    expect(livro.isbn).toBe('123456');
  });

  it('preenche valores padrão quando faltam autor e título', async () => {
    mockGet.mockResolvedValue({ data: { items: [{ id: 'y', volumeInfo: {} }] } });

    const [livro] = await livrosApiService.buscarLivrosExternos('y');
    expect(livro).toMatchObject({ titulo: 'Sem título', autores: 'Autor desconhecido', isbn: null, capaUrl: null });
  });

  it('retorna lista vazia quando a API não encontra nenhum item', async () => {
    mockGet.mockResolvedValue({ data: {} });

    await expect(livrosApiService.buscarLivrosExternos('inexistente')).resolves.toEqual([]);
  });

  it('envia a API key quando ela está configurada', async () => {
    process.env.GOOGLE_BOOKS_API_KEY = 'chave-teste';
    mockGet.mockResolvedValue({ data: {} });

    await livrosApiService.buscarLivrosExternos('x');
    expect(mockGet).toHaveBeenCalledWith('', { params: { q: 'x', maxResults: 10, key: 'chave-teste' } });
  });

  it('transforma falha da API externa em erro 502', async () => {
    mockGet.mockRejectedValue(new Error('timeout'));

    await expect(livrosApiService.buscarLivrosExternos('x')).rejects.toMatchObject({ status: 502 });
  });

  it('transforma cota esgotada (429) em erro 503', async () => {
    mockGet.mockRejectedValue(erroHttp(429));

    await expect(livrosApiService.buscarLivrosExternos('x')).rejects.toMatchObject({ status: 503 });
  });
});

describe('buscarLivroPorIdExterno', () => {
  it('retorna o livro formatado', async () => {
    mockGet.mockResolvedValue({ data: VOLUME });

    const livro = await livrosApiService.buscarLivroPorIdExterno('abc123');

    expect(livro).toMatchObject({ id: 'abc123', titulo: 'Dom Casmurro' });
    expect(mockGet).toHaveBeenCalledWith('/abc123', { params: {} });
  });

  it.each([404, 503])('lança 404 quando a Google Books responde %i', async (status) => {
    mockGet.mockRejectedValue(erroHttp(status));

    await expect(livrosApiService.buscarLivroPorIdExterno('nao-existe')).rejects.toMatchObject({ status: 404 });
  });

  it('lança 503 quando a cota está esgotada', async () => {
    mockGet.mockRejectedValue(erroHttp(429));

    await expect(livrosApiService.buscarLivroPorIdExterno('abc123')).rejects.toMatchObject({ status: 503 });
  });

  it('lança 502 em outras falhas', async () => {
    mockGet.mockRejectedValue(new Error('timeout'));

    await expect(livrosApiService.buscarLivroPorIdExterno('abc123')).rejects.toMatchObject({ status: 502 });
  });
});
