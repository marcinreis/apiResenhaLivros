# API de Resenhas de Livros

API REST para busca de livros (via API externa) e cadastro de resenhas próprias.

## Objetivo

Permitir que usuários busquem livros e escrevam resenhas sobre eles, sem a necessidade de manter uma base própria de livros.

## Stack

- Node.js 18+ (testado no 24)
- Express 5
- MySQL (driver `mysql2`)
- `axios` para chamar a API externa de livros
- `bcryptjs` (hash de senha) e `jsonwebtoken` (autenticação JWT)
- `dotenv` para variáveis de ambiente
- Jest, Supertest e `mysql-memory-server` para os testes automatizados
- Postman / Newman para os testes das rotas

## Como rodar

1. Instale as dependências: `npm install`
2. Copie o `.env.example` para `.env` e preencha os valores (ver [Variáveis de ambiente](#variáveis-de-ambiente))
3. Com o MySQL rodando, execute o `database.sql` (**ele apaga e recria as tabelas**)
4. Suba o servidor: `npm start` (ou `npm run dev` para reiniciar a cada alteração)
5. Rode os testes: `npm test` (ver [Testes](#testes))

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o MySQL (`DB_NAME=api_resenhas_livros`) |
| `PORT` | Porta da API (padrão 3000) |
| `JWT_SECRET` | Chave secreta para assinar os tokens. Gere uma com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Validade do token (padrão `1d`) |
| `GOOGLE_BOOKS_API_KEY` | Opcional, mas recomendada (ver abaixo) |

## API externa de livros

Escolhida: **Google Books API** — https://developers.google.com/books

- **Busca por título/autor:** `GET https://www.googleapis.com/books/v1/volumes?q={termo}&maxResults=10`
- **Detalhes de um livro:** `GET https://www.googleapis.com/books/v1/volumes/{id}`
- **Campos aproveitados:** `id`, `volumeInfo.title`, `volumeInfo.authors`, `volumeInfo.imageLinks.thumbnail`, `volumeInfo.description` e `volumeInfo.industryIdentifiers` (ISBN-13, ou ISBN-10 se não houver o 13)
- **API key:** não é obrigatória, mas sem ela todas as requisições anônimas dividem uma cota global que costuma se esgotar (erro 429). Com uma key própria o limite padrão é de 1.000 requisições por dia. Para criar: Google Cloud Console → crie um projeto → ative a "Books API" → Credenciais → Criar chave de API.
- **Timeout:** 5 segundos por requisição.

A Google Books às vezes responde `503` por instabilidade passageira. Por isso, em erros 5xx ou timeout, a chamada é repetida até 2 vezes (com 500 ms de intervalo). Se continuar falhando, ou se a cota acabar (`429`), a API responde `503` com uma mensagem explicando. Outras falhas da Google Books viram `502`.

## Regras de negócio

- A nota é um número **inteiro de 0 a 5** (estrelas).
- A **média das notas** de um livro é um número decimal (ex: `3.5`), com até 2 casas, devolvida em `GET /livros/:id/resenhas`.
- O texto da resenha tem entre 10 e 2000 caracteres.
- Cada usuário pode ter **apenas uma resenha por livro** (outros usuários podem resenhar o mesmo livro).
- Criar, editar e excluir resenhas exige **autenticação** (usuário e senha → token JWT).
- Só o autor pode editar ou excluir a própria resenha.
- Usuário: de 3 a 50 caracteres (letras, números, `_` ou `.`). Senha: no mínimo 6 caracteres, guardada com hash bcrypt.

## Modelagem do banco

Não existe tabela de livros. Ao criar uma resenha, a API busca o livro na Google Books para confirmar que ele existe e guarda título, autor e capa **em cache** na própria resenha, para que as listagens não dependam da API externa. Os detalhes completos (`GET /livros/:id`) são sempre buscados em tempo real.

### Tabela `usuarios`
- id (PK)
- usuario (único)
- senha_hash
- criado_em

### Tabela `resenhas`
- id (PK)
- usuario_id (FK → usuarios)
- livro_id_externo (ID do livro na Google Books)
- livro_titulo, livro_autor, livro_capa_url (cache)
- nota (0 a 5)
- texto
- criado_em
- atualizado_em
- Único: (`usuario_id`, `livro_id_externo`)

## Rotas

Todas as rotas têm o prefixo `/api`. Rotas com 🔒 exigem o header `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /auth/registrar | Cadastra um usuário |
| POST | /auth/login | Faz login e devolve o token |
| GET | /livros?busca= | Busca livros na API externa |
| GET | /livros/:id | Detalhes de um livro (via API externa) |
| GET | /livros/:id/resenhas | Lista resenhas de um livro, com a média das notas |
| POST | /livros/:id/resenhas 🔒 | Cria uma resenha para um livro |
| GET | /resenhas | Lista todas as resenhas |
| GET | /resenhas/:id | Detalhes de uma resenha |
| PUT | /resenhas/:id 🔒 | Edita uma resenha (só o autor) |
| DELETE | /resenhas/:id 🔒 | Exclui uma resenha (só o autor) |

### Exemplos

**Registrar** — `POST /api/auth/registrar`
```json
{ "usuario": "maria", "senha": "senha123" }
```
Resposta `201`: `{ "id": 1, "usuario": "maria" }`

**Login** — `POST /api/auth/login` (mesmo corpo)
Resposta `200`:
```json
{ "token": "eyJhbGciOi...", "usuario": { "id": 1, "usuario": "maria" } }
```

**Buscar livros** — `GET /api/livros?busca=dom casmurro`
```json
[
  {
    "id": "aBcD1234",
    "titulo": "Dom Casmurro",
    "autores": "Machado de Assis",
    "isbn": "9788525406958",
    "capaUrl": "http://books.google.com/...",
    "sinopse": "..."
  }
]
```

**Criar resenha** — `POST /api/livros/aBcD1234/resenhas` 🔒
```json
{ "nota": 4, "texto": "Um livro muito bom de ler." }
```
Resposta `201`:
```json
{
  "id": 10,
  "livro": { "id": "aBcD1234", "titulo": "Dom Casmurro", "autores": "Machado de Assis", "capaUrl": "http://..." },
  "usuario": { "id": 1, "usuario": "maria" },
  "nota": 4,
  "texto": "Um livro muito bom de ler.",
  "criadoEm": "2026-10-28T12:00:00.000Z",
  "atualizadoEm": "2026-10-28T12:00:00.000Z"
}
```

**Resenhas de um livro** — `GET /api/livros/aBcD1234/resenhas`
```json
{ "livroId": "aBcD1234", "mediaNotas": 3.5, "totalResenhas": 2, "resenhas": [ ... ] }
```
Sem resenhas, `mediaNotas` vem `null` e `totalResenhas` vem `0`.

**Editar resenha** — `PUT /api/resenhas/10` 🔒 (mesmo corpo da criação; nota e texto são obrigatórios)

**Excluir resenha** — `DELETE /api/resenhas/10` 🔒 → `204` sem corpo

### Erros

Todos os erros seguem o formato `{ "erro": "mensagem" }`.

| Status | Quando |
|--------|--------|
| 400 | Dados inválidos (nota, texto, usuário, senha, JSON malformado, busca vazia) |
| 401 | Token ausente, inválido ou expirado; usuário ou senha incorretos |
| 403 | Tentativa de editar/excluir resenha de outro usuário |
| 404 | Livro, resenha ou rota não encontrados |
| 409 | Usuário já cadastrado; usuário já resenhou este livro |
| 502 | Falha na API externa de livros |
| 503 | API externa de livros indisponível ou com a cota esgotada |
| 500 | Erro interno (detalhes só no log do servidor) |

Os controllers usam `try/catch` e repassam os erros com `next(erro)` para o middleware `errorHandler`, que decide o status.

## Testes

| Comando | O que roda | Precisa de |
|---------|------------|------------|
| `npm test` | Testes unitários (services) e de integração (rotas via supertest, com banco e Google Books mockados) | Nada |
| `npm run test:e2e` | Fluxo completo contra um MySQL real e temporário (`mysql-memory-server`), com a Google Books simulada | Nada (baixa o MySQL na primeira execução) |
| `npm run test:postman` | Coleção do Postman via Newman, contra o servidor rodando | Servidor no ar, MySQL e `.env` configurados |

A coleção `postman/apiResenhaLivros.postman_collection.json` cobre todas as rotas, com testes automáticos (casos de sucesso e de erro). Ela cria usuários com nomes únicos a cada execução e apaga as resenhas que criou. No Postman: Import → selecione o arquivo → abra a coleção → Run (execute em ordem).

Para testar manualmente com `curl`, veja [docs/teste-manual-com-mysql.md](docs/teste-manual-com-mysql.md) e [docs/teste-manual-sem-mysql.md](docs/teste-manual-sem-mysql.md).

## Status

- [x] Escolher a API externa de livros (Google Books)
- [x] Modelar e criar as tabelas
- [x] Rotas de busca de livros (proxy)
- [x] CRUD de resenhas
- [x] Validação de entrada
- [x] Autenticação
- [x] Testes automatizados (unitários, integração e e2e com MySQL real)
- [x] Coleção de testes do Postman
- [x] Documentação dos endpoints
- [ ] Executar a coleção do Postman com MySQL e API key configurados
