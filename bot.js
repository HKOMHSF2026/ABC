const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('bedrock-protocol');
const fs = require('fs');

const botToken = '8569669567:AAHll-vctbUgUnl7ca2uL_dj1UQPS_LR5l8';
const ownerId = 5009481246;

// إزالة ميزة القنوات الإجبارية
// const requiredChannels = [];

const bot = new Telegraf(botToken);

let servers = {};
let users = [];
let clients = {};
let intervals = {};
let spamIntervals = {};
const botCooldowns = new Map();
const userVersions = {};
const userStates = {};

// تحسين نظام تحميل البيانات
function loadData() {
  try {
    if (fs.existsSync('servers.json')) {
      const data = fs.readFileSync('servers.json', 'utf8');
      servers = JSON.parse(data);
      console.log('✅ تم تحميل السيرفرات بنجاح');
    } else {
      console.log('ℹ️ لا يوجد ملف servers.json, سيتم إنشاء ملف جديد');
    }
  } catch (error) {
    console.error('❌ خطأ في تحميل servers.json:', error.message);
  }

  try {
    if (fs.existsSync('users.json')) {
      const data = fs.readFileSync('users.json', 'utf8');
      users = JSON.parse(data);
      console.log('✅ تم تحميل المستخدمين بنجاح');
    } else {
      console.log('ℹ️ لا يوجد ملف users.json, سيتم إنشاء ملف جديد');
    }
  } catch (error) {
    console.error('❌ خطأ في تحميل users.json:', error.message);
  }
}

// تحسين نظام حفظ البيانات
function saveServers() {
  try {
    fs.writeFileSync('servers.json', JSON.stringify(servers, null, 2));
    console.log('💾 تم حفظ السيرفرات');
  } catch (error) {
    console.error('❌ خطأ في حفظ servers.json:', error.message);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    console.log('💾 تم حفظ المستخدمين');
  } catch (error) {
    console.error('❌ خطأ في حفظ users.json:', error.message);
  }
}

// تحميل البيانات عند التشغيل
loadData();

// إزالة دالة التحقق من الاشتراك
// async function isSubscribed(ctx) { ... }

// تحسين إشعار المالك
async function notifyOwner(ctx) {
  try {
    const user = ctx.from;
    const id = user.id;

    if (!users.includes(id)) {
      users.push(id);
      saveUsers();

      const message = `👤 دخول جديد إلى البوت
      
📌 المعلومات:
• الاسم: ${user.first_name || 'غير معروف'}
• المعرف: ${user.username ? '@' + user.username : 'لا يوجد'}
• الايدي: \`${id}\`

📊 الإحصائيات:
• الأعضاء الكليين: ${users.length}`;

      await bot.telegram.sendMessage(ownerId, message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('❌ خطأ في إشعار المالك:', error.message);
  }
}

// تحسين أمر البدء
bot.start(async (ctx) => {
  try {
    await notifyOwner(ctx);

    ctx.reply('🎮 **مرحباً بك في بوت سيرفرات ماين كرافت!**\n\nاختر إصدار لعبتك:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1.21.90', 'version_1.21.90')],
        [Markup.button.callback('1.21.93', 'version_1.21.93')],
        [Markup.button.callback('1.21.100', 'version_1.21.100')],
        [Markup.button.callback('1.21.120', 'version_1.21.120')],
        [Markup.button.callback('1.21.130', 'version_1.21.130')]
      ])
    });
  } catch (error) {
    console.error('❌ خطأ في أمر start:', error.message);
    ctx.reply('⚠️ حدث خطأ، يرجى المحاولة مرة أخرى.');
  }
});

// تحسين اختيار الإصدار
bot.action(/version_(.+)/, (ctx) => {
  try {
    const version = ctx.match[1];
    const userId = ctx.from.id;
    userVersions[userId] = version;

    ctx.answerCbQuery(`✅ تم اختيار النسخة ${version}`);
    
    ctx.reply(`🎮 **الإصدار المختار:** \`${version}\`\n\nالآن يمكنك إضافة سيرفر للعب.`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة سيرفر', 'add_server')],
        [Markup.button.callback('🖥️ عرض السيرفرات', 'list_servers')],
        [Markup.button.callback('⚙️ الإعدادات', 'settings')]
      ])
    });
  } catch (error) {
    console.error('❌ خطأ في اختيار الإصدار:', error.message);
    ctx.answerCbQuery('❌ حدث خطأ');
  }
});

