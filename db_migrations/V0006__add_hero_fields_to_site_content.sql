INSERT INTO site_content (key, value) VALUES
  ('hero_title', 'Слова, которым нужна тишина, чтобы прозвучать'),
  ('hero_subtitle', 'Здесь живут мои стихи, рассказы, фантазии и эссе. Заходите без спешки — лучшее читается медленно.'),
  ('hero_label', 'Литературный дневник'),
  ('hero_photo', ''),
  ('hero_bg', '')
ON CONFLICT (key) DO NOTHING;