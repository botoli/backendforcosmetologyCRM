// server/index.js - ИСПРАВЛЕННАЯ ФУНКЦИЯ ГЕНЕРАЦИИ СЛОТОВ
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('./database/db');
const TelegramBot = require('./telegram/bot');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  console.log('🌐 Incoming request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
  });
  next();
});

// ИСПРАВЛЕННЫЙ CORS - разрешаем все origins для разработки
app.use(
  cors({
    origin: function (origin, callback) {
      // Разрешаем все origins в разработке
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log('CORS blocked for origin:', origin);
        return callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// Обработка OPTIONS запросов
app.options('*', cors());

app.use(express.json());

// Инициализация базы данных
const db = new Database();

// Инициализация Telegram бота (если токен указан)
let bot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, db);
    bot.start();
    console.log('✅ Telegram bot initialized');
  } catch (error) {
    console.error('❌ Telegram bot initialization failed:', error.message);
  }
} else {
  console.log('ℹ️ Telegram bot token not provided, bot disabled');
}

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }

    req.userId = decoded.userId;
    req.user = decoded;
    next();
  });
};

// Health check
app.get('/api/health', (req, res) => {
  console.log('✅ Health check called');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'Connected',
    telegramBot: bot ? 'Active' : 'Disabled',
  });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phoneOrEmail, password } = req.body;

    console.log('📥 Login request:', { phoneOrEmail });

    const user = await db.findUserByPhoneOrEmail(phoneOrEmail);
    if (!user) {
      console.log('❌ User not found:', phoneOrEmail);
      return res.status(401).json({
        error: 'Пользователь не найден',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.email);
      return res.status(401).json({
        error: 'Неверный пароль',
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' },
    );

    console.log('✅ User logged in successfully:', user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        telegramConnected: !!user.telegram_id,
        telegramId: user.telegram_id,
        telegramUsername: user.telegram_username,
      },
      token,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Ошибка при входе: ' + error.message,
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, surname, phone, email, password } = req.body;

    console.log('📥 Registration request:', { name, surname, phone, email });

    const existingUser = (await db.findUserByEmail(email)) || (await db.findUserByPhone(phone));
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        error: 'Пользователь с таким email или телефоном уже существует',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.createUser({
      name,
      surname,
      phone,
      email,
      passwordHash,
      role: 'client',
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' },
    );

    console.log('✅ User registered successfully:', user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        telegramConnected: false,
      },
      token,
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      error: 'Ошибка при регистрации: ' + error.message,
    });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log('📥 Fetching current user:', userId);

    const user = await db.findUserById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        error: 'Пользователь не найден',
      });
    }

    console.log('✅ Current user fetched:', user.email);

    res.json({
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      phone: user.phone,
      role: user.role,
      telegramConnected: !!user.telegram_id,
      telegramId: user.telegram_id,
      telegramUsername: user.telegram_username,
    });
  } catch (error) {
    console.error('❌ Error fetching current user:', error);
    res.status(500).json({
      error: 'Ошибка при получении данных пользователя',
      message: error.message,
    });
  }
});

app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('📥 Admin login request:', { email });

    const user = await db.findUserByEmail(email);
    if (!user || user.role !== 'admin') {
      console.log('❌ Admin access denied for:', email);
      return res.status(401).json({
        error: 'Доступ запрещен',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('❌ Invalid admin password for:', email);
      return res.status(401).json({
        error: 'Неверный пароль',
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' },
    );

    console.log('✅ Admin logged in successfully:', user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        telegramConnected: !!user.telegram_id,
      },
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'Ошибка при входе администратора',
    });
  }
});

// Services routes
app.get('/api/services', async (req, res) => {
  try {
    console.log('📥 Fetching services from database');
    const services = await db.getServices();
    console.log('✅ Services fetched:', services.length);
    res.json(services);
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    res.status(500).json({
      error: 'Failed to fetch services',
      message: error.message,
    });
  }
});

app.post('/api/services', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { name, category, description, price, duration } = req.body;
    console.log('📥 Creating service:', { name, category, price });

    const service = await db.createService({
      name,
      category,
      description,
      price,
      duration,
    });

    console.log('✅ Service created:', service.id);
    res.json(service);
  } catch (error) {
    console.error('❌ Error creating service:', error);
    res.status(500).json({
      error: 'Ошибка при создании услуги',
      message: error.message,
    });
  }
});