// تحسين إضافة السيرفر
bot.action('add_server', (ctx) => {
  try {
    ctx.reply('📥 **أرسل بيانات السيرفر:**\n\n`host:port`\n\nمثال:\n`play.server.com:19132`', {
      parse_mode: 'Markdown'
    });
    userStates[ctx.from.id] = 'awaiting_server';
  } catch (error) {
    console.error('❌ خطأ في إضافة السيرفر:', error.message);
  }
});

// إضافة عرض السيرفرات
bot.action('list_servers', (ctx) => {
  try {
    const userId = ctx.from.id;
    if (servers[userId]) {
      const { host, port } = servers[userId];
      ctx.reply(`📋 **سيرفراتك:**\n\n🌐 ${host}:${port}\n📅 تم الإضافة: ${new Date().toLocaleDateString('ar-SA')}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🗑️ حذف السيرفر', 'delete_server')],
          [Markup.button.callback('🔙 رجوع', 'back_to_main')]
        ])
      });
    } else {
      ctx.reply('❌ **لا توجد سيرفرات**\n\nلم تقم بإضافة أي سيرفر بعد.', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('➕ إضافة سيرفر', 'add_server')],
          [Markup.button.callback('🔙 رجوع', 'back_to_main')]
        ])
      });
    }
  } catch (error) {
    console.error('❌ خطأ في عرض السيرفرات:', error.message);
  }
});

// تحسين حذف السيرفر
bot.action('delete_server', (ctx) => {
  try {
    const userId = ctx.from.id;
    if (servers[userId]) {
      delete servers[userId];
      saveServers();
      stopUserBots(userId);
      ctx.reply('✅ **تم حذف السيرفر بنجاح**\n\nتم إيقاف جميع البوتات المتصلة.', {
        parse_mode: 'Markdown'
      });
    } else {
      ctx.reply('❌ **لا يوجد سيرفر لحذفه**');
    }
  } catch (error) {
    console.error('❌ خطأ في حذف السيرفر:', error.message);
  }
});

bot.action('settings', (ctx) => {
  try {
    const userId = ctx.from.id;
    const version = userVersions[userId] || 'لم يتم الاختيار';
    
    ctx.reply(`⚙️ **الإعدادات:**\n\n🎮 الإصدار: \`${version}\`\n\nاختر الإجراء:`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 تغيير الإصدار', 'change_version')],
        [Markup.button.callback('▶️ تشغيل البوتات', 'run_bots')],
        [Markup.button.callback('⏹️ إيقاف البوتات', 'stop_bots')],
        [Markup.button.callback('➕ إضافة بوت إضافي', 'add_bot')],
        [Markup.button.callback('🔙 رجوع', 'back_to_main')]
      ])
    });
  } catch (error) {
    console.error('❌ خطأ في الإعدادات:', error.message);
  }
});

bot.action('change_version', (ctx) => {
  try {
    ctx.reply('🎮 **اختر الإصدار الجديد:**', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('1.21.90', 'version_1.21.90')],
        [Markup.button.callback('1.21.93', 'version_1.21.93')],
        [Markup.button.callback('1.21.100', 'version_1.21.100')],
        [Markup.button.callback('1.21.120', 'version_1.21.120')],
        [Markup.button.callback('1.21.130', 'version_1.21.130')]
      ])
    });
  } catch (error) {
    console.error('❌ خطأ في تغيير الإصدار:', error.message);
  }
});

bot.action('run_bots', async (ctx) => {
  try {
    const userId = ctx.from.id;

    if (!servers[userId]) {
      return ctx.reply('❌ **أضف السيرفر أولاً**\n\nاستخدم ➕ إضافة سيرفر', {
        parse_mode: 'Markdown'
      });
    }

    ctx.reply('🚀 **جارٍ تشغيل البوتات...**\n\nالرجاء الانتظار 10 ثوانٍ', {
      parse_mode: 'Markdown'
    });

    setTimeout(() => {
      try {
        connectToServer(userId);
        ctx.reply('✅ **تم تشغيل البوتات بنجاح**\n\nالبوتات تعمل الآن على السيرفر.', {
          parse_mode: 'Markdown'
        });
      } catch (error) {
        console.error('❌ خطأ في تشغيل البوتات:', error.message);
        ctx.reply('❌ **فشل تشغيل البوتات**\n\nتأكد من صحة بيانات السيرفر.', {
          parse_mode: 'Markdown'
        });
      }
    }, 10000);
  } catch (error) {
    console.error('❌ خطأ في تشغيل البوتات:', error.message);
  }
});

