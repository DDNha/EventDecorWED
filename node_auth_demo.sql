CREATE DATABASE node_auth_demo;

USE node_auth_demo;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL unique,
    email varchar(100) not null,
    password VARCHAR(255) NOT NULL
);

insert into users(username, email, password) value ('User', 'user@gmail.com', 'user');

-- Bảng đơn hàng (phần đặt hàng). Cột theo schema trang admin quản lý đơn hàng.
-- current_status: created -> confirmed -> in_progress -> delivered
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_id VARCHAR(20) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    partner_name VARCHAR(255) NOT NULL,
    unit_price BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price BIGINT NOT NULL,
    color VARCHAR(50),
    event_date DATE NOT NULL,
    event_address VARCHAR(255) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    bank_account VARCHAR(30) NOT NULL,
    bank_holder VARCHAR(100) NOT NULL,
    note TEXT,
    current_status VARCHAR(20) NOT NULL DEFAULT 'created',
    timeline_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    timeline_confirmed DATETIME NULL,
    timeline_in_progress DATETIME NULL,
    timeline_delivered DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