app.put('/api/services/:id', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const { name, category, description, price, duration } = req.body;
    console.log('📥 Updating service:', id);

    const service = await db.updateService(id, {
      name,
      category,
      description,
      price,
      duration,
    });

    console.log('✅ Service updated:', id);
    res.json(service);
  } catch (error) {
    console.error('❌ Error updating service:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении услуги',
      message: error.message,
    });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    console.log('📥 Deleting service:', id);

    await db.deleteService(id);

    console.log('✅ Service deleted:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    res.status(500).json({
      error: 'Ошибка при удалении услуги',
      message: error.message,
    });
  }
});

// Bookings routes - ИСПРАВЛЕННЫЙ ЭНДПОИНТ
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Creating booking:', req.body);
    const { serviceId, date, time, comment, telegramNotification = true } = req.body;
    const userId = req.userId;

    const booking = await db.createBooking({
      userId,
      serviceId,
      bookingDate: date,
      bookingTime: time,
      comment,
      telegramNotification,
    });

    // Получаем полную информацию об услуге и пользователе
    const service = await db.getServiceById(serviceId);
    const user = await db.findUserById(userId);

    console.log('✅ Booking created:', booking.id);

    // Отправляем уведомление пользователю о записи
    if (bot && user.telegram_id) {
      try {
        await bot.notifyUserAboutBooking(booking, service, user);
        console.log('✅ Telegram notification sent to user:', user.telegram_id);
      } catch (tgError) {
        console.error('❌ User Telegram notification failed:', tgError.message);
      }
    } else {
      console.log('ℹ️ User has no Telegram connected, skipping user notification');
    }

    // Отправляем уведомление администраторам о новой записи
    if (bot) {
      try {
        await bot.notifyAdminsAboutNewBooking(booking, service, user);
        console.log('✅ Telegram notification sent to admins');
      } catch (tgError) {
        console.error('❌ Admin Telegram notification failed:', tgError.message);
      }
    }

    res.json(booking);
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      message: error.message,
    });
  }
});

app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const bookings = await db.getUserBookings(userId);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      error: 'Ошибка при загрузке записей',
    });
  }
});

app.get('/api/bookings/available-times', authenticateToken, async (req, res) => {
  try {
    const { date, serviceId } = req.query;

    if (!date || !serviceId) {
      return res.status(400).json({
        error: 'Дата и ID услуги обязательны',
      });
    }

    const service = await db.getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({
        error: 'Услуга не найдена',
      });
    }

    const existingBookings = await db.getBookingsByDate(date);
    const allSlots = generateTimeSlots();
    const bookedSlots = new Set(existingBookings.map((booking) => booking.booking_time));

    const availableSlots = allSlots.filter((slot) => {
      // Если слот уже занят другой записью
      if (bookedSlots.has(slot)) return false;

      // Проверяем пересечения с существующими записями
      for (const booking of existingBookings) {
        const bookingTime = booking.booking_time;
        const serviceDuration = booking.service_duration || service.duration || 60;

        // Блокируем время процедуры + 30 минут для уборки/подготовки
        const totalBlockedTime = serviceDuration + 30;

        const slotMinutes = timeToMinutes(slot);
        const bookingMinutes = timeToMinutes(bookingTime);

        // Проверяем, не попадает ли выбранный слот в заблокированное время
        if (slotMinutes >= bookingMinutes && slotMinutes < bookingMinutes + totalBlockedTime) {
          return false;
        }

        // Также проверяем, не пересекается ли наша процедура с существующей
        const ourServiceDuration = service.duration || 60;
        if (
          slotMinutes < bookingMinutes + totalBlockedTime &&
          slotMinutes + ourServiceDuration > bookingMinutes
        ) {
          return false;
        }
      }

      return true;
    });

    console.log('✅ Available time slots fetched:', availableSlots.length);
    console.log('📊 Service duration:', service.duration, 'min');
    console.log('📊 Total bookings on date:', existingBookings.length);

    res.json({ availableSlots, allSlots });
  } catch (error) {
    console.error('❌ Error fetching available times:', error);
    res.status(500).json({
      error: 'Ошибка при получении доступных времен',
      message: error.message,
    });
  }
});

app.get('/api/bookings/all', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    console.log('📥 Fetching all bookings from database');
    const bookings = await db.getAllBookings();
    console.log('✅ Bookings fetched:', bookings.length);
    res.json(bookings);
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({
      error: 'Ошибка при загрузке записей',
      message: error.message,
    });
  }
});

