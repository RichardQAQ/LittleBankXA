use mysql;
UPDATE user SET authentication_string=PASSWORD('123456') WHERE User='root';
FLUSH PRIVILEGES;exit;
