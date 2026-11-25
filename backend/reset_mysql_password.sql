-- Run this in MySQL Workbench to set a new password for root
-- Then update backend/.env with the new password

-- Option 1: Set password to 'dataflow123'
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'dataflow123';
FLUSH PRIVILEGES;

-- Option 2: Create a dedicated user instead
CREATE USER IF NOT EXISTS 'dataflow_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'dataflow123';
CREATE DATABASE IF NOT EXISTS dataflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON dataflow_db.* TO 'dataflow_user'@'localhost';
FLUSH PRIVILEGES;
