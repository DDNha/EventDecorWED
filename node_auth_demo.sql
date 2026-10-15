CREATE DATABASE node_auth_demo;

USE node_auth_demo;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL unique,
    email varchar(100) not null,
    password VARCHAR(255) NOT NULL
);

insert into users(username, email, password) value ('User', 'user@gmail.com', 'user');

CREATE TABLE partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    image VARCHAR(255),
    description TEXT,
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE specialties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE partner_specialties (
    partner_id INT NOT NULL,
    specialty_id INT NOT NULL,

    PRIMARY KEY (partner_id, specialty_id),

    FOREIGN KEY (partner_id)
        REFERENCES partners(id)
        ON DELETE CASCADE,

    FOREIGN KEY (specialty_id)
        REFERENCES specialties(id)
        ON DELETE CASCADE
);
INSERT INTO specialties (name)
VALUES
('Sinh Nhật'),
('Tiệc Cưới'),
('Year Party'),
('Khai Trương'),
('Thôi Nôi');
INSERT INTO partners
(name, image, description, address, phone, email)
VALUES
(
    'PartyDesign VN',
    '/img/partners/partydesn.png',
    'Đối tác tin cậy của nhiều thương hiệu lớn như Acer, Vietcombank, Pepsico',
    'TP. Hồ Chí Minh',
    '0901234567',
    'contact@partydesign.com'
),
(
    'HoaBinh Events',
    '/img/partners/hoabinh.png',
    'Đơn vị tổ chức hội nghị, sự kiện và du lịch (MICE) quy mô lớn trên toàn quốc.',
    'TP. Hồ Chí Minh',
    '0912345678',
    'info@hoabinh-events.com'
),
(
    'Á Châu Event',
    '/img/partners/achauevent.png',
    'Mạnh về tổ chức teambuilding, tiệc cuối năm (YEP) và sự kiện doanh nghiệp.',
    'Bình Dương',
    '0923456789',
    'contact@achauevent.com'
);
INSERT INTO partner_specialties (partner_id, specialty_id)
VALUES
(1, 1), 
(1, 3), 
(1, 5),
(2, 2), 
(2, 4),
(3, 3),
(3, 4);
CREATE TABLE employee_rated (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    image VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO employee_rated (name, image, description)
values
('Taylor Swift','/img/people_employee/avatar1.png', 'Môi trường làm việc vô cùng chuyên nghiệp và sáng tạo, đáp ứng hoàn hảo mọi quy mô sự kiện. Đội ngũ hỗ trợ nhiệt tình, giúp mọi khâu tổ chức diễn ra suôn sẻ.'),
('Sơn Tùng','/img/people_employee/avatar2.png','Dịch vụ tổ chức sự kiện rất ấn tượng, từ khâu lên ý tưởng đến trang trí đều được thực hiện chỉn chu. Tôi hoàn toàn hài lòng với chất lượng và sự chuyên nghiệp của đội ngũ.'),
('Thanh Hải','/img/people_employee/avatar3.png','Đội ngũ làm việc tận tâm, tư vấn rõ ràng và đáp ứng tốt các yêu cầu của khách hàng. Không gian sự kiện được trang trí đẹp mắt, chi phí hợp lý và đúng với mong đợi.')