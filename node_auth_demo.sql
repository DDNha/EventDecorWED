CREATE DATABASE node_auth_demo;

USE node_auth_demo;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL unique,
    email varchar(100) not null,
    pass_word VARCHAR(255) NOT NULL
);

insert into users(username, email, pass_word) value ('User', 'user@gmail.com', 'user');
