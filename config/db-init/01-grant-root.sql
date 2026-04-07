-- Grant root full privileges on the `ampdb` database for remote access
-- Note: this script runs only when the MariaDB data directory is initialized (first start).

-- 1) Give the root account full global privileges (create/drop/alter any DB/table, grant rights)
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'rootpass123' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- 2) Ensure the application user is limited to the single database `ampdb`
GRANT ALL PRIVILEGES ON ampdb.* TO 'ampuser'@'%' IDENTIFIED BY 'ampass456';
FLUSH PRIVILEGES;

-- Example: create a dev user for a single DB (uncomment if you want it created on init)
-- GRANT ALL PRIVILEGES ON `fb-test`.* TO 'user-test'@'%' IDENTIFIED BY 'user-test-pass';
-- FLUSH PRIVILEGES;

-- Notes:
-- - This file runs only on first initialization (when ./data is empty).
-- - For existing databases, run the equivalent GRANT statements manually via `docker compose exec db mysql ...`.