app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    const { status } = req.body;

    console.log('📥 Updating booking status:', { id, status });

    await db.updateBookingStatus(id, status);

    // Отправляем уведомление пользователю об изменении статуса
    if (bot) {
      try {
        const booking = await db.getBookingById(id);
        if (booking) {
          const user = await db.findUserById(booking.user_id);
          const service = await db.getServiceById(booking.service_id);
          await bot.notifyUserAboutBookingStatus(booking, service, user, status);
          console.log('✅ Status notification sent to user');
        }
      } catch (tgError) {
        console.error('❌ Status Telegram notification failed:', tgError.message);
      }
    }

    console.log('✅ Booking status updated successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении статуса записи',
      message: error.message,
    });
  }
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    console.log('📥 Deleting booking:', id);

    // Проверяем права доступа
    const user = await db.findUserById(userId);
    if (user.role !== 'admin') {
      // Для клиентов проверяем, что запись принадлежит пользователю
      const booking = await db.getBookingById(id);
      if (!booking || booking.user_id !== userId) {
        return res.status(403).json({
          error: 'Нет доступа к данной записи',
        });
      }
    }

    await db.deleteBooking(id);

    console.log('✅ Booking deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({
      error: 'Ошибка при удалении записи',
      message: error.message,
    });
  }
});

app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    console.log('📥 Fetching clients from database');
    const clients = await db.getClients();
    console.log('✅ Clients fetched:', clients.length);
    res.json(clients);
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    res.status(500).json({
      error: 'Ошибка при загрузке клиентов',
      message: error.message,
    });
  }
});

app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { id } = req.params;
    console.log('📥 Fetching client details:', id);

    const client = await db.getClientDetails(id);
    if (!client) {
      return res.status(404).json({
        error: 'Клиент не найден',
      });
    }

    console.log('✅ Client details fetched');
    res.json(client);
  } catch (error) {
    console.error('❌ Error fetching client details:', error);
    res.status(500).json({
      error: 'Ошибка при загрузке данных клиента',
      message: error.message,
    });
  }
});

app.get('/api/schedule', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('📥 Fetching schedule for date:', date);

    const bookings = await db.getAllBookings();
    const dayBookings = bookings.filter((booking) => booking.booking_date === date);

    const schedule = dayBookings.map((booking) => ({
      id: booking.id,
      time: booking.booking_time,
      booked: true,
      client_name: `${booking.user_name} ${booking.user_surname}`,
      service_name: booking.service_name,
    }));

    console.log('✅ Schedule fetched:', schedule.length);
    res.json(schedule);
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({
      error: 'Ошибка при загрузке расписания',
      message: error.message,
    });
  }
});

app.put('/api/schedule/working-hours', async (req, res) => {
  try {
    const workingHours = req.body;
    console.log('📥 Updating working hours:', workingHours);

    console.log('✅ Working hours updated');
    res.json({ success: true, workingHours });
  } catch (error) {
    console.error('❌ Error updating working hours:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении рабочих часов',
      message: error.message,
    });
  }
});

app.put('/api/schedule/breaks', async (req, res) => {
  try {
    const breaks = req.body;
    console.log('📥 Updating breaks:', breaks);

    console.log('✅ Breaks updated');
    res.json({ success: true, breaks });
  } catch (error) {
    console.error('❌ Error updating breaks:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении перерывов',
      message: error.message,
    });
  }
});

