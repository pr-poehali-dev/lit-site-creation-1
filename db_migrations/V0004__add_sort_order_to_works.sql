ALTER TABLE works ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
UPDATE works SET sort_order = 0 WHERE sort_order IS NULL;