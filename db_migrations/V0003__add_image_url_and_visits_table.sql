ALTER TABLE t_p40885687_lit_site_creation_1.works ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS t_p40885687_lit_site_creation_1.visits (
  id serial PRIMARY KEY,
  visited_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip text NOT NULL DEFAULT ''
);