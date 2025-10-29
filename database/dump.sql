-- Удаляем старые таблицы если существуют
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS telegram_links CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Создаем таблицы с PostgreSQL синтаксисом
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'client' CHECK(role IN ('client', 'admin')),
    telegram_id VARCHAR(100) UNIQUE,
    telegram_username VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    comment TEXT,
    telegram_notification BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    booking_id INTEGER,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telegram_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    link_code VARCHAR(10) NOT NULL UNIQUE,
    telegram_id VARCHAR(100),
    telegram_username VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Вставляем данные
INSERT INTO services ("id","name","category","description","price","duration","is_active","created_at") VALUES 
(1,'Ультразвуковая чистка лица','Чистка лица','Глубокая очистка пор с помощью ультразвука',1800,60,true,'2025-10-26 19:17:30'),
(2,'Комбинированная чистка лица','Чистка лица','Комплексная чистка с ручной и аппаратной обработкой',2500,90,true,'2025-10-26 19:17:30'),
(3,'Массаж лица комбинированный','Массаж лица','Расслабляющий и тонизирующий массаж',1500,45,true,'2025-10-26 19:17:30'),
(4,'S-уход','Уход лица с массажем','Базовый уход за кожей лица',1500,45,true,'2025-10-26 19:17:30'),
(41,'M-уход','Уход лица с массажем','Продвинутый уход за кожей лица',2000,60,true,'2025-10-26 19:41:28'),
(42,'L-уход','Уход лица с массажем','Премиальный уход за кожей лица',2700,90,true,'2025-10-26 19:41:28'),
(49,'Комбинированная чистка лица + микротоки','Чистка лица','Комплексная чистка с микротоками для тонизирования кожи',3000,120,true,'2025-10-26 23:40:40'),
(50,'Массаж лица французский','Массаж лица','Французская техника массажа для омоложения',2000,60,true,'2025-10-26 23:40:40'),
(51,'XL-уход','Уход лица с массажем','Экстра-уход с интенсивным воздействием',3200,120,true,'2025-10-26 23:40:40'),
(52,'XXI-уход','Уход лица с массажем','Эксклюзивный уход премиум-класса',3500,140,true,'2025-10-26 23:40:40'),
(53,'Карбокситерапия','Уход лица без массажа','Терапия углекислым газом для улучшения кровообращения',2000,45,true,'2025-10-26 23:40:40'),
(54,'Дермален','Уход лица без массажа','Профессиональный уход Дермален',2000,60,true,'2025-10-26 23:40:40'),
(55,'Коллаген-актив','Уход лица без массажа','Активация выработки коллагена',2000,60,true,'2025-10-26 23:40:40'),
(56,'Маска Афродиты','Уход лица без массажа','Эксклюзивная омолаживающая маска',2500,60,true,'2025-10-26 23:40:40'),
(57,'Пилинг (миндальный, джесснера, гликолевый)','Пилинги','Профессиональный пилинг на выбор: миндальный, джесснера или гликолевый',2000,45,true,'2025-10-26 23:40:40'),
(58,'RF-лифтинг','Аппаратная косметология','Радиочастотный лифтинг для подтяжки кожи',2500,60,true,'2025-10-26 23:40:40'),
(59,'RF-лифтинг игольчатый','Аппаратная косметология','Игольчатый радиочастотный лифтинг',10000,60,true,'2025-10-26 23:40:40'),
(60,'Микротоки (30 мин)','Микротоки','Микротоковая терапия для тонизирования мышц',1500,30,true,'2025-10-26 23:40:40'),
(61,'Микротоки (45 мин)','Микротоки','Продолжительная микротоковая терапия',2000,45,true,'2025-10-26 23:40:40'),
(62,'Вдовий горб','Микротоки','Коррекция вдовьего горба микротоками',1000,30,true,'2025-10-26 23:40:40'),
(63,'Окрашивание бровей/ресниц','Оформление бровей, ресниц','Профессиональное окрашивание бровей или ресниц',500,30,true,'2025-10-26 23:40:40'),
(64,'Коррекция воском/пинцетом','Оформление бровей, ресниц','Коррекция формы бровей воском или пинцетом',500,30,true,'2025-10-26 23:40:40'),
(65,'Ламинирование ресниц/бровей','Оформление бровей, ресниц','Ламинирование для ухоженного вида',2000,60,true,'2025-10-26 23:40:40'),
(66,'Бикини глубокая','Депиляция','Глубокая зона бикини',1300,30,true,'2025-10-26 23:40:40'),
(67,'Бикини классика','Депиляция','Классическая зона бикини',1000,30,true,'2025-10-26 23:40:40'),
(68,'Подмышки','Депиляция','Депиляция подмышечных впадин',500,20,true,'2025-10-26 23:40:40'),
(69,'Руки полностью','Депиляция','Полная депиляция рук',1200,45,true,'2025-10-26 23:40:40'),
(70,'Ноги полностью','Депиляция','Полная депиляция ног',1500,60,true,'2025-10-26 23:40:40'),
(71,'Комплекс','Депиляция','Комплексная депиляция',3000,120,true,'2025-10-26 23:40:40'),
(72,'Мезотерапия','Мезотерапия/Биоревитализация/Ботокс','Инъекционная мезотерапия',3500,60,true,'2025-10-26 23:40:40'),
(73,'Биоревитализация','Мезотерапия/Биоревитализация/Ботокс','Биоревитализация для омоложения',5000,60,true,'2025-10-26 23:40:40'),
(74,'Ботокс','Мезотерапия/Биоревитализация/Ботокс','Ботокс-терапия от 2000 руб',2000,45,true,'2025-10-26 23:40:40'),
(75,'Консультация косметолога','Консультация','Первичная консультация специалиста',0,30,true,'2025-10-29 21:04:00'),
(76,'Чистка лица','Уходовые процедуры','Профессиональная чистка лица',3000,60,true,'2025-10-29 21:04:00'),
(77,'Ботокс','Инъекции','Коррекция морщин ботулотоксином',15000,45,true,'2025-10-29 21:04:00'),
(78,'Биоревитализация','Инъекции','Увлажнение и омоложение кожи',12000,60,true,'2025-10-29 21:04:00'),
(79,'Пилинг','Уходовые процедуры','Химический пилинг',5000,45,true,'2025-10-29 21:04:00');

