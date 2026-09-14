CREATE DATABASE IF NOT EXISTS api_resenhas_livros
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE api_resenhas_livros;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE livros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(100),
  titulo VARCHAR(255) NOT NULL,
  autores VARCHAR(255),
  isbn VARCHAR(20) UNIQUE,
  capa_url VARCHAR(500),
  sinopse TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resenhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  livro_id INT NOT NULL,
  usuario_id INT NOT NULL,
  nota DECIMAL(2,1) NOT NULL CHECK (nota >= 0 AND nota <= 5),
  texto TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices auxiliares para consultas frequentes
CREATE INDEX idx_resenhas_livro ON resenhas(livro_id);
CREATE INDEX idx_resenhas_usuario ON resenhas(usuario_id);