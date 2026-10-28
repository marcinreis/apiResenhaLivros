// Teste de ponta a ponta contra um MySQL real efêmero (mysql-memory-server),
// cobrindo o fluxo documentado no README: registrar -> login -> resenhar um livro
// da Google Books -> listar com média -> editar -> excluir.
// Diferente de tests/integration/app.test.js, aqui o banco NÃO é mockado.
// A Google Books é simulada (axios mockado) para o teste não depender de rede nem de cota.
//
// Roda separado do `npm test` padrão (ver jest.e2e.config.js) porque baixa
// e sobe um binário real de MySQL na primeira execução.
jest.mock('axios', () => {
  const get = jest.fn();
  return { create: jest.fn(() => ({ get })), mockGet: get };
});

const { createDB } = require('mysql-memory-server');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const request = require('supertest');
const { mockGet } = require('axios');

jest.setTimeout(120000);

const LIVRO_ID = 'abc123XYZ';

let memoryDb;
let setupConnection;
let app;

beforeAll(async () => {
  memoryDb = await createDB({ dbName: 'api_resenhas_livros' });

  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(memoryDb.port);
  process.env.DB_USER = memoryDb.username;
  process.env.DB_PASSWORD = '';
  process.env.DB_NAME = memoryDb.dbName;
  process.env.JWT_SECRET = 'segredo-de-teste';

  setupConnection = await mysql.createConnection({
    host: '127.0.0.1',
    port: memoryDb.port,
    user: memoryDb.username,
    password: '',
    database: memoryDb.dbName,
    multipleStatements: true,
  });

  // O database.sql cria e seleciona o banco por conta própria; aqui o banco
  // já existe (criado pelo mysql-memory-server), então removemos essas linhas.
  const schema = fs
    .readFileSync(path.join(__dirname, '../../database.sql'), 'utf8')
    .replace(/CREATE DATABASE[\s\S]*?;/i, '')
    .replace(/USE\s+\S+;/i, '');
  await setupConnection.query(schema);

  // Google Books simulada: só o LIVRO_ID existe
  mockGet.mockImplementation(async (url) => {
    if (url === `/${LIVRO_ID}`) {
      return {
        data: {
          id: LIVRO_ID,
          volumeInfo: {
            title: 'Dom Casmurro',
            authors: ['Machado de Assis'],
            imageLinks: { thumbnail: 'http://covers.exemplo/dom-casmurro.jpg' },
          },
        },
      };
    }
    const erro = new Error('Not Found');
    erro.response = { status: 404 };
    throw erro;
  });

  app = require('../../src/app');
});

afterAll(async () => {
  await require('../../src/config/database').end();
  await setupConnection?.end();
  await memoryDb?.stop();
});

// Registra e faz login, devolvendo o header de autenticação
async function criarUsuarioLogado(usuario) {
  const registro = await request(app).post('/api/auth/registrar').send({ usuario, senha: 'senha123' });
  expect(registro.status).toBe(201);

  const login = await request(app).post('/api/auth/login').send({ usuario, senha: 'senha123' });
  expect(login.status).toBe(200);

  return { Authorization: `Bearer ${login.body.token}` };
}