INSERT INTO users ("id","email","phone","password_hash","name","surname","role","telegram_id","telegram_username","is_active","created_at","updated_at") VALUES 
(19,'StIrin-ka@yandex.ru','+79254439529','$2a$10$Kh1q3rYWF9.5ZT7OIBWwGeB.UDEYbArYDktSJt8CkuVJrXl/Ih7da','Администратор','Системы','admin','7780599269','bobolie',true,'2025-10-27 00:32:36','2025-10-27 00:32:36'),
(22,'standrey2007@gmail.com','89689370544','$2a$10$aT9w4nJuiUtstfZ0Ab47Se87z5frrnyOYbWi72zuASgu/jHu/KTGe','Андрей','qwe','client','964264865','Grmmy',true,'2025-10-27 10:48:03','2025-10-27 10:48:03');

INSERT INTO telegram_links ("id","user_id","link_code","telegram_id","telegram_username","is_verified","expires_at","created_at") VALUES 
(8,1,'W9Y7MN','964264865','Grmmy',true,'2025-10-27 01:16:35','2025-10-27 01:06:35'),
(9,1,'KYFPAT',NULL,NULL,false,'2025-10-27 10:17:55','2025-10-27 10:07:55'),
(10,1,'NUI8K7','964264865','Grmmy',true,'2025-10-27 10:58:24','2025-10-27 10:48:24'),
(11,22,'VK1RAS','964264865','Grmmy',true,'2025-10-29 19:32:39','2025-10-29 19:22:39'),
(12,19,'AF296Y','964264865','Grmmy',true,'2025-10-29 20:19:21','2025-10-29 20:09:21'),
(13,19,'2E8PLX','964264865','Grmmy',true,'2025-10-29 20:23:16','2025-10-29 20:13:16'),
(14,19,'YZAHGW',NULL,NULL,false,'2025-10-29 20:23:44','2025-10-29 20:13:44'),
(15,19,'O147M9',NULL,NULL,false,'2025-10-29 20:23:52','2025-10-29 20:13:52'),
(16,19,'SAXC44',NULL,NULL,false,'2025-10-29 20:23:55','2025-10-29 20:13:55'),
(17,19,'L0S9W7','7780599269','bobolie',true,'2025-10-29 20:24:44','2025-10-29 20:14:44');

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_links_code ON telegram_links (link_code);
CREATE INDEX IF NOT EXISTS idx_telegram_links_user_id ON telegram_links (user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- Сбрасываем последовательности чтобы новые ID были корректными
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('services_id_seq', (SELECT MAX(id) FROM services));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));
SELECT setval('telegram_links_id_seq', (SELECT MAX(id) FROM telegram_links));