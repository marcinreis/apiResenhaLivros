CREATE DATABASE IF NOT EXISTS api_resenhas_livros
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE api_resenhas_livros;

-- Tabela de resenhas
-- Livros não têm tabela própria: os dados vêm da API externa (Google Books ou Open Library)
-- e apenas um cache opcional é guardado aqui junto com a resenha
CREATE TABLE resenhas (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Referência ao livro na API externa (não há tabela própria de livros)
    livro_id_externo VARCHAR(100) NOT NULL,

    -- Cache opcional dos dados do livro, para evitar chamadas repetidas à API externa
    livro_titulo VARCHAR(255),
    livro_autor VARCHAR(255),
    livro_capa_url VARCHAR(500),

    -- Conteúdo da resenha
    texto TEXT NOT NULL,
    nota TINYINT UNSIGNED NOT NULL,

    -- Autor da resenha (sem autenticação por enquanto, apenas identificação livre)
    autor_resenha VARCHAR(150),

    -- Controle de datas
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

    -- Regra de negócio: nota entre 1 e 5
    CONSTRAINT chk_nota CHECK (nota BETWEEN 1 AND 5),

    -- Índice para acelerar a busca de resenhas por livro
    INDEX idx_livro_id_externo (livro_id_externo)
);