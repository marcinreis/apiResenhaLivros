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

// Roda a chamada avançando os timers falsos das esperas entre tentativas
async function executarComTimers(promessa) {
  const resultado = promessa.then(
    (valor) => ({ valor }),
    (erro) => ({ erro })
  );
  await jest.runAllTimersAsync();
  return resultado;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset();
  jest.useFakeTimers();
  delete process.env.GOOGLE_BOOKS_API_KEY;
});

afterEach(() => {
  jest.useRealTimers();
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

  it('repete a chamada quando a Google Books falha temporariamente', async () => {
    mockGet.mockRejectedValueOnce(erroHttp(503)).mockResolvedValueOnce({ data: { items: [VOLUME] } });

    const { valor } = await executarComTimers(livrosApiService.buscarLivrosExternos('x'));

    expect(valor).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['503 persistente', erroHttp(503)],
    ['timeout', new Error('timeout')],
  ])('lança 503 depois de 3 tentativas com %s', async (_, falha) => {
    mockGet.mockRejectedValue(falha);

    const { erro } = await executarComTimers(livrosApiService.buscarLivrosExternos('x'));

    expect(erro).toMatchObject({ status: 503, message: expect.stringContaining('indisponível') });
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('transforma cota esgotada (429) em erro 503, sem repetir', async () => {
    mockGet.mockRejectedValue(erroHttp(429));

    const { erro } = await executarComTimers(livrosApiService.buscarLivrosExternos('x'));

    expect(erro).toMatchObject({ status: 503, message: expect.stringContaining('Limite') });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('transforma erro do cliente (ex: 400) em 502, sem repetir', async () => {
    mockGet.mockRejectedValue(erroHttp(400));

    const { erro } = await executarComTimers(livrosApiService.buscarLivrosExternos('x'));

    expect(erro).toMatchObject({ status: 502 });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

describe('buscarLivroPorIdExterno', () => {
  it('retorna o livro formatado', async () => {
    mockGet.mockResolvedValue({ data: VOLUME });

    const livro = await livrosApiService.buscarLivroPorIdExterno('abc123');

    expect(livro).toMatchObject({ id: 'abc123', titulo: 'Dom Casmurro' });
    expect(mockGet).toHaveBeenCalledWith('/abc123', { params: {} });
  });

  it('lança 404 quando a Google Books responde 404, sem repetir', async () => {
    mockGet.mockRejectedValue(erroHttp(404));

    const { erro } = await executarComTimers(livrosApiService.buscarLivroPorIdExterno('nao-existe'));

    expect(erro).toMatchObject({ status: 404 });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('repete a chamada e devolve o livro quando a falha é passageira', async () => {
    mockGet.mockRejectedValueOnce(erroHttp(503)).mockResolvedValueOnce({ data: VOLUME });

    const { valor } = await executarComTimers(livrosApiService.buscarLivroPorIdExterno('abc123'));

    expect(valor).toMatchObject({ id: 'abc123' });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('lança 503 (e não 404) quando a Google Books continua indisponível', async () => {
    mockGet.mockRejectedValue(erroHttp(503));

    const { erro } = await executarComTimers(livrosApiService.buscarLivroPorIdExterno('abc123'));

    expect(erro).toMatchObject({ status: 503 });
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it('lança 503 quando a cota está esgotada', async () => {
    mockGet.mockRejectedValue(erroHttp(429));

    const { erro } = await executarComTimers(livrosApiService.buscarLivroPorIdExterno('abc123'));
    expect(erro).toMatchObject({ status: 503 });
  });

  it('lança 502 em outros erros da Google Books', async () => {
    mockGet.mockRejectedValue(erroHttp(403));

    const { erro } = await executarComTimers(livrosApiService.buscarLivroPorIdExterno('abc123'));
    expect(erro).toMatchObject({ status: 502 });
  });
});
