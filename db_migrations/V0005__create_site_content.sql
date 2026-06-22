CREATE TABLE IF NOT EXISTS site_content (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

INSERT INTO site_content (key, value) VALUES
  ('author_name', 'Имя Фамилия'),
  ('author_bio', 'Расскажите о себе...'),
  ('author_photo', ''),
  ('contacts_email', ''),
  ('contacts_phone', ''),
  ('contacts_social', ''),
  ('contacts_text', ''),
  ('announcements', '[{"date":"20 июня","tag":"Встреча","text":"Творческий вечер в книжном клубе «Абзац»."}]'),
  ('books', '[{"title":"Название книги","year":"2024","type":"Сборник стихов","status":"В продаже","cover":"","link":""}]')
ON CONFLICT (key) DO NOTHING;