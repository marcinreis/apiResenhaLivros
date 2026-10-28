# Testando a API manualmente com MySQL real (instalado na máquina)

Este guia mostra como configurar um MySQL de verdade, instalado localmente via
Homebrew (macOS), e usá-lo para rodar e testar a API com `curl`. No Windows,
instale pelo [MySQL Installer](https://dev.mysql.com/downloads/installer/) e
inicie o serviço com `net start MySQL80` (o nome pode variar conforme a versão);
os passos 2 em diante são iguais. Diferente do
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
que cria o banco `api_resenhas_livros` e as tabelas `usuarios` e `resenhas`
(**apagando-as antes, se já existirem**).

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
JWT_SECRET=uma-string-aleatoria-longa
JWT_EXPIRES_IN=1d
GOOGLE_BOOKS_API_KEY=
```

Para gerar o `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
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
curl -s "http://localhost:3000/api/livros?busca=dom+casmurro"
# anote o "id" de um dos livros, ex: OFbxLdwPhU8C

# Criar usuário e fazer login
curl -s -X POST http://localhost:3000/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"usuario":"ana","senha":"minhasenha123"}'

curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"ana","senha":"minhasenha123"}'
# copie o "token" da resposta
TOKEN="cole-o-token-aqui"

# Criar resenha (nota inteira de 0 a 5)
curl -s -X POST http://localhost:3000/api/livros/OFbxLdwPhU8C/resenhas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nota":4,"texto":"Uma obra-prima da literatura brasileira."}'

# Listar resenhas do livro, com a média das notas
curl -s http://localhost:3000/api/livros/OFbxLdwPhU8C/resenhas
```

Para testar todas as rotas de uma vez, importe a coleção
`postman/apiResenhaLivros.postman_collection.json` no Postman ou rode
`npm run test:postman` com o servidor no ar.

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

- **As rotas de livros podem retornar `503`.** Sem `GOOGLE_BOOKS_API_KEY`, a
  Google Books usa uma cota anônima compartilhada que costuma se esgotar; nesse
  caso a API devolve `503` com uma mensagem explicando. Não é um bug do
  projeto — veja a nota sobre isso no
  [README.md](../README.md#api-externa-de-livros). Criar resenha também
  consulta a Google Books (para validar o livro e guardar título/autor/capa).
- Se preferir não instalar nada de forma permanente na máquina, use o
  [teste com banco efêmero](teste-manual-sem-mysql.md) — mesmo roteiro de
  testes, mas o MySQL some assim que o processo do Node termina.
