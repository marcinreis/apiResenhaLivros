// Teste de ponta a ponta contra um MySQL real efêmero (mysql-memory-server),
// cobrindo o fluxo documentado no README: buscar no Google Books -> salvar
// localmente (registrando o googleId) -> criar usuário -> criar resenha.
// Diferente de tests/integration/app.test.js, aqui o banco NÃO é mockado.
//
// Roda separado do `npm test` padrão (ver jest.e2e.config.js) porque baixa
// e sobe um binário real de MySQL na primeira execução.
const { createDB } = require('mysql-memory-server');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const request = require('supertest');

jest.setTimeout(120000);

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

  app = require('../../src/app');
});

afterAll(async () => {
  await setupConnection?.end();
  await memoryDb?.stop();
});

describe('Fluxo Google Books -> salvar -> resenha (MySQL real efêmero)', () => {
  let livroId;
  let usuarioId;

  it('POST /api/livros salva um livro vindo da busca do Google Books e registra o googleId', async () => {
    const res = await request(app).post('/api/livros').send({
      googleId: 'abc123XYZ',
      titulo: 'Dom Casmurro',
      autores: 'Machado de Assis',
      isbn: '9788535910663',
      capaUrl: 'http://covers.exemplo/dom-casmurro.jpg',
      sinopse: 'A história de Bentinho e Capitu.',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
    livroId = res.body.id;

    const [rows] = await setupConnection.query('SELECT * FROM livros WHERE id = ?', [livroId]);
    expect(rows[0].google_id).toBe('abc123XYZ');
    expect(rows[0].isbn).toBe('9788535910663');
  });

  it('POST /api/livros de novo com o mesmo isbn/googleId reaproveita o registro (não duplica)', async () => {
    const res = await request(app).post('/api/livros').send({
      googleId: 'abc123XYZ',
      titulo: 'Dom Casmurro',
      isbn: '9788535910663',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(livroId);

    const [rows] = await setupConnection.query('SELECT COUNT(*) AS total FROM livros WHERE isbn = ?', [
      '9788535910663',
    ]);
    expect(rows[0].total).toBe(1);
  });

  it('GET /api/livros/:id retorna o livro salvo', async () => {
    const res = await request(app).get(`/api/livros/${livroId}`);
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Dom Casmurro');
  });

  it('POST /api/usuarios cria o usuário que vai escrever a resenha', async () => {
    const res = await request(app).post('/api/usuarios').send({
      nome: 'Ana Beatriz',
      email: 'ana@teste.com',
      senha: 'minhasenha123',
    });

    expect(res.status).toBe(201);
    usuarioId = res.body.id;
    expect(usuarioId).toEqual(expect.any(Number));
  });

  it('POST /api/resenhas cria a resenha vinculada ao livro salvo e ao usuário', async () => {
    const res = await request(app)
      .post('/api/resenhas')
      .send({
        livroId,
        usuarioId,
        nota: 4.5,
        texto: 'Uma obra-prima da literatura brasileira, leitura obrigatória.',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ livroId, usuarioId, nota: 4.5 });
  });

  it('GET /api/livros/:livroId/resenhas lista a resenha criada, com o nome do usuário', async () => {
    const res = await request(app).get(`/api/livros/${livroId}/resenhas`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].usuario_nome).toBe('Ana Beatriz');
    expect(Number(res.body[0].nota)).toBe(4.5);
  });
});