bot.action('stop_bots', (ctx) => {
  try {
    const userId = ctx.from.id;
    stopUserBots(userId);
    ctx.reply('⏹️ **تم إيقاف جميع البوتات**\n\nتم فصل جميع الاتصالات من السيرفر.', {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ خطأ في إيقاف البوتات:', error.message);
  }
});

bot.action('back_to_main', (ctx) => {
  try {
    ctx.reply('🏠 **القائمة الرئيسية**\n\nاختر الإجراء المطلوب:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة سيرفر', 'add_server')],
        [Markup.button.callback('🖥️ عرض السيرفرات', 'list_servers')],
        [Markup.button.callback('⚙️ الإعدادات', 'settings')],
        [Markup.button.callback('📊 الإحصائيات', 'stats_user')]
      ])
    });
  } catch (error) {
    console.error('❌ خطأ في العودة للرئيسية:', error.message);
  }
});

bot.action('stats_user', (ctx) => {
  try {
    const userId = ctx.from.id;
    const version = userVersions[userId] || 'غير محدد';
    const hasServer = servers[userId] ? '✅' : '❌';
    const activeBots = Object.keys(clients).filter(key => key.startsWith(userId + '_')).length;
    
    ctx.reply(`📊 **إحصائياتك:**\n\n🎮 الإصدار: \`${version}\`\n🖥️ سيرفر: ${hasServer}\n🤖 بوتات نشطة: ${activeBots}\n📅 تاريخ التسجيل: ${new Date().toLocaleDateString('ar-SA')}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 رجوع', 'back_to_main')]
      ])
    });
  } catch (error) {
    console.error('❌ خطأ في الإحصائيات:', error.message);
  }
});

// تحسين إيقاف البوتات
function stopUserBots(userId) {
  try {
    // إيقاف البوت الرئيسي
    if (clients[userId]) {
      try {
        clients[userId].end();
        console.log(`⏹️ تم إيقاف البوت الرئيسي للمستخدم ${userId}`);
      } catch (error) {
        console.error(`❌ خطأ في إيقاف البوت الرئيسي:`, error.message);
      }
      delete clients[userId];
    }

    // إيقاف إعادة الاتصال
    if (intervals[userId]) {
      clearInterval(intervals[userId]);
      delete intervals[userId];
    }

    // إيقاف سبام البوت الرئيسي
    if (spamIntervals[userId]) {
      clearInterval(spamIntervals[userId]);
      delete spamIntervals[userId];
    }

    // إيقاف جميع البوتات الإضافية
    for (let key of Object.keys(clients)) {
      if (key.startsWith(userId + '_')) {
        try {
          clients[key].end();
          console.log(`⏹️ تم إيقاف البوت الإضافي ${key}`);
        } catch (error) {
          console.error(`❌ خطأ في إيقاف البوت الإضافي:`, error.message);
        }
        delete clients[key];

        if (spamIntervals[key]) {
          clearInterval(spamIntervals[key]);
          delete spamIntervals[key];
        }
      }
    }
  } catch (error) {
    console.error('❌ خطأ في إيقاف البوتات:', error.message);
  }
}

// تحسين الأوامر الإدارية
bot.command('broadcast', async (ctx) => {
  try {
    if (ctx.from.id !== ownerId) return;

    const message = ctx.message.text.replace('/broadcast ', '').trim();
    if (!message) return ctx.reply('📢 **استخدام:**\n`/broadcast <الرسالة>`', { parse_mode: 'Markdown' });

    const broadcastMsg = `📢 **إشعار من الإدارة:**\n\n${message}\n\n_هذه رسالة آلية_`;

    ctx.reply(`🚀 جارٍ إرسال الرسالة إلى ${users.length} مستخدم...`);

    let sentCount = 0;
    let failedCount = 0;

    for (let uid of users) {
      try {
        await bot.telegram.sendMessage(uid, broadcastMsg, { parse_mode: 'Markdown' });
        sentCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // تقليل الحمل
      } catch (err) {
        failedCount++;
        console.error(`❌ فشل إرسال لـ ${uid}:`, err.message);
      }
    }

    ctx.reply(`✅ **تم الإرسال:**\n\n✅ الناجح: ${sentCount}\n❌ الفاشل: ${failedCount}\n📊 الإجمالي: ${users.length}`);
  } catch (error) {
    console.error('❌ خطأ في البث:', error.message);
    ctx.reply('❌ حدث خطأ أثناء البث');
  }
});

bot.command('stats', async (ctx) => {
  try {
    if (ctx.from.id !== ownerId) return;

    const userCount = users.length;
    const activeBotsCount = Object.keys(clients).length;
    const serversCount = Object.keys(servers).length;
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const statsMessage = `📊 **إحصائيات البوت:**\n
👥 المستخدمين: ${userCount}
🤖 البوتات النشطة: ${activeBotsCount}
🖥️ السيرفرات: ${serversCount}
⏰ وقت التشغيل: ${hours} ساعة ${minutes} دقيقة
🔄 الذاكرة: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;

    ctx.reply(statsMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ خطأ في الإحصائيات:', error.message);
  }
});

// تحسين معالجة النصوص
bot.on('text', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // أمر تنظيف الكونسول
    if (text === '/clear') {
      console.clear();
      return ctx.reply('🧹 **تم تنظيف الكونسول**', { parse_mode: 'Markdown' });
    }

    // إضافة سيرفر جديد
    if (userStates[userId] === 'awaiting_server') {
      const parts = text.split(':');
      if (parts.length !== 2) {
        return ctx.reply('❌ **صيغة غير صحيحة**\n\nاستخدم: `host:port`\nمثال: `play.server.com:19132`', { parse_mode: 'Markdown' });
      }

      const host = parts[0].trim();
      const port = parseInt(parts[1].trim());

      if (isNaN(port) || port < 1 || port > 65535) {
        return ctx.reply('❌ **بورت غير صالح**\n\nيجب أن يكون البورت بين 1 و 65535', { parse_mode: 'Markdown' });
      }

      servers[userId] = { host, port };
      saveServers();
      delete userStates[userId];

      ctx.reply(`✅ **تم حفظ السيرفر بنجاح**\n\n🌐 **الرابط:** \`${host}:${port}\`\n\nالآن يمكنك تشغيل البوتات من الإعدادات.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⚙️ الإعدادات', 'settings')]
        ])
      });
    }
  } catch (error) {
    console.error('❌ خطأ في معالجة النص:', error.message);
    ctx.reply('❌ حدث خطأ في المعالجة');
  }
});

// تحسين إنشاء أسماء البوتات
function generateBotName() {
  const adjectives = ['Cool', 'Fast', 'Smart', 'Happy', 'Brave', 'Quick', 'Clever', 'Magic'];
  const nouns = ['Player', 'Gamer', 'Bot', 'Agent', 'Hero', 'Ninja', 'Wizard', 'Knight'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  
  return `${adj}${noun}${number}`;
}

// تحسين إضافة بوت إضافي
bot.action('add_bot', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const now = Date.now();
    const lastPress = botCooldowns.get(userId) || 0;

    if (now - lastPress < 10000) {
      const remaining = Math.ceil((10000 - (now - lastPress)) / 1000);
      return ctx.answerCbQuery(`⏳ انتظر ${remaining} ثواني`, { show_alert: true });
    }

    botCooldowns.set(userId, now);

    if (!servers[userId]) {
      return ctx.answerCbQuery('❌ أضف سيرفر أولاً', { show_alert: true });
    }

    const { host, port } = servers[userId];
    const version = userVersions[userId];
    
    if (!version) {
      return ctx.answerCbQuery('❌ اختر إصدار أولاً', { show_alert: true });
    }

    const botName = generateBotName();
    ctx.answerCbQuery(`🤖 جاري إنشاء: ${botName}`);

    try {
      const client = createClient({
        host,
        port,
        username: botName,
        version,
        offline: true,
        connectTimeout: 15000,
      });

      const clientKey = `${userId}_${botName}`;
      clients[clientKey] = client;

      client.on('join', () => {
        console.log(`✅ بوت إضافي دخل: ${botName}`);
        bot.telegram.sendMessage(userId, `✅ **تم دخول بوت إضافي:**\n\n🤖 **الاسم:** ${botName}\n🎮 **السيرفر:** ${host}:${port}`).catch(() => {});

        // سلوك طبيعي للبوت
        if (spamIntervals[clientKey]) {
          clearInterval(spamIntervals[clientKey]);
        }
        
        spamIntervals[clientKey] = setInterval(() => {
          try {
            if (client.connected) {
              // حركة طبيعية
              const moveActions = [
                () => client.queue('move_player', {
                  runtime_id: client.entityId,
                  position: { x: Math.random() * 20, y: 64, z: Math.random() * 20 },
                  pitch: Math.random() * 90,
                  yaw: Math.random() * 360,
                  head_yaw: Math.random() * 360,
                  mode: 0,
                  on_ground: true,
                  ridden_runtime_id: 0
                }),
                () => client.queue('text', {
                  type: 'chat',
                  needs_translation: false,
                  source_name: botName,
                  message: ['Hello!', 'Nice server!', 'Having fun', 'Good game'][Math.floor(Math.random() * 4)],
                  xuid: '',
                  platform_chat_id: '',
                })
              ];

              moveActions[Math.floor(Math.random() * moveActions.length)]();
            }
          } catch (err) {
            // تجاهل أخطاء الحركة
          }
        }, Math.random() * 30000 + 20000);
      });

      client.on('disconnect', (reason) => {
        console.log(`❌ بوت إضافي خرج: ${botName} - ${reason}`);
        if (spamIntervals[clientKey]) {
          clearInterval(spamIntervals[clientKey]);
          delete spamIntervals[clientKey];
        }
        delete clients[clientKey];
      });

      client.on('error', (err) => {
        console.error(`❌ خطأ في البوت ${botName}:`, err.message);
        if (spamIntervals[clientKey]) {
          clearInterval(spamIntervals[clientKey]);
          delete spamIntervals[clientKey];
        }
        delete clients[clientKey];
      });

      // إرسال تأكيد للمستخدم
      setTimeout(() => {
        ctx.reply(`🤖 **تم إنشاء البوت الإضافي:**\n\n📛 **الاسم:** ${botName}\n🎮 **الإصدار:** ${version}\n⏱️ **الحالة:** جاري الاتصال...`);
      }, 1000);

    } catch (error) {
      console.error('❌ خطأ في إنشاء البوت:', error.message);
      ctx.reply('❌ **فشل إنشاء البوت**\n\nتأكد من صحة السيرفر والإصدار.');
    }
  } catch (error) {
    console.error('❌ خطأ في إضافة البوت:', error.message);
  }
});

// تحسين الاتصال بالسيرفر
function connectToServer(userId) {
  try {
    if (!servers[userId]) {
      console.error(`❌ لا يوجد سيرفر للمستخدم ${userId}`);
      return;
    }

    // إيقاف أي اتصالات سابقة
    stopUserBots(userId);

    const { host, port } = servers[userId];
    const version = userVersions[userId] || '1.21.130'; // إصدار افتراضي

    console.log(`🚀 محاولة الاتصال: ${host}:${port} (${version})`);

    // البوت الأول
    const mainBot = createClient({
      host,
      port,
      username: 'MainBot',
      version,
      offline: true,
      connectTimeout: 20000,
    });

    clients[userId] = mainBot;

    mainBot.on('join', () => {
      console.log(`✅ البوت الرئيسي دخل: ${host}:${port}`);
      bot.telegram.sendMessage(userId, '✅ **تم الاتصال بالسيرفر!**\n\n🤖 البوت الرئيسي يعمل الآن.').catch(() => {});

      // حركة البوت الرئيسي
      spamIntervals[userId] = setInterval(() => {
        try {
          if (mainBot.connected) {
            // حركات عشوائية
            const actions = [
              () => mainBot.queue('move_player', {
                runtime_id: mainBot.entityId,
                position: { x: Math.random() * 30, y: 65, z: Math.random() * 30 },
                pitch: Math.random() * 90,
                yaw: Math.random() * 360,
                head_yaw: Math.random() * 360,
                mode: 0,
                on_ground: true
              }),
              () => mainBot.queue('text', {
                type: 'chat',
                source_name: 'MainBot',
                message: 'Great server!',
                xuid: '',
                platform_chat_id: '',
              })
            ];

            actions[Math.floor(Math.random() * actions.length)]();
          }
        } catch (err) {
          // تجاهل أخطاء الحركة
        }
      }, 25000);

      // إنشاء بوت ثاني بعد 15 ثانية
      setTimeout(() => createSecondBot(userId, host, port, version), 15000);
    });

    mainBot.on('disconnect', (reason) => {
      console.log(`❌ انقطع البوت الرئيسي: ${reason}`);
      bot.telegram.sendMessage(userId, `❌ **انقطع الاتصال:**\n\nالسبب: ${reason}`).catch(() => {});
      
      if (spamIntervals[userId]) {
        clearInterval(spamIntervals[userId]);
        delete spamIntervals[userId];
      }
      delete clients[userId];
    });

    mainBot.on('error', (err) => {
      console.error('❌ خطأ في البوت الرئيسي:', err.message);
      if (spamIntervals[userId]) {
        clearInterval(spamIntervals[userId]);
        delete spamIntervals[userId];
      }
      delete clients[userId];
    });

  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error.message);
    bot.telegram.sendMessage(userId, '❌ **فشل الاتصال بالسيرفر**\n\nتأكد من صحة البيانات.').catch(() => {});
  }
}

// تحسين إنشاء البوت الثاني
function createSecondBot(userId, host, port, version) {
  try {
    const secondBotName = 'SupportBot';
    const secondClient = createClient({
      host,
      port,
      username: secondBotName,
      version,
      offline: true,
      connectTimeout: 15000,
    });

    const clientKey = `${userId}_second`;
    clients[clientKey] = secondClient;

    secondClient.on('join', () => {
      console.log(`✅ البوت الثاني دخل: ${secondBotName}`);
      bot.telegram.sendMessage(userId, '✅ **البوت الثاني متصل الآن**\n\n🤖 SupportBot يعمل مع البوت الرئيسي.').catch(() => {});

      // حركة البوت الثاني
      spamIntervals[clientKey] = setInterval(() => {
        try {
          if (secondClient.connected) {
            // حركات مختلفة عن البوت الأول
            secondClient.queue('move_player', {
              runtime_id: secondClient.entityId,
              position: { x: Math.random() * 25 + 5, y: 64, z: Math.random() * 25 + 5 },
              pitch: Math.random() * 90,
              yaw: Math.random() * 360,
              head_yaw: Math.random() * 360,
              mode: 0,
              on_ground: true
            });
          }
        } catch (err) {
          // تجاهل أخطاء الحركة
        }
      }, 30000);
    });

    secondClient.on('disconnect', (reason) => {
      console.log(`❌ انقطع البوت الثاني: ${reason}`);
      if (spamIntervals[clientKey]) {
        clearInterval(spamIntervals[clientKey]);
        delete spamIntervals[clientKey];
      }
      delete clients[clientKey];
    });

    secondClient.on('error', (err) => {
      console.error('❌ خطأ في البوت الثاني:', err.message);
      if (spamIntervals[clientKey]) {
        clearInterval(spamIntervals[clientKey]);
        delete spamIntervals[clientKey];
      }
      delete clients[clientKey];
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء البوت الثاني:', error.message);
  }
}

// تحسين إدارة إيقاف التشغيل
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف البوت...');
  
  Object.keys(clients).forEach(key => {
    try {
      clients[key].end();
      console.log(`⏹️ تم إيقاف: ${key}`);
    } catch (error) {
      console.error(`❌ خطأ في إيقاف ${key}:`, error.message);
    }
  });

  Object.values(intervals).forEach(interval => clearInterval(interval));
  Object.values(spamIntervals).forEach(interval => clearInterval(interval));

  console.log('✅ تم إيقاف جميع الاتصالات');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ خطأ غير معالج:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ رفض غير معالج:', reason);
});

// بدء البوت
bot.launch().then(() => {
  console.log('🤖 البوت يعمل الآن!');
  console.log('📊 الإحصائيات:');
  console.log(`👥 المستخدمين: ${users.length}`);
  console.log(`🖥️ السيرفرات: ${Object.keys(servers).length}`);
  console.log(`🎮 الإصدارات المدعومة: 1.21.90, 1.21.93, 1.21.100, 1.21.120, 1.21.130`);
}).catch((error) => {
  console.error('❌ فشل تشغيل البوت:', error.message);
  process.exit(1);
});