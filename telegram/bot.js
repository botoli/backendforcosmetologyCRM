// telegram/bot.js - ИСПРАВЛЕННЫЙ ФАЙЛ
const TelegramBot = require('node-telegram-bot-api');

class TelegramBotManager {
  constructor(token, db) {
    this.bot = new TelegramBot(token, { polling: true });
    this.db = db;
    this.setupHandlers();
  }

  setupHandlers() {
    // Обработчик команды /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.username;

      console.log(`📱 Telegram /start command from: ${chatId}, username: @${username}`);

      try {
        await this.bot.sendMessage(
          chatId,
          `👋 Добро пожаловать в бот косметологического салона!\n\n` +
            `Для привязки аккаунта используйте команду /link\n` +
            `Для получения справки - /help`,
          {
            reply_markup: {
              keyboard: [['/link', '/help']],
              resize_keyboard: true,
            },
          },
        );
      } catch (error) {
        console.error('Error sending start message:', error);
      }
    });

    // Обработчик команды /link
    this.bot.onText(/\/link/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.username;

      console.log(`🔗 Telegram /link command from: ${chatId}`);

      try {
        await this.bot.sendMessage(
          chatId,
          `🔗 Для привязки Telegram аккаунта:\n\n` +
            `1. Перейдите в личный кабинет на сайте\n` +
            `2. В разделе "Telegram" нажмите "Привязать аккаунт"\n` +
            `3. Введите полученный код в этом чате\n\n` +
            `Введите код привязки:`,
        );
      } catch (error) {
        console.error('Error sending link message:', error);
      }
    });

    // Обработчик команды /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        await this.bot.sendMessage(
          chatId,
          `📖 Доступные команды:\n\n` +
            `/start - Начать работу с ботом\n` +
            `/link - Привязать аккаунт\n` +
            `/help - Получить справку\n\n` +
            `После привязки аккаунта вы будете получать уведомления о записях и изменениях статусов.`,
        );
      } catch (error) {
        console.error('Error sending help message:', error);
      }
    });

    // Обработчик кодов привязки (6-значные коды)
    this.bot.onText(/^[A-Z0-9]{6}$/, async (msg, match) => {
      const chatId = msg.chat.id;
      const code = match[0];
      const telegramId = msg.from.id.toString();
      const telegramUsername = msg.from.username || '';

      console.log(`🔐 Processing link code: ${code} from user: ${telegramId}`);

      try {
        const result = await this.db.verifyTelegramLink(code, telegramId, telegramUsername);

        if (result) {
          await this.bot.sendMessage(
            chatId,
            `✅ Аккаунт успешно привязан!\n\n` +
              `Теперь вы будете получать уведомления о:\n` +
              `• Новых записях\n` +
              `• Изменениях статуса записей\n` +
              `• Напоминаниях о визитах`,
            {
              reply_markup: {
                remove_keyboard: true,
              },
            },
          );
          console.log(`✅ Telegram account linked: ${telegramId} -> user ${result.userId}`);
        }
      } catch (error) {
        console.error('Error verifying telegram link:', error);
        await this.bot.sendMessage(
          chatId,
          `❌ Неверный или просроченный код привязки.\n\n` +
            `Пожалуйста, получите новый код в личном кабинете и попробуйте снова.`,
        );
      }
    });

    // Обработчик любых других сообщений
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Игнорируем команды, которые уже обработаны
      if (text && !text.startsWith('/') && !/^[A-Z0-9]{6}$/.test(text)) {
        await this.bot.sendMessage(
          chatId,
          `🤖 Я бот для уведомлений косметологического салона.\n\n` +
            `Используйте команды:\n` +
            `/start - начать работу\n` +
            `/link - привязать аккаунт\n` +
            `/help - получить справку`,
        );
      }
    });

    // Обработчик ошибок
    this.bot.on('error', (error) => {
      console.error('❌ Telegram Bot Error:', error);
    });

    console.log('✅ Telegram bot handlers setup complete');
  }

  // Уведомление пользователя о новой записи
  async notifyUserAboutBooking(booking, service, user) {
    try {
      if (!user.telegram_id) {
        console.log('❌ No telegram_id for user:', user.id);
        return;
      }

      const message =
        `📅 Вы записались на услугу!\n\n` +
        `👤 Клиент: ${user.name} ${user.surname}\n` +
        `📱 Телефон: ${user.phone}\n` +
        `💆 Услуга: ${service.name}\n` +
        `💰 Стоимость: ${service.price} руб.\n` +
        `📅 Дата: ${booking.booking_date}\n` +
        `⏰ Время: ${booking.booking_time}\n` +
        `📝 Статус: ${this.getStatusText(booking.status)}\n` +
        (booking.comment ? `💬 Комментарий: ${booking.comment}\n` : '') +
        `\nМы свяжемся с вами для подтверждения записи.`;

      await this.bot.sendMessage(user.telegram_id, message);
      console.log('✅ User notification sent to:', user.telegram_id);
    } catch (error) {
      console.error('❌ Error sending user notification:', error);
      throw error;
    }
  }

  // Уведомление администраторов о новой записи
  async notifyAdminsAboutNewBooking(booking, service, user) {
    try {
      const admins = await this.db.getAdmins();

      if (admins.length === 0) {
        console.log('❌ No admins found for notification');
        return;
      }

      const message =
        `🆕 НОВАЯ ЗАПИСЬ!\n\n` +
        `👤 Клиент: ${user.name} ${user.surname}\n` +
        `📧 Email: ${user.email}\n` +
        `📱 Телефон: ${user.phone}\n` +
        `💆 Услуга: ${service.name}\n` +
        `💰 Стоимость: ${service.price} руб.\n` +
        `⏱ Длительность: ${service.duration} мин.\n` +
        `📅 Дата: ${booking.booking_date}\n` +
        `⏰ Время: ${booking.booking_time}\n` +
        (booking.comment ? `💬 Комментарий: ${booking.comment}\n` : '') +
        `\n🆔 ID записи: ${booking.id}`;

      let sentCount = 0;
      for (const admin of admins) {
        if (admin.telegram_id) {
          try {
            await this.bot.sendMessage(admin.telegram_id, message);
            sentCount++;
            console.log('✅ Admin notification sent to:', admin.telegram_id);
          } catch (error) {
            console.error(`❌ Failed to send to admin ${admin.telegram_id}:`, error.message);
          }
        }
      }

      console.log(`✅ Notifications sent to ${sentCount}/${admins.length} admins`);
    } catch (error) {
      console.error('❌ Error sending admin notifications:', error);
      throw error;
    }
  }

  // Уведомление пользователя об изменении статуса записи
  async notifyUserAboutBookingStatus(booking, service, user, newStatus) {
    try {
      if (!user.telegram_id) {
        console.log('❌ No telegram_id for user:', user.id);
        return;
      }

      const statusText = this.getStatusText(newStatus);
      const message =
        `📢 Статус вашей записи изменен\n\n` +
        `💆 Услуга: ${service.name}\n` +
        `📅 Дата: ${booking.booking_date}\n` +
        `⏰ Время: ${booking.booking_time}\n` +
        `🔄 Новый статус: ${statusText}\n` +
        (newStatus === 'cancelled'
          ? `\n❌ Если у вас есть вопросы, свяжитесь с нами.`
          : newStatus === 'confirmed'
          ? `\n✅ Запись подтверждена! Ждем вас в салоне.`
          : newStatus === 'completed'
          ? `\n✅ Спасибо за визит! Будем рады видеть вас снова.`
          : '');

      await this.bot.sendMessage(user.telegram_id, message);
      console.log('✅ Status notification sent to user:', user.telegram_id);
    } catch (error) {
      console.error('❌ Error sending status notification:', error);
      throw error;
    }
  }

  // Вспомогательный метод для получения текста статуса
  getStatusText(status) {
    const statusMap = {
      pending: '⏳ Ожидание подтверждения',
      confirmed: '✅ Подтверждено',
      completed: '✅ Завершено',
      cancelled: '❌ Отменено',
    };
    return statusMap[status] || status;
  }

  // Отправка напоминания о записи
  async sendReminder(booking, service, user, hoursBefore = 24) {
    try {
      if (!user.telegram_id) {
        return;
      }

      const message =
        `🔔 Напоминание о записи\n\n` +
        `💆 Услуга: ${service.name}\n` +
        `📅 Дата: ${booking.booking_date}\n` +
        `⏰ Время: ${booking.booking_time}\n` +
        `📍 Адрес: [адрес салона]\n` +
        `📱 Телефон: [контактный телефон]\n\n` +
        `Пожалуйста, приходите за 10-15 минут до назначенного времени.`;

      await this.bot.sendMessage(user.telegram_id, message);
      console.log('✅ Reminder sent to user:', user.telegram_id);
    } catch (error) {
      console.error('❌ Error sending reminder:', error);
    }
  }

  // Проверка доступности бота
  async testBot() {
    try {
      const me = await this.bot.getMe();
      console.log('✅ Telegram bot is running:', me.username);
      return true;
    } catch (error) {
      console.error('❌ Telegram bot test failed:', error);
      return false;
    }
  }

  // Запуск бота
  start() {
    console.log('🤖 Starting Telegram bot...');
    this.testBot();
  }

  // Остановка бота
  stop() {
    console.log('🛑 Stopping Telegram bot...');
    this.bot.stopPolling();
  }
}

module.exports = TelegramBotManager;
