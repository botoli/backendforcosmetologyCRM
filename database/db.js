// database/db.js - PostgreSQL версия
const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    this.init();
  }

  async init() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Connected to PostgreSQL database');
      client.release();
    } catch (error) {
      console.error('❌ Error connecting to PostgreSQL:', error.message);
    }
  }

  // User methods - АДАПТИРОВАНЫ ДЛЯ PostgreSQL
  async findUserByEmail(email) {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async findUserByPhone(phone) {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async findUserByPhoneOrEmail(phoneOrEmail) {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE phone = $1 OR email = $1', [
        phoneOrEmail,
      ]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async findUserById(id) {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const { name, surname, phone, email, passwordHash, role } = userData;
      const result = await this.pool.query(
        'INSERT INTO users (name, surname, phone, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, surname, phone, email, passwordHash, role],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Service methods
  async getServices() {
    try {
      const result = await this.pool.query('SELECT * FROM services ORDER BY name');
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getServiceById(id) {
    try {
      const result = await this.pool.query('SELECT * FROM services WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async createService(serviceData) {
    try {
      const { name, category, description, price, duration } = serviceData;
      const result = await this.pool.query(
        'INSERT INTO services (name, category, description, price, duration) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, category, description, price, duration],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async updateService(id, serviceData) {
    try {
      const { name, category, description, price, duration } = serviceData;
      const result = await this.pool.query(
        'UPDATE services SET name = $1, category = $2, description = $3, price = $4, duration = $5 WHERE id = $6 RETURNING *',
        [name, category, description, price, duration, id],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async deleteService(id) {
    try {
      await this.pool.query('DELETE FROM services WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Booking methods
  async createBooking(bookingData) {
    try {
      const { userId, serviceId, bookingDate, bookingTime, comment, telegramNotification } =
        bookingData;
      const result = await this.pool.query(
        `INSERT INTO bookings (user_id, service_id, booking_date, booking_time, comment, telegram_notification) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, serviceId, bookingDate, bookingTime, comment, telegramNotification],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getBookingById(id) {
    try {
      const result = await this.pool.query(
        `SELECT b.*, 
                u.name as user_name, 
                u.surname as user_surname, 
                u.email as user_email, 
                u.phone as user_phone,
                u.telegram_id as user_telegram_id,
                s.name as service_name, 
                s.price as service_price,
                s.duration as service_duration
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN services s ON b.service_id = s.id
         WHERE b.id = $1`,
        [id],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getUserBookings(userId) {
    try {
      const result = await this.pool.query(
        `SELECT b.*, s.name as service_name, s.price as service_price
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         WHERE b.user_id = $1
         ORDER BY b.booking_date DESC, b.booking_time DESC`,
        [userId],
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getAllBookings() {
    try {
      const result = await this.pool.query(
        `SELECT b.*, 
                u.name as user_name, 
                u.surname as user_surname, 
                u.email as user_email, 
                u.phone as user_phone,
                s.name as service_name, 
                s.price as service_price,
                s.duration as service_duration
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN services s ON b.service_id = s.id
         ORDER BY b.booking_date DESC, b.booking_time DESC`,
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getBookingsByDate(date) {
    try {
      const result = await this.pool.query(
        `SELECT b.*, s.duration as service_duration
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         WHERE b.booking_date = $1 AND b.status != 'cancelled'
         ORDER BY b.booking_time`,
        [date],
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async updateBookingStatus(id, status) {
    try {
      await this.pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async deleteBooking(id) {
    try {
      await this.pool.query('DELETE FROM bookings WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Client methods
  async getClients() {
    try {
      const result = await this.pool.query(
        `SELECT u.*, 
                COUNT(b.id) as total_bookings,
                MAX(b.created_at) as last_booking
         FROM users u
         LEFT JOIN bookings b ON u.id = b.user_id
         WHERE u.role = 'client'
         GROUP BY u.id
         ORDER BY u.name, u.surname`,
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getClientDetails(id) {
    try {
      const result = await this.pool.query(
        `SELECT u.*, 
                COUNT(b.id) as total_bookings,
                SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                MAX(b.created_at) as last_booking
         FROM users u
         LEFT JOIN bookings b ON u.id = b.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [id],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Admin methods
  async getAdmins() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM users 
         WHERE role = 'admin' AND telegram_id IS NOT NULL`,
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Telegram methods
  async createTelegramLink(userId, linkCode) {
    try {
      // Удаляем старые ссылки
      await this.pool.query('DELETE FROM telegram_links WHERE user_id = $1', [userId]);

      // Создаем новую ссылку
      const result = await this.pool.query(
        "INSERT INTO telegram_links (user_id, link_code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour') RETURNING *",
        [userId, linkCode],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getTelegramLinkByCode(code) {
    try {
      const result = await this.pool.query(
        `SELECT tl.*, u.name, u.surname 
         FROM telegram_links tl
         JOIN users u ON tl.user_id = u.id
         WHERE tl.link_code = $1 AND tl.expires_at > NOW()`,
        [code],
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async verifyTelegramLink(code, telegramId, telegramUsername) {
    try {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        // Обновляем telegram_links
        const linkResult = await client.query(
          'UPDATE telegram_links SET is_verified = true, telegram_id = $1, telegram_username = $2, verified_at = NOW() WHERE link_code = $3 RETURNING user_id',
          [telegramId, telegramUsername, code],
        );

        if (linkResult.rows.length === 0) {
          throw new Error('Link not found');
        }

        const userId = linkResult.rows[0].user_id;

        // Обновляем пользователя
        await client.query(
          'UPDATE users SET telegram_id = $1, telegram_username = $2 WHERE id = $3',
          [telegramId, telegramUsername, userId],
        );

        await client.query('COMMIT');

        return {
          userId,
          telegramId,
          telegramUsername,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw error;
    }
  }

  async unlinkTelegram(userId) {
    try {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        // Удаляем из telegram_links
        await client.query('DELETE FROM telegram_links WHERE user_id = $1', [userId]);

        // Обновляем пользователя
        await client.query(
          'UPDATE users SET telegram_id = NULL, telegram_username = NULL WHERE id = $1',
          [userId],
        );

        await client.query('COMMIT');

        return { success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw error;
    }
  }

  // Close connection
  async close() {
    await this.pool.end();
    console.log('✅ PostgreSQL connection closed');
  }
}

module.exports = Database;
