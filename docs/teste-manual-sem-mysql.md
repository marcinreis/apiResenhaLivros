# Testando a API manualmente sem instalar MySQL

Este guia mostra como subir a API de verdade (Express + rotas + banco) para testar
manualmente com `curl`, sem precisar instalar ou configurar um MySQL na máquina.
Ele usa o pacote [`mysql-memory-server`](https://www.npmjs.com/package/mysql-memory-server)
(já presente em `devDependencies`) para criar um MySQL real e efêmero em segundos.

Útil para: validar o fluxo `buscar → salvar livro → criar usuário → criar resenha`
ponta a ponta, sem tocar no banco de desenvolvimento/produção e sem depender do
`.env`.

> Para testes automatizados equivalentes (que já existem no projeto), veja
> `tests/e2e/livrosFlow.e2e.test.js` e rode `npm run test:e2e`. Este guia é para
> quando você quer bater requisições manualmente e ver as respostas na hora.

## 1. Criar o script que sobe banco + servidor

Salve como `scripts/demo-server.js` (ou em qualquer pasta fora do controle de
versão, como `/tmp`):

```js
const fs = require('fs');
const path = require('path');
const { createDB } = require('mysql-memory-server');
const mysql = require('mysql2/promise');

const PROJECT_ROOT = path.join(__dirname, '..'); // ajuste se mover o arquivo de lugar

(async () => {
  // 1. Sobe um MySQL real e efêmero numa porta aleatória
  const memoryDb = await createDB({ dbName: 'api_resenhas_livros' });

  // 2. Define as env vars ANTES de importar o app — src/config/database.js
  //    cria o pool de conexão no momento em que é importado, lendo process.env
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(memoryDb.port);
  process.env.DB_USER = memoryDb.username;
  process.env.DB_PASSWORD = '';
  process.env.DB_NAME = memoryDb.dbName;
  process.env.PORT = process.env.PORT || '3000';

  // 3. Abre uma conexão à parte só para aplicar o schema
  const setupConnection = await mysql.createConnection({
    host: '127.0.0.1',
    port: memoryDb.port,
    user: memoryDb.username,
    password: '',
    database: memoryDb.dbName,
    multipleStatements: true,
  });

  // 4. database.sql tem "CREATE DATABASE" e "USE" — o mysql-memory-server já
  //    criou o banco (dbName acima), então essas linhas são removidas antes
  //    de rodar o resto do schema
  const schema = fs
    .readFileSync(path.join(PROJECT_ROOT, 'database.sql'), 'utf8')
    .replace(/CREATE DATABASE[\s\S]*?;/i, '')
    .replace(/USE\s+\S+;/i, '');
  await setupConnection.query(schema);
  await setupConnection.end();

  // 5. Só agora importa o app de verdade, com as env vars já corretas
  const app = require(path.join(PROJECT_ROOT, 'src/app'));
  app.listen(process.env.PORT, () => {
    console.log(`Demo server pronto em http://localhost:${process.env.PORT}`);
  });
})();
```

## 2. Rodar o script em background

```bash
node scripts/demo-server.js > /tmp/demo-server.log 2>&1 &
```

O `createDB()` baixa o binário do MySQL na primeira execução (fica em cache
depois disso) e pode levar de alguns segundos a ~30s. Acompanhe com:

```bash
tail -f /tmp/demo-server.log
# espere a linha "Demo server pronto em http://localhost:3000"
```

## 3. Testar os endpoints com curl

```bash
# Health check
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

## 4. Encerrar e limpar

```bash
lsof -ti:3000 | xargs kill
```

O banco MySQL efêmero é derrubado automaticamente quando o processo do Node
termina — não deixa nada residente no sistema.

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
  reconsultar o banco. Se algum consumidor da API fizer conta em cima desse
  campo, é preciso converter (`Number(...)`) antes.
- **Se a primeira requisição após subir o servidor falhar com `500`** sem
  nada de útil no log, tente de novo — foi observado ao menos uma vez uma
  falha transitória na primeira conexão do pool `mysql2` contra o banco
  efêmero recém-criado, que não se repetiu nas tentativas seguintes.
