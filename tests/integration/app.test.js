jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/database');

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
});

describe('Validação de entrada', () => {
  it('POST /api/usuarios sem campos obrigatórios retorna 400', async () => {
    const res = await request(app).post('/api/usuarios').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/usuarios com e-mail inválido retorna 400', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ nome: 'Ana', email: 'nao-e-email', senha: '123456' });
    expect(res.status).toBe(400);
  });

  it('POST /api/resenhas sem livroId/usuarioId retorna 400', async () => {
    const res = await request(app)
      .post('/api/resenhas')
      .send({ nota: 5, texto: 'Texto com mais de dez caracteres' });
    expect(res.status).toBe(400);
  });

  it('POST /api/resenhas com nota fora do intervalo retorna 400', async () => {
    const res = await request(app)
      .post('/api/resenhas')
      .send({ livroId: 1, usuarioId: 1, nota: 9, texto: 'Texto com mais de dez caracteres' });
    expect(res.status).toBe(400);
  });

  it('GET /api/livros/buscar sem termo retorna 400', async () => {
    const res = await request(app).get('/api/livros/buscar');
    expect(res.status).toBe(400);
  });

  it('GET /api/resenhas/:id com id não numérico retorna 400', async () => {
    const res = await request(app).get('/api/resenhas/abc');
    expect(res.status).toBe(400);
  });
});

describe('Fluxo de sucesso', () => {
  it('POST /api/resenhas com dados válidos retorna 201 e a resenha criada', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 1, titulo: 'Dom Casmurro' }]]) // livroModel.buscarPorId
      .mockResolvedValueOnce([[{ id: 2, nome: 'Ana' }]]) // usuarioModel.buscarPorId
      .mockResolvedValueOnce([{ insertId: 10 }]); // resenhaModel.criar

    const res = await request(app)
      .post('/api/resenhas')
      .send({ livroId: 1, usuarioId: 2, nota: 4.5, texto: 'Texto com mais de dez caracteres' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 10,
      livroId: 1,
      usuarioId: 2,
      nota: 4.5,
      texto: 'Texto com mais de dez caracteres',
    });
  });
});
