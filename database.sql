CREATE DATABASE IF NOT EXISTS api_resenhas_livros
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE api_resenhas_livros;

-- Recria as tabelas do zero (apaga os dados existentes)
DROP TABLE IF EXISTS resenhas;
DROP TABLE IF EXISTS livros;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Os livros não têm tabela própria: vêm da Google Books API.
-- Título, autor e capa ficam em cache na resenha para não depender da API nas listagens.
CREATE TABLE resenhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  livro_id_externo VARCHAR(100) NOT NULL,
  livro_titulo VARCHAR(255),
  livro_autor VARCHAR(255),
  livro_capa_url VARCHAR(500),
  nota TINYINT NOT NULL CHECK (nota >= 0 AND nota <= 5),
  texto TEXT NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Cada usuário só pode ter uma resenha por livro
  UNIQUE KEY uq_resenha_usuario_livro (usuario_id, livro_id_externo),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índice auxiliar para listar resenhas de um livro
CREATE INDEX idx_resenhas_livro ON resenhas(livro_id_externo);
