-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'client' CHECK(role IN ('client', 'admin')),
    telegram_id VARCHAR(100) UNIQUE,
    telegram_username VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица услуг
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- в минутах
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица записей
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    comment TEXT,
    telegram_notification BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (service_id) REFERENCES services (id)
);

-- Таблица для привязки Telegram
CREATE TABLE IF NOT EXISTS telegram_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    link_code VARCHAR(10) UNIQUE NOT NULL,
    telegram_id VARCHAR(100),
    telegram_username VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    booking_id INTEGER,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_links_code ON telegram_links(link_code);
CREATE INDEX IF NOT EXISTS idx_telegram_links_user_id ON telegram_links(user_id);

-- Начальные данные
INSERT OR IGNORE INTO users (email, phone, password_hash, name, surname, role) VALUES
('admin@cosmetology.ru', '+79990000000', '$2b$10$ExampleHashForAdmin', 'Администратор', 'Системы', 'admin');

INSERT OR IGNORE INTO services (name, category, description, price, duration) VALUES
('Ультразвуковая чистка лица', 'Чистка лица', 'Глубокая очистка пор с помощью ультразвука', 1800.00, 60),
('Комбинированная чистка лица', 'Чистка лица', 'Комплексная чистка с ручной и аппаратной обработкой', 2500.00, 90),
('Массаж лица комбинированный', 'Массаж лица', 'Расслабляющий и тонизирующий массаж', 1500.00, 45),
('S-уход', 'Уход лица с массажем', 'Базовый уход за кожей лица', 1500.00, 45);