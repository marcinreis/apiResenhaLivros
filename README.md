# API de Resenhas de Livros

API REST (somente backend, sem interface) para buscar livros em uma base externa (Google Books) e permitir que usuários cadastrem, editem e excluam resenhas próprias sobre esses livros.

## Objetivo

Permitir que usuários busquem livros e escrevam resenhas sobre eles, sem a necessidade de manter uma base própria de livros digitada manualmente — os dados do livro vêm da API externa e são apenas armazenados em cache local quando alguém resenha aquele livro pela primeira vez.

## Stack

- **Node.js** + **Express 5** — servidor HTTP e rotas
- **MySQL** (via `mysql2/promise`) — persistência de usuários, livros (cache) e resenhas
- **axios** — integração com a API externa de livros
- **dotenv** — variáveis de ambiente
- **Jest** + **Supertest** — testes automatizados

## API externa de livros

Usamos a **Google Books API** (`https://www.googleapis.com/books/v1/volumes`), que é pública e não exige API key para buscas simples.

Campos aproveitados de cada resultado: `id` (googleId), `title`, `authors`, `industryIdentifiers` (ISBN-13 com fallback para ISBN-10), `imageLinks.thumbnail` (capa) e `description` (sinopse).

> Limite conhecido: a Google Books API tem uma cota diária de consultas por IP/projeto. Se você receber `502` no `/livros/buscar`, é provável que a cota tenha sido excedida — o erro é da API externa, não do nosso código (ele já trata a falha e devolve uma resposta controlada em vez de quebrar).

## Arquitetura e fluxo de uso

Diferente do plano inicial (proxy puro, sem tabela própria de livros), o projeto guarda um **cache local mínimo do livro** assim que ele é escolhido para receber uma resenha. Isso é necessário porque uma resenha, no banco, referencia um `livro_id` local (chave estrangeira) — não teria como vincular uma resenha a um ID que só existe na Google Books.

Fluxo esperado ao consumir a API:

1. `GET /api/livros/buscar?termo=...` — busca na Google Books (nada é salvo ainda).
2. Usuário escolhe um resultado e chama `POST /api/livros` com os dados desse resultado — o livro é salvo localmente (ou reaproveitado, se já existir por ISBN/googleId) e um `id` local é retornado.
3. `POST /api/usuarios` — cria o usuário que vai escrever a resenha (uma vez só).
4. `POST /api/resenhas` — usa o `id` local do livro (passo 2) e o `id` do usuário (passo 3) para criar a resenha.

## Modelagem do banco

Ver [`database.sql`](database.sql). Três tabelas:

- **usuarios** — `id, nome, email (único), senha_hash, criado_em`
- **livros** — cache local: `id, google_id, titulo, autores, isbn (único), capa_url, sinopse, criado_em`
- **resenhas** — `id, livro_id (FK), usuario_id (FK), nota (0–5), texto, criado_em, atualizado_em`

## Configuração e execução

```bash
npm install
cp .env.example .env   # preencha DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
mysql -u root -p < database.sql   # cria o banco e as tabelas
npm run dev             # ou: npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`). `GET /` é um health check simples que não depende do banco.

### Testes

```bash
npm test
```

Cobre a camada de regras de negócio (services) com o banco mockado — validação de nota, textos, IDs, checagem de existência de livro/usuário/resenha (404), duplicidade de e-mail (409), hashing de senha, mapeamento da resposta da Google Books e tratamento de falha da API externa (502) — além de um teste de integração HTTP (Express + Supertest) validando os principais casos de erro (400/404) ponta a ponta pelas rotas.

> **Nota sobre o ambiente onde isto foi desenvolvido**: não havia um servidor MySQL disponível para testar as rotas que gravam/leem do banco de ponta a ponta contra um banco real — por isso os testes automatizados mockam a camada de banco (`src/config/database.js`) e cobrem a lógica de negócio isoladamente. Antes de considerar o CRUD 100% validado, rode manualmente contra um MySQL real (veja a seção "Como validar" mais abaixo).

## Endpoints

Todas as rotas abaixo têm prefixo `/api`. Erros seguem sempre o formato `{ "erro": "mensagem" }` com o status HTTP apropriado (`400` validação, `404` não encontrado, `409` conflito/duplicado, `502` falha da API externa, `500` erro interno).

### Livros

| Método | Rota | Descrição | Body |
|--------|------|-----------|------|
| GET | `/livros/buscar?termo=` | Busca livros na Google Books (não salva) | — |
| POST | `/livros` | Salva (ou reaproveita) um livro escolhido | `{ googleId, titulo, autores, isbn, capaUrl, sinopse }` |
| GET | `/livros/:id` | Detalhes de um livro salvo localmente | — |
| GET | `/livros/:livroId/resenhas` | Lista as resenhas de um livro | — |

