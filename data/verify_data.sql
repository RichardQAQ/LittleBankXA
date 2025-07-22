-- 验证各表数据行数
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users;
SELECT 'stocks' AS table_name, COUNT(*) AS row_count FROM stocks;
SELECT 'bonds' AS table_name, COUNT(*) AS row_count FROM bonds;
SELECT 'portfolio' AS table_name, COUNT(*) AS row_count FROM portfolio;