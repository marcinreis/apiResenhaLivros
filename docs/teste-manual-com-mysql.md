# Testando a API manualmente com MySQL real (instalado na máquina)

Este guia mostra como configurar um MySQL de verdade, instalado localmente via
Homebrew (macOS), e usá-lo para rodar e testar a API com `curl`. Diferente do
[teste com banco efêmero](teste-manual-sem-mysql.md), aqui o banco **persiste**
entre execuções — os dados continuam lá depois que você para o servidor, e o
serviço do MySQL fica disponível pra outros projetos também.

Use este caminho quando quiser um ambiente de desenvolvimento permanente, em
vez de só validar um fluxo pontualmente.

## 1. Instalar o MySQL

```bash
brew install mysql
```

Isso instala o MySQL mas **não inicia o serviço automaticamente**. Para
iniciar (e deixar rodando entre reboots):

```bash
brew services start mysql
```

Ou, para rodar só nesta sessão de terminal (sem registrar como serviço):

```bash
mysql.server start
```

Confirme que está rodando:

```bash
mysqladmin ping
# → mysqld is alive
```

> Por padrão, o `brew install mysql` cria o usuário `root` sem senha. Se
> quiser reforçar a segurança (recomendado fora de uma máquina de
> desenvolvimento pessoal), rode `mysql_secure_installation` e defina uma
> senha para o `root`.

## 2. Criar o banco e as tabelas

Na raiz do projeto:

```bash
mysql -u root -p < database.sql
```

Se o `root` não tiver senha (padrão do Homebrew), omita o `-p` ou pressione
Enter quando pedir a senha. Isso executa o [`database.sql`](../database.sql),
que cria o banco `api_resenhas_livros` e as tabelas `usuarios`, `livros` e
`resenhas`.

Para conferir que deu certo:

```bash
mysql -u root -p -e "USE api_resenhas_livros; SHOW TABLES;"
```

## 3. Configurar o `.env`

```bash
cp .env.example .env
```

Edite o `.env` com os dados da instalação local (valores padrão do Homebrew,
ajuste se você configurou senha ou outra porta):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=api_resenhas_livros
PORT=3000
```

## 4. Subir o servidor

```bash
npm run dev    # reinicia sozinho a cada mudança de código (node --watch)
# ou
npm start
```

Deve aparecer `Servidor rodando na porta 3000`. Se aparecer erro de conexão
com o banco (`ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR` etc.), revise o passo 1
(serviço rodando?) e o passo 3 (credenciais no `.env`).

## 5. Testar os endpoints com curl

```bash
# Health check (não depende do banco)
curl -s http://localhost:3000/

# Buscar na Google Books (depende de rede + cota da API externa)
curl -s "http://localhost:3000/api/livros/buscar?termo=dom+casmurro"

# Salvar o livro escolhido (registra o googleId no banco)
curl -s -X POST http://localhost:3000/api/livros \
  -H "Content-Type: application/json" \
  -d '{"googleId":"OFbxLdwPhU8C","titulo":"Dom Casmurro","autores":"Machado de Assis","isbn":"9788535910663","capaUrl":"http://...","sinopse":"..."}'

# Criar usuário
curl -s -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana Beatriz","email":"ana@teste.com","senha":"minhasenha123"}'

# Criar resenha (use os ids retornados acima)
curl -s -X POST http://localhost:3000/api/resenhas \
  -H "Content-Type: application/json" \
  -d '{"livroId":1,"usuarioId":1,"nota":4.5,"texto":"Uma obra-prima da literatura brasileira."}'

# Listar resenhas do livro
curl -s http://localhost:3000/api/livros/1/resenhas
```

## 6. Resetar os dados (opcional)

Como o banco é persistente, os dados dos testes acima ficam salvos. Para
zerar tudo e recomeçar do zero:

```bash
mysql -u root -p -e "DROP DATABASE api_resenhas_livros;"
mysql -u root -p < database.sql
```

## 7. Parar/remover o MySQL

Parar o serviço:

```bash
brew services stop mysql
# ou, se tiver iniciado com mysql.server:
mysql.server stop
```

Desinstalar completamente (remove também os dados, cuidado se tiver outros
bancos além deste projeto):

```bash
brew uninstall mysql
rm -rf /opt/homebrew/var/mysql   # dados do MySQL no Apple Silicon
# em Mac Intel, o caminho costuma ser /usr/local/var/mysql
```

## Observações

- **`GET /livros/buscar` pode retornar `502`.** A Google Books API tem cota
  diária compartilhada por IP; se ela estourar, a rota devolve
  `{"erro":"Falha ao consultar a API externa de livros (Google Books)"}` em
  vez de quebrar. Não é um bug do projeto — veja a nota sobre isso no
  [README.md](../README.md#api-externa-de-livros).
- **Listagens (`GET /.../resenhas`) devolvem `nota` como string** (ex.:
  `"4.5"`), não como número — é o comportamento padrão do driver `mysql2`
  para colunas `DECIMAL`. O `POST /resenhas`, por outro lado, devolve `nota`
  como número, porque a resposta é montada em memória pelo service, sem
  reconsultar o banco.
- Se preferir não instalar nada de forma permanente na máquina, use o
  [teste com banco efêmero](teste-manual-sem-mysql.md) — mesmo roteiro de
  testes, mas o MySQL some assim que o processo do Node termina.