### Resenhas

| Método | Rota | Descrição | Body |
|--------|------|-----------|------|
| POST | `/resenhas` | Cria uma resenha | `{ livroId, usuarioId, nota, texto }` |
| GET | `/resenhas` | Lista todas as resenhas | — |
| GET | `/resenhas/:id` | Detalhes de uma resenha | — |
| PUT | `/resenhas/:id` | Edita uma resenha (nota e texto) | `{ nota, texto }` |
| DELETE | `/resenhas/:id` | Exclui uma resenha | — |

### Usuários

| Método | Rota | Descrição | Body |
|--------|------|-----------|------|
| POST | `/usuarios` | Cria um usuário | `{ nome, email, senha }` |
| GET | `/usuarios/:id` | Detalhes de um usuário (sem a senha) | — |
| GET | `/usuarios/:usuarioId/resenhas` | Lista as resenhas de um usuário | — |

### Exemplos rápidos (curl)

```bash
# 1. Buscar livros na Google Books
curl "http://localhost:3000/api/livros/buscar?termo=dom+casmurro"

# 2. Salvar o livro escolhido (usar os campos retornados na busca)
curl -X POST http://localhost:3000/api/livros \
  -H "Content-Type: application/json" \
  -d '{"googleId":"abc123","titulo":"Dom Casmurro","autores":"Machado de Assis","isbn":"9781234567897","capaUrl":"http://...","sinopse":"..."}'

# 3. Criar um usuário
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@teste.com","senha":"minhasenha123"}'

# 4. Criar a resenha (livroId e usuarioId vêm das respostas acima)
curl -X POST http://localhost:3000/api/resenhas \
  -H "Content-Type: application/json" \
  -d '{"livroId":1,"usuarioId":1,"nota":4.5,"texto":"Excelente leitura, recomendo bastante."}'

# 5. Listar resenhas de um livro
curl http://localhost:3000/api/livros/1/resenhas
```

## Regras de negócio implementadas

- Nota deve ser um número entre 0 e 5 (aceita casas decimais, ex.: 4.5).
- Texto da resenha: mínimo 10, máximo 2000 caracteres.
- Criar resenha exige `livroId` e `usuarioId` de registros existentes (senão `404`).
- E-mail de usuário é único (`409` se já cadastrado) e validado por formato.
- Senha de usuário: mínimo 6 caracteres; armazenada com hash + salt (nunca em texto puro).
- Atualizar/excluir uma resenha inexistente retorna `404` (antes disso, o `UPDATE`/`DELETE` rodava silenciosamente mesmo sem afetar nenhuma linha).
- Livro salvo é reaproveitado por ISBN ou, na ausência dele, por `googleId` — evita duplicar o mesmo livro no cache local.

## Decisões tomadas ao completar o projeto

Estes eram pontos em aberto no README original; seguem as decisões e o porquê:

- **Sem autenticação/login.** O `usuarioId` é passado diretamente no corpo da requisição. O README já listava autenticação como opcional/a definir; como o pedido foi concluir o CRUD principal, ela ficou fora do escopo. Para evoluir isso depois: adicionar login (JWT, por exemplo) e passar a extrair `usuarioId` do token em vez do body.
- **Hash de senha com `crypto.scryptSync` (nativo do Node)**, em vez de bcrypt/bcryptjs, para não adicionar dependência extra — é seguro (salt aleatório por usuário) e suficiente para o escopo atual.
- **Um usuário pode ter mais de uma resenha para o mesmo livro.** Não havia restrição de unicidade pedida, então não foi adicionada.
- **Erros centralizados**: os `services` lançam um `AppError` (`src/utils/appError.js`) com mensagem + status HTTP, e os controllers (usando `src/utils/asyncHandler.js`) apenas repassam para o middleware de erro (`src/middlewares/errorHandler.js`), que decide a resposta. Antes, cada controller tratava erro por conta própria e vários deles escondiam a causa real atrás de um `500` genérico.

## Estrutura do projeto

```
src/
  config/database.js       # pool de conexão MySQL
  controllers/             # recebem a requisição e chamam o service
  services/                # regras de negócio
  models/                  # acesso ao banco (SQL)
  middlewares/             # validação de entrada + tratamento de erro
  routes/routes.js         # todas as rotas, montadas em /api
  utils/                   # AppError, asyncHandler, validarId
tests/
  unit/                    # services com models/axios mockados
  integration/             # rotas HTTP via supertest, banco mockado
database.sql               # schema do banco
```

## Próximos passos (fora do escopo atual)

- [ ] Autenticação (JWT) e extrair `usuarioId` do token
- [ ] Paginação em `GET /resenhas` e `GET /livros/buscar`
- [ ] Rate limiting nas rotas públicas
- [ ] Deploy (Docker + variáveis de ambiente de produção)