describe('Fluxo registrar -> login -> resenha (MySQL real efêmero)', () => {
  let authAna;
  let authBruno;
  let resenhaAnaId;

  it('registra e faz login de dois usuários, guardando só o hash da senha', async () => {
    authAna = await criarUsuarioLogado('ana');
    authBruno = await criarUsuarioLogado('bruno');

    const [rows] = await setupConnection.query('SELECT senha_hash FROM usuarios WHERE usuario = ?', ['ana']);
    expect(rows[0].senha_hash).not.toBe('senha123');
  });

  it('não permite registrar o mesmo usuário duas vezes', async () => {
    const res = await request(app).post('/api/auth/registrar').send({ usuario: 'ana', senha: 'outrasenha' });
    expect(res.status).toBe(409);
  });

  it('POST /api/livros/:id/resenhas cria a resenha com os dados do livro em cache', async () => {
    const res = await request(app)
      .post(`/api/livros/${LIVRO_ID}/resenhas`)
      .set(authAna)
      .send({ nota: 4, texto: 'Uma obra-prima da literatura brasileira.' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ livro: { id: LIVRO_ID, titulo: 'Dom Casmurro' }, usuario: { usuario: 'ana' }, nota: 4 });
    resenhaAnaId = res.body.id;

    const [rows] = await setupConnection.query('SELECT * FROM resenhas WHERE id = ?', [resenhaAnaId]);
    expect(rows[0].livro_titulo).toBe('Dom Casmurro');
    expect(rows[0].livro_autor).toBe('Machado de Assis');
  });

  it('não permite uma segunda resenha do mesmo usuário para o mesmo livro', async () => {
    const res = await request(app)
      .post(`/api/livros/${LIVRO_ID}/resenhas`)
      .set(authAna)
      .send({ nota: 1, texto: 'Tentando resenhar de novo.' });
    expect(res.status).toBe(409);
  });

  it('a restrição única do banco também impede a duplicata', async () => {
    const [[ana]] = await setupConnection.query('SELECT id FROM usuarios WHERE usuario = ?', ['ana']);
    await expect(
      setupConnection.query(
        'INSERT INTO resenhas (usuario_id, livro_id_externo, nota, texto) VALUES (?, ?, 3, ?)',
        [ana.id, LIVRO_ID, 'Inserida direto no banco.']
      )
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('retorna 404 ao resenhar um livro que não existe na Google Books', async () => {
    const res = await request(app)
      .post('/api/livros/nao-existe/resenhas')
      .set(authAna)
      .send({ nota: 3, texto: 'Livro que não existe.' });
    expect(res.status).toBe(404);
  });

  it('GET /api/livros/:id/resenhas devolve a média decimal das notas', async () => {
    const criar = await request(app)
      .post(`/api/livros/${LIVRO_ID}/resenhas`)
      .set(authBruno)
      .send({ nota: 3, texto: 'Gostei, mas achei o meio lento.' });
    expect(criar.status).toBe(201);

    const res = await request(app).get(`/api/livros/${LIVRO_ID}/resenhas`);

    expect(res.status).toBe(200);
    expect(res.body.totalResenhas).toBe(2);
    expect(res.body.mediaNotas).toBe(3.5);
    expect(res.body.resenhas.map((r) => r.usuario.usuario).sort()).toEqual(['ana', 'bruno']);
  });

  it('GET /api/resenhas e GET /api/resenhas/:id listam e detalham', async () => {
    const lista = await request(app).get('/api/resenhas');
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(2);

    const detalhe = await request(app).get(`/api/resenhas/${resenhaAnaId}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.usuario.usuario).toBe('ana');
  });

  it('PUT /api/resenhas/:id só permite o autor editar', async () => {
    const outro = await request(app)
      .put(`/api/resenhas/${resenhaAnaId}`)
      .set(authBruno)
      .send({ nota: 0, texto: 'Editando a resenha alheia.' });
    expect(outro.status).toBe(403);

    const res = await request(app)
      .put(`/api/resenhas/${resenhaAnaId}`)
      .set(authAna)
      .send({ nota: 5, texto: 'Mudei de ideia, é excelente!' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nota: 5, texto: 'Mudei de ideia, é excelente!' });

    const media = await request(app).get(`/api/livros/${LIVRO_ID}/resenhas`);
    expect(media.body.mediaNotas).toBe(4);
  });

  it('DELETE /api/resenhas/:id só permite o autor excluir', async () => {
    const outro = await request(app).delete(`/api/resenhas/${resenhaAnaId}`).set(authBruno);
    expect(outro.status).toBe(403);

    const res = await request(app).delete(`/api/resenhas/${resenhaAnaId}`).set(authAna);
    expect(res.status).toBe(204);

    const depois = await request(app).get(`/api/resenhas/${resenhaAnaId}`);
    expect(depois.status).toBe(404);
  });
});
