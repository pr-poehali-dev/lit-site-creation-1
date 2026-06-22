CREATE TABLE t_p40885687_lit_site_creation_1.comments (
    id SERIAL PRIMARY KEY,
    work_id INTEGER NOT NULL,
    parent_id INTEGER,
    author_name VARCHAR(100) NOT NULL DEFAULT 'Читатель',
    body TEXT NOT NULL,
    is_author BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);