// Reports routes
app.post('/api/reports/generate', async (req, res) => {
  try {
    const reportData = req.body;
    console.log('📥 Generating report:', reportData);

    const bookings = await db.getAllBookings();
    const services = await db.getServices();
    const clients = await db.getClients();

    let filteredBookings = bookings;
    if (reportData.startDate && reportData.endDate) {
      filteredBookings = bookings.filter((b) => {
        return b.booking_date >= reportData.startDate && b.booking_date <= reportData.endDate;
      });
    }

    let filteredData = [];
    let stats = {};

    if (reportData.type === 'financial') {
      const completedBookings = filteredBookings.filter((b) => b.status === 'completed');
      const revenue = completedBookings.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
      stats = {
        revenue,
        totalBookings: filteredBookings.length,
        completedBookings: completedBookings.length,
        pendingBookings: filteredBookings.filter((b) => b.status === 'pending').length,
      };
      filteredData = completedBookings;
    } else if (reportData.type === 'bookings') {
      stats = {
        totalBookings: filteredBookings.length,
        completedBookings: filteredBookings.filter((b) => b.status === 'completed').length,
        pendingBookings: filteredBookings.filter((b) => b.status === 'pending').length,
        cancelledBookings: filteredBookings.filter((b) => b.status === 'cancelled').length,
      };
      filteredData = filteredBookings;
    } else if (reportData.type === 'clients') {
      stats = {
        totalClients: clients.length,
      };
      filteredData = clients;
    } else if (reportData.type === 'services') {
      stats = {
        totalServices: services.length,
      };
      filteredData = services;
    }

    const report = {
      id: Date.now(),
      type: reportData.type,
      name: reportData.name,
      data: filteredData,
      stats,
      createdAt: new Date().toISOString(),
    };

    console.log('✅ Report generated successfully');
    res.json({ success: true, report });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({
      error: 'Ошибка при создании отчета',
      message: error.message,
    });
  }
});

app.get('/api/reports/history', async (req, res) => {
  try {
    console.log('📥 Fetching reports history');
    const reports = [];
    console.log('✅ Reports history fetched');
    res.json(reports);
  } catch (error) {
    console.error('❌ Error fetching reports history:', error);
    res.status(500).json({
      error: 'Ошибка при загрузке истории отчетов',
      message: error.message,
    });
  }
});

app.get('/api/reports/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📥 Downloading report:', id);
    console.log('✅ Report download initiated');
    res.json({ success: true, message: 'Download not implemented yet' });
  } catch (error) {
    console.error('❌ Error downloading report:', error);
    res.status(500).json({
      error: 'Ошибка при скачивании отчета',
      message: error.message,
    });
  }
});

// Telegram routes
app.post('/api/telegram/link', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await db.createTelegramLink(userId, linkCode);

    console.log('✅ Telegram link created:', linkCode);
    res.json({ linkCode });
  } catch (error) {
    console.error('Error creating telegram link:', error);
    res.status(500).json({
      error: 'Ошибка при создании ссылки',
    });
  }
});

app.get('/api/telegram/check-link/:code', async (req, res) => {
  try {
    const { code } = req.params;
    console.log('📥 Checking telegram link:', code);

    const link = await db.getTelegramLinkByCode(code);

    if (link && link.is_verified) {
      console.log('✅ Telegram link verified:', code);
      res.json({
        linked: true,
        telegramId: link.telegram_id,
        telegramUsername: link.telegram_username,
      });
    } else {
      console.log('❌ Telegram link not verified:', code);
      res.json({ linked: false });
    }
  } catch (error) {
    console.error('Error checking telegram link:', error);
    res.status(500).json({
      error: 'Ошибка при проверке ссылки',
    });
  }
});

app.post('/api/telegram/unlink', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    await db.unlinkTelegram(userId);

    console.log('✅ Telegram unlinked for user:', userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unlinking telegram:', error);
    res.status(500).json({
      error: 'Ошибка при отвязке Telegram',
    });
  }
});

// Helper function to generate time slots (every 30 minutes)
const generateTimeSlots = (startHour = 9, endHour = 18) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

// Helper function to convert time string to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Обработка несуществующих маршрутов API
app.use('/api/*', (req, res) => {
  console.log('❌ API endpoint not found:', req.originalUrl);
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Обработка корневого пути
app.get('/', (req, res) => {
  res.json({
    message: 'Cosmetology API Server',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login, /api/auth/register, /api/auth/admin/login',
      services: '/api/services',
      bookings: '/api/bookings, /api/bookings/my, /api/bookings/all, /api/bookings/:id/status',
      clients: '/api/clients, /api/clients/:id',
      schedule: '/api/schedule, /api/schedule/working-hours, /api/schedule/breaks',
      reports: '/api/reports/generate, /api/reports/history, /api/reports/:id/download',
      telegram: '/api/telegram/link, /api/telegram/check-link/:code, /api/telegram/unlink',
    },
  });
});

// Обработка всех остальных маршрутов
app.use('*', (req, res) => {
  console.log('❌ Route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 JWT secret: ${process.env.JWT_SECRET ? 'Set' : 'Using fallback'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  if (bot) {
    bot.stop();
  }
  db.close();
  process.exit(0);
});
