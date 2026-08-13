# apiResenhaLivros
# API de Resenhas de Livros

API REST para busca de livros (via API externa) e cadastro de resenhas próprias.

## Objetivo

Permitir que usuários busquem livros e escrevam resenhas sobre eles, sem a necessidade de manter uma base própria de livros.

## Stack 

- A decidir

## API externa de livros

Usar uma API pública para buscar dados de livros, sem manter uma tabela própria de livros.

Opções:
- **Google Books API** — https://developers.google.com/books
- **Open Library API** — https://openlibrary.org/developers/api

Definir qual será usada e documentar:
- Endpoint de busca por título/autor
- Campos retornados que serão aproveitados (id, título, autor, capa, sinopse, ISBN)
- Se há necessidade de API key
- Rate limits

## Escopo do CRUD

### Livros (somente leitura, via API externa — sem tabela própria)
- [ ] Buscar livros por título/autor (proxy para a API externa)
- [ ] Buscar detalhes de um livro específico pelo ID externo

### Resenhas (CRUD completo, no banco próprio)
- [ ] Criar resenha vinculada a um livro (armazenar o ID externo do livro)
- [ ] Listar resenhas de um livro específico
- [ ] Listar todas as resenhas
- [ ] Buscar uma resenha específica pelo ID
- [ ] Editar uma resenha
- [ ] Excluir uma resenha

## Modelagem do banco (a definir)

### Tabela `resenhas`
- id (PK)
- livro_id_externo (ID do livro na API externa)
- livro_titulo (cache opcional, para não depender da API externa em toda listagem)
- livro_autor (cache opcional)
- livro_capa_url (cache opcional)
- texto
- nota
- autor_resenha (se houver autenticação)
- criado_em
- atualizado_em

> Definir se haverá cache de dados do livro (campos acima) ou se a busca de detalhes será sempre em tempo real via API externa.

## Rotas planejadas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /livros?busca= | Busca livros na API externa |
| GET | /livros/:id | Detalhes de um livro (via API externa) |
| GET | /livros/:id/resenhas | Lista resenhas de um livro |
| POST | /livros/:id/resenhas | Cria uma resenha para um livro |
| GET | /resenhas | Lista todas as resenhas |
| GET | /resenhas/:id | Detalhes de uma resenha |
| PUT | /resenhas/:id | Edita uma resenha |
| DELETE | /resenhas/:id | Exclui uma resenha |

## Regras de negócio a definir

- [ ] Nota mínima e máxima (ex: 1 a 5)
- [ ] Tamanho mínimo/máximo do texto da resenha
- [ ] Autenticação necessária para criar/editar/excluir resenha?
- [ ] Um usuário pode ter mais de uma resenha para o mesmo livro?

## Próximos passos

1. Escolher e testar a API externa de livros (Google Books ou Open Library)
2. Modelar e criar a tabela de resenhas no banco
3. Implementar as rotas de busca de livros (proxy)
4. Implementar o CRUD de resenhas
5. Adicionar validação de entrada
6. (Opcional) Adicionar autenticação
7. Testar todas as rotas (Postman/Insomnia)
8. Documentar endpoints
