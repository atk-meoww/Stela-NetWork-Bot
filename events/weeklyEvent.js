'use strict';
const _0x1913cb={0x81f7:0x12e2,_:!0};void(0x85);
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const EVENTS = [
  { name: '💰 Tuần lễ vàng',      desc: 'x2 tiền từ `!work` và `!daily`',         emoji: '💰', type: 'money_x2' },
  { name: '⭐ Bão XP',            desc: 'x3 XP từ tin nhắn và hoạt động',           emoji: '⭐', type: 'xp_x3'   },
  { name: '🎣 Lễ hội câu cá',     desc: 'x2 tiền câu cá, cá hiếm xuất hiện nhiều', emoji: '🎣', type: 'fish_x2' },
  { name: '⚔️ Tuần lễ săn thú',   desc: 'x2 tiền săn quái + x2 XP từ !hunt',       emoji: '⚔️', type: 'hunt_x2' },
  { name: '🎰 Tuần may mắn',      desc: 'Tỉ lệ crit +20% trong mọi game',           emoji: '🎰', type: 'luck_up' },
  { name: '🏆 World Boss Week',   desc: 'Boss spawns mỗi 6h, thưởng x3',            emoji: '🏆', type: 'boss_x3' },
  { name: '🎁 Mưa quà',          desc: 'Bot tặng ngẫu nhiên 100-500🪙 mỗi giờ',    emoji: '🎁', type: 'gift_rain'},
];

let currentEvent = null;
let eventEndTime = 0;

function getCurrentEvent() { return currentEvent; }
function isEventActive()   { return currentEvent && Date.now() < eventEndTime; }

module.exports = {
  name: 'ready',
  once: false,
  isWeeklyEvent: true,
  getCurrentEvent,
  isEventActive,

  async execute(client) {
    if (!config.weeklyEventChannelId && !config.welcomeChannelId) return;

    async function startWeeklyEvent() {
      currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      eventEndTime = Date.now() + 7 * 24 * 3600_000;

      const chId = config.weeklyEventChannelId || config.welcomeChannelId;
      for (const [, guild] of client.guilds.cache) {
        const ch = guild.channels.cache.get(chId);
        if (!ch) continue;
        ch.send({ content: '@everyone',
          embeds: [new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`${currentEvent.emoji} SỰ KIỆN TUẦN — ${currentEvent.name}`)
            .setDescription(`🎉 **${currentEvent.desc}**\n\nSự kiện kéo dài **7 ngày**!\nTận dụng ngay để kiếm thật nhiều phần thưởng! 🚀`)
            .addFields(
              { name: '⏰ Bắt đầu',  value: `<t:${Math.floor(Date.now()/1000)}:F>`,     inline: true },
              { name: '⏰ Kết thúc', value: `<t:${Math.floor(eventEndTime/1000)}:F>`,   inline: true },
              { name: '🎯 Hiệu ứng', value: currentEvent.desc,                           inline: false }
            )
            .setFooter({ text: `${config.footer} • Sự kiện tự động mỗi tuần` })
            .setTimestamp()] }).catch(()=>{});
      }
      console.log(`[WeeklyEvent] 🎉 Sự kiện mới: ${currentEvent.name}`);
      // Auto gift rain
      if (currentEvent.type === 'gift_rain') startGiftRain(client);
    }

    function startGiftRain(client) {
      const interval = setInterval(async () => { try {
        if (!isEventActive() || currentEvent.type !== 'gift_rain') { clearInterval(interval); return; }
        const db = require('../database');
        const chId = config.weeklyEventChannelId || config.welcomeChannelId;
        for (const [, guild] of client.guilds.cache) {
          const ch = guild.channels.cache.get(chId);
          if (!ch) continue;
          // Tặng tất cả member đang online
          const members = guild.members.cache.filter(m => !m.user.bot && m.presence?.status !== 'offline');
          const gift    = Math.floor(Math.random()*400+100);
          members.forEach(m => {
            const u = db.getUser(m.id);
            u.money = (u.money||0) + gift;
            u.totalEarned = (u.totalEarned||0) + gift;
            db.saveUser(m.id, u);
          });
          if (members.size > 0) {
            ch.send({ embeds: [new EmbedBuilder().setColor(0xFFD700)
              .setTitle('🎁 Mưa quà!')
              .setDescription(`Bot vừa tặng **+${formatNumber(gift)} 🪙** cho **${members.size}** người đang online!`)
              .setFooter({ text: `${config.footer} • Mưa quà mỗi giờ` })] }).catch(()=>{});
          }
        }
    } catch(e) { console.error('[WeeklyEvent] interval error:', e.message); }
      }, 3600_000);
    }

    // Bắt đầu ngay + schedule mỗi tuần
    await startWeeklyEvent();
    setInterval(startWeeklyEvent, 7 * 24 * 3600_000);
    console.log('[WeeklyEvent] ✓ Đã khởi động');
  }
};

function formatNumber(n) { return Number(n).toLocaleString('vi-VN'); }
