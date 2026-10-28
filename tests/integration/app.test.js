// Testa as rotas pelo Express (supertest) com o banco e a Google Books mockados
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../../src/services/livrosApiService');

process.env.JWT_SECRET = 'segredo-de-teste';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/database');
const livrosApiService = require('../../src/services/livrosApiService');

const TEXTO_VALIDO = 'Texto com mais de dez caracteres';
const token = jwt.sign({ id: 2, usuario: 'ana' }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

const LINHA_RESENHA = {
  id: 10,
  usuario_id: 2,
  usuario_nome: 'ana',
  livro_id_externo: 'abc123',
  livro_titulo: 'Dom Casmurro',
  livro_autor: 'Machado de Assis',
  livro_capa_url: null,
  nota: 4,
  texto: TEXTO_VALIDO,
  criado_em: '2026-10-28T12:00:00.000Z',
  atualizado_em: '2026-10-28T12:00:00.000Z',
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Rotas gerais', () => {
  it('GET / retorna status ok', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rota inexistente retorna 404', async () => {
    const res = await request(app).get('/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });

  it('JSON malformado retorna 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "usuario": ');
    expect(res.status).toBe(400);
  });

  it('erro inesperado retorna 500 sem expor detalhes', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    db.query.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'));

    const res = await request(app).get('/api/resenhas');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ erro: 'Erro interno do servidor' });
    console.error.mockRestore();
  });
});

describe('Validação de entrada', () => {
  it('POST /api/auth/registrar sem campos retorna 400', async () => {
    const res = await request(app).post('/api/auth/registrar').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/registrar com senha curta retorna 400', async () => {
    const res = await request(app).post('/api/auth/registrar').send({ usuario: 'ana', senha: '123' });
    expect(res.status).toBe(400);
  });

  it('GET /api/livros sem busca retorna 400', async () => {
    const res = await request(app).get('/api/livros');
    expect(res.status).toBe(400);
  });

  it.each([
    ['nota acima de 5', { nota: 6, texto: TEXTO_VALIDO }],
    ['nota decimal', { nota: 4.5, texto: TEXTO_VALIDO }],
    ['nota como texto', { nota: '4', texto: TEXTO_VALIDO }],
    ['sem nota', { texto: TEXTO_VALIDO }],
    ['texto curto', { nota: 4, texto: 'curto' }],
    ['texto longo', { nota: 4, texto: 'a'.repeat(2001) }],
  ])('POST /api/livros/:id/resenhas com %s retorna 400', async (_, body) => {
    const res = await request(app).post('/api/livros/abc123/resenhas').set(auth).send(body);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('GET /api/resenhas/:id com id não numérico retorna 404', async () => {
    const res = await request(app).get('/api/resenhas/abc');
    expect(res.status).toBe(404);
  });
});

describe('Autenticação', () => {
  it.each([
    ['POST', '/api/livros/abc123/resenhas'],
    ['PUT', '/api/resenhas/10'],
    ['DELETE', '/api/resenhas/10'],
  ])('%s %s sem token retorna 401', async (metodo, rota) => {
    const res = await request(app)[metodo.toLowerCase()](rota).send({ nota: 4, texto: TEXTO_VALIDO });
    expect(res.status).toBe(401);
  });

  it('token inválido retorna 401', async () => {
    const res = await request(app)
      .post('/api/livros/abc123/resenhas')
      .set('Authorization', 'Bearer token-falso')
      .send({ nota: 4, texto: TEXTO_VALIDO });
    expect(res.status).toBe(401);
  });

  it('token assinado com outro segredo retorna 401', async () => {
    const tokenFalso = jwt.sign({ id: 2, usuario: 'ana' }, 'outro-segredo');
    const res = await request(app)
      .delete('/api/resenhas/10')
      .set('Authorization', `Bearer ${tokenFalso}`);
    expect(res.status).toBe(401);
  });
});

describe('Fluxo de sucesso', () => {
  it('POST /api/livros/:id/resenhas cria a resenha do usuário logado', async () => {
    livrosApiService.buscarLivroPorIdExterno.mockResolvedValue({
      id: 'abc123', titulo: 'Dom Casmurro', autores: 'Machado de Assis', capaUrl: null,
    });
    db.query
      .mockResolvedValueOnce([[]]) // buscarPorUsuarioELivro: ainda não resenhou
      .mockResolvedValueOnce([{ insertId: 10 }]) // criar
      .mockResolvedValueOnce([[LINHA_RESENHA]]); // buscarPorId

    const res = await request(app).post('/api/livros/abc123/resenhas').set(auth).send({ nota: 4, texto: TEXTO_VALIDO });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 10,
      livro: { id: 'abc123', titulo: 'Dom Casmurro' },
      usuario: { id: 2, usuario: 'ana' },
      nota: 4,
    });
  });

  it('GET /api/livros/:id/resenhas devolve a média decimal', async () => {
    db.query
      .mockResolvedValueOnce([[LINHA_RESENHA, { ...LINHA_RESENHA, id: 11, nota: 3 }]])
      .mockResolvedValueOnce([[{ media: '3.5000', total: 2 }]]);

    const res = await request(app).get('/api/livros/abc123/resenhas');

    expect(res.status).toBe(200);
    expect(res.body.mediaNotas).toBe(3.5);
    expect(res.body.totalResenhas).toBe(2);
  });

  it('PUT /api/resenhas/:id de outro usuário retorna 403', async () => {
    db.query.mockResolvedValueOnce([[{ ...LINHA_RESENHA, usuario_id: 99 }]]);

    const res = await request(app).put('/api/resenhas/10').set(auth).send({ nota: 5, texto: TEXTO_VALIDO });

    expect(res.status).toBe(403);
  });

  it('DELETE /api/resenhas/:id do próprio usuário retorna 204', async () => {
    db.query
      .mockResolvedValueOnce([[LINHA_RESENHA]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete('/api/resenhas/10').set(auth);

    expect(res.status).toBe(204);
  });
});